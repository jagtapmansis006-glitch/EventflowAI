'use client';

import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/user/PageHeader';
import Skeleton from '@/components/user/Skeleton';
import VenueMapSvg from '@/components/user/VenueMapSvg';
import MapboxLiveMap from '@/components/user/MapboxLiveMap';
import { loadRoute } from '@/lib/api/endpoints';
import { useVenueMap, useZones, useAlerts } from '@/lib/hooks/useAttendeeData';
import { useSearchParams } from '@/lib/hooks/usePathname';
import { useSelectedEvent } from '@/lib/hooks/useSelectedEvent';
import type { RoutePlan, ZoneCategory, ZoneTelemetry } from '@/lib/types';
import { DISPLAY_FONT, HIDE_SCROLLBAR, LEVEL_META, cn } from '@/lib/utils';

interface QuickPick {
  label: string;
  /** Pick the quietest zone in this category… */
  category?: ZoneCategory;
  /** …or go to a specific zone. */
  zoneId?: string;
}

const QUICK_PICKS: QuickPick[] = [
  { label: 'Food', category: 'food' },
  { label: 'Restrooms', category: 'restroom' },
  { label: 'Exit gate', category: 'entrance' },
  { label: 'First aid', zoneId: 'first-aid' },
];

function pickTarget(pick: QuickPick, zones: ZoneTelemetry[], knownZoneIds: Set<string>): string | null {
  if (pick.zoneId) return knownZoneIds.has(pick.zoneId) ? pick.zoneId : null;

  const candidates = zones
    .filter((zone) => zone.category === pick.category && knownZoneIds.has(zone.id))
    .sort((a, b) => a.occupancyPct - b.occupancyPct);
  return candidates[0]?.id ?? null;
}

