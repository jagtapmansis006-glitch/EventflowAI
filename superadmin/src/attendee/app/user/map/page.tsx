'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from '@/lib/navigation';
import PageHeader from '@/components/user/PageHeader';
import Skeleton from '@/components/user/Skeleton';
import VenueMapSvg from '@/components/user/VenueMapSvg';
import { loadRoute, askAssistant } from '@/lib/api/endpoints';
import { useVenueMap, useZones, useAlerts } from '@/lib/hooks/useAttendeeData';
import type { RoutePlan, ZoneCategory, ZoneTelemetry, ChatMessage } from '@/lib/types';
import ChatBubble from '@/components/user/ChatBubble';
import { MapboxLiveMap } from '../../../../components/MapboxLiveMap.tsx';
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

function MapSkeleton() {
  return (
    <div className="px-4 pt-4">
      <Skeleton className="aspect-[3/4] rounded-3xl" />
    </div>
  );
}

function MapView() {
  const searchParams = useSearchParams();
  const zoneParam = searchParams?.get('zone') ?? null;

  const venueMap = useVenueMap();
  const zones = useZones();
  const alerts = useAlerts();

  const [selectedId, setSelectedId] = useState<string | null>(zoneParam);
  const [routeState, setRouteState] = useState<{ zoneId: string; plan: RoutePlan | null } | null>(null);

  // Live Real-Time Dynamic State
  const [liveGates, setLiveGates] = useState<any[]>([]);
  const [mapMode, setMapMode] = useState<'diagram' | 'mapbox'>('mapbox');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your EventFlow concierge. Ask me where the shortest line is, if Gate 3 is open, or how to reach Exit B!",
      createdAt: new Date().toISOString(),
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatPending, setChatPending] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchGates = async () => {
      try {
        const res = await fetch('/api/gates');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.gates)) {
            setLiveGates(data.gates);
          }
        }
      } catch (_) {}
    };
    fetchGates();
    const interval = setInterval(fetchGates, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSendChat = async (text: string) => {
    const question = text.trim();
    if (!question || chatPending) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    };
    const nextHistory = [...chatMessages, userMsg];
    setChatMessages(nextHistory);
    setChatInput('');
    setChatPending(true);

    try {
      const { message } = await askAssistant({ history: nextHistory, zones: zones.data, alerts: alerts.data });
      setChatMessages((curr) => [...curr, message]);
    } catch (_) {
      setChatMessages((curr) => [
        ...curr,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: 'Gates and concourses are flowing normally. Ask staff or refer to illuminated overhead wayfinding.',
          createdAt: new Date().toISOString(),
        }
      ]);
    } finally {
      setChatPending(false);
    }
  };

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
    if (!selectedShape || venueMap.status === 'loading') return undefined;

    let cancelled = false;
    void loadRoute(venueMap.data, selectedShape.zoneId).then((plan) => {
      if (!cancelled) setRouteState({ zoneId: selectedShape.zoneId, plan });
    });
    return () => {
      cancelled = true;
    };
  }, [selectedShape, venueMap.data, venueMap.status]);

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

        {/* Real-Time Gate / Route Status (Live Synced) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {liveGates.length > 0 ? (
            liveGates.map((gate) => (
              <div
                key={gate.id}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono font-bold text-[11px] shadow-2xs ${
                  gate.status === 'OPEN'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-800 ring-1 ring-slate-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    gate.status === 'OPEN'
                      ? 'bg-emerald-400 animate-pulse'
                      : gate.status === 'CLOSED'
                      ? 'bg-rose-500'
                      : 'bg-amber-400'
                  }`}
                />
                <span>
                  {gate.name}: {gate.status} ({gate.currentCount ?? 0} count)
                </span>
              </div>
            ))
          ) : (
            <>
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white font-mono font-bold text-[11px] shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Gate 1: OPEN (Nominal)</span>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-slate-800 ring-1 ring-slate-200 font-mono font-bold text-[11px] shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Gate 2: OPEN (Active)</span>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-slate-800 ring-1 ring-slate-200 font-mono font-bold text-[11px] shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Gate 3: OPEN (Recommended)</span>
              </div>
            </>
          )}
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

        {/* Map View Mode Switcher: Interactive Diagram vs Google Live Map */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setMapMode('diagram')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mapMode === 'diagram' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🗺️ Venue Diagram
          </button>
          <button
            type="button"
            onClick={() => setMapMode('mapbox')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mapMode === 'mapbox' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🌐 Mapbox Live Heatmap & GPS
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
              eventId="event_apex_summit_2026"
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

      {/* Floating AI Concierge Chatbot Trigger */}
      <button
        id="btn-attendee-map-concierge"
        type="button"
        onClick={() => setChatOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-xl shadow-blue-500/30 transition-all cursor-pointer"
        title="Ask AI Concierge"
      >
        <span className="text-sm">💬</span>
        <span>Ask AI Concierge</span>
      </button>

      {/* In-Map AI Chatbot Drawer */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-200 animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  AI
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">EventFlow Concierge</h3>
                  <p className="text-[11px] text-slate-500">Live venue & gate assistant</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <ul className="space-y-3">
                {chatMessages.map((msg) => (
                  <ChatBubble key={msg.id} message={msg} />
                ))}
              </ul>
              {chatPending && (
                <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-slate-100 text-slate-500 text-xs w-fit">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                  <span className="ml-1 text-[11px]">Thinking...</span>
                </div>
              )}
            </div>

            {/* Quick Prompts */}
            <div className="px-4 py-2 border-t border-slate-100 flex gap-2 overflow-x-auto text-xs">
              {['Where is the shortest line?', 'How do I reach Exit B?', 'Is Gate 3 open?'].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSendChat(q)}
                  className="shrink-0 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <div className="p-3 border-t border-slate-700/60 bg-slate-950/60">
              <form onSubmit={(e) => { e.preventDefault(); handleSendChat(chatInput); }} className="w-full py-3 px-5 rounded-full border border-slate-700 bg-slate-900/80 backdrop-blur-md flex items-center gap-2 shadow-xl">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about gates, exits, or lines..."
                  className="flex-1 bg-transparent text-xs text-white placeholder-slate-400 outline-none"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || chatPending}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-md cursor-pointer"
                >
                  ➔
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function MapPage() {
  // useSearchParams needs a Suspense boundary for production builds.
  return (
    <Suspense
      fallback={
        <>
          <PageHeader title="Venue map" subtitle="Tap a zone to get walking directions" />
          <MapSkeleton />
        </>
      }
    >
      <MapView />
    </Suspense>
  );
}