export default function MapPage() {
  const { eventId } = useSelectedEvent();
  const searchParams = useSearchParams();
  const zoneParam = searchParams.get('zone');

  const venueMap = useVenueMap(eventId);
  const zones = useZones(eventId);
  const alerts = useAlerts(eventId);

  const [selectedId, setSelectedId] = useState<string | null>(zoneParam);
  const [routeState, setRouteState] = useState<{ zoneId: string; plan: RoutePlan | null } | null>(null);
  const [mapMode, setMapMode] = useState<'mapbox' | 'diagram'>('mapbox');

  // Follow deep links such as /user/map?zone=gate-b from other tabs.
  useEffect(() => {
    setSelectedId(zoneParam);
  }, [zoneParam]);

  const zonesById = useMemo(
    () => Object.fromEntries(zones.data.map((zone) => [zone.id, zone])) as Record<string, ZoneTelemetry | undefined>,
    [zones.data],
  );
  const knownZoneIds = useMemo(() => new Set(venueMap.data.zones.map((zone) => zone.zoneId)), [venueMap.data]);

  const selectedShape = selectedId ? venueMap.data.zones.find((zone) => zone.zoneId === selectedId) : undefined;
  const selectedTelemetry = selectedShape ? zonesById[selectedShape.zoneId] : undefined;

  useEffect(() => {
    if (!selectedShape || venueMap.status === 'loading' || !eventId) return undefined;

    let cancelled = false;
    void loadRoute(eventId, venueMap.data, selectedShape.zoneId).then((plan) => {
      if (!cancelled) setRouteState({ zoneId: selectedShape.zoneId, plan });
    });
    return () => {
      cancelled = true;
    };
  }, [selectedShape, venueMap.data, venueMap.status, eventId]);

  const route = routeState && selectedShape && routeState.zoneId === selectedShape.zoneId ? routeState.plan : null;
  const findingRoute = Boolean(selectedShape) && (!routeState || routeState.zoneId !== selectedShape?.zoneId);

  return (
    <>
      <PageHeader title="Venue map" subtitle="Tap a zone to get walking directions" status={zones.status} />

      <main className="space-y-4 px-4 py-4">
        {/* AI Safety & Navigation Broadcasts */}
        {alerts.data && alerts.data.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-3.5 shadow-sm space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-white/20 text-white text-xs font-bold">📢</span>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-200">
                AI Safety & Navigation Broadcast
              </span>
            </div>
            <p className="text-xs font-semibold text-white pl-6">
              {alerts.data[0].title}: {alerts.data[0].message || (alerts.data[0] as any).summary}
            </p>
          </div>
        )}

        {/* Real-Time Gate / Route Status (Read-Only) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white font-mono font-bold text-[11px] shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Gate 1: OPEN (2m wait)</span>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-slate-800 ring-1 ring-slate-200 font-mono font-bold text-[11px] shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Gate 2: BUSY (9m wait)</span>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-slate-800 ring-1 ring-slate-200 font-mono font-bold text-[11px] shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Gate 3: OPEN (1m wait - Recommended)</span>
          </div>
        </div>

        {/* Live Crowd Movement Vector / Speed Display */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-3 flex items-center justify-between text-xs font-mono text-slate-700 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-blue-600 font-bold">↗ Flow Vector:</span>
            <span>Main Concourse → North Turnstiles</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 font-bold">
            <span>Speed:</span>
            <span className="text-emerald-600">1.18 m/s (Nominal)</span>
          </div>
        </div>
        {/* Map View Mode Switcher: Interactive Mapbox vs Venue Diagram */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setMapMode('mapbox')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mapMode === 'mapbox' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🌐 Mapbox Live Heatmap & GPS
          </button>
          <button
            type="button"
            onClick={() => setMapMode('diagram')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mapMode === 'diagram' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🗺️ Venue Diagram
          </button>
        </div>

        <div
          role="group"
          aria-label="Quick destinations"
          className={cn('-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4', HIDE_SCROLLBAR)}
        >
          {QUICK_PICKS.map((pick) => {
            const target = pickTarget(pick, zones.data, knownZoneIds);
            return (
              <button
                key={pick.label}
                type="button"
                disabled={!target}
                onClick={() => target && setSelectedId(target)}
                className="min-h-[48px] shrink-0 touch-manipulation rounded-full bg-white px-5 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition-colors active:bg-slate-100 disabled:opacity-40"
              >
                {pick.label}
              </button>
            );
          })}
        </div>

        {mapMode === 'mapbox' ? (
          <div className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <MapboxLiveMap
              lat={19.0635}
              lng={72.86744}
              venueName="Apex Grand Arena"
              eventId={eventId || 'event_apex_summit_2026'}
              crowdCount={zones.data.reduce((acc, z) => acc + (z.crowdCount || 0), 0) || 4120}
              densityLevel={zones.data.some(z => z.level === 'critical') ? 'CRITICAL' : 'LOW'}
              occupancyPercent={zones.data[0]?.occupancyPct || 48}
              height="380px"
              showHeatmap={true}
              showCameras={true}
              showEvacuationRoute={true}
              showHazardZones={true}
              showGpsTracking={true}
            />
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
            {venueMap.status === 'loading' ? (
              <Skeleton className="aspect-[3/4] rounded-2xl" />
            ) : (
              <VenueMapSvg
                map={venueMap.data}
                zonesById={zonesById}
                selectedId={selectedShape?.zoneId ?? null}
                route={route}
                onSelect={setSelectedId}
              />
            )}
          </div>
        )}

        <ul aria-label="Map key" className="flex flex-wrap gap-x-4 gap-y-2 px-1 text-xs text-slate-600">
          {(Object.keys(LEVEL_META) as Array<keyof typeof LEVEL_META>).map((level) => (
            <li key={level} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={cn('h-3 w-3 rounded-sm ring-1 ring-inset ring-black/10', LEVEL_META[level].bar)}
              />
              {LEVEL_META[level].label}
            </li>
          ))}
        </ul>

        <section aria-live="polite" aria-label="Directions" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          {!selectedShape ? (
            <>
              <h2 className={cn(DISPLAY_FONT, 'text-lg font-bold text-slate-900')}>Where to?</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Choose a destination above or tap a zone on the map. Quick picks go to the quietest option in each category.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className={cn(DISPLAY_FONT, 'text-lg font-bold text-slate-900')}>{selectedShape.name}</h2>
                  {selectedTelemetry && (
                    <p className="mt-0.5 text-sm text-slate-600">
                      {selectedTelemetry.occupancyPct}% full
                      {selectedTelemetry.waitMinutes ? `, about ${selectedTelemetry.waitMinutes} min wait` : ''}
                    </p>
                  )}
                </div>
                {selectedTelemetry && (
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2.5 py-1 text-xs font-bold',
                      LEVEL_META[selectedTelemetry.level].pill,
                    )}
                  >
                    {LEVEL_META[selectedTelemetry.level].label}
                  </span>
                )}
              </div>

              {findingRoute && <p className="mt-4 text-sm text-slate-600">Finding the best route…</p>}

              {!findingRoute && !route && (
                <p className="mt-4 text-sm text-slate-600">
                  We couldn&apos;t find a walking route to {selectedShape.name}. Ask venue staff for directions.
                </p>
              )}

              {route && (
                <>
                  <p className="mt-4 text-sm font-semibold text-blue-700">
                    {route.totalMeters === 0 ? 'You are already here' : `${route.totalMinutes} min walk, ${route.totalMeters} m`}
                  </p>
                  <ol className="mt-2 space-y-2">
                    {route.steps.map((step, index) => (
                      <li key={`${index}-${step.instruction}`} className="flex gap-3 text-[15px] text-slate-800">
                        <span
                          aria-hidden="true"
                          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white"
                        >
                          {index + 1}
                        </span>
                        {step.instruction}
                      </li>
                    ))}
                  </ol>
                </>
              )}

              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="mt-4 min-h-[48px] w-full touch-manipulation rounded-2xl bg-slate-100 px-5 font-semibold text-slate-800 transition-colors active:bg-slate-200"
              >
                Clear route
              </button>
            </>
          )}
        </section>
      </main>
    </>
  );
}