'use client';

import { useMemo, useState } from 'react';
import { navigate } from '@/lib/navigation';
import DataStatusBadge from '@/components/user/DataStatusBadge';
import RecommendationCard from '@/components/user/RecommendationCard';
import Skeleton from '@/components/user/Skeleton';
import TicketCard from '@/components/user/TicketCard';
import ZoneRow from '@/components/user/ZoneRow';
import { useRecommendations, useTicket, useZones } from '@/lib/hooks/useAttendeeData';
import type { ZoneTelemetry } from '@/lib/types';
import { DISPLAY_FONT, HIDE_SCROLLBAR, cn } from '@/lib/utils';

type ZoneFilter = 'all' | 'entrance' | 'food' | 'restroom' | 'other';

const ZONE_FILTERS: Array<{ id: ZoneFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'entrance', label: 'Gates' },
  { id: 'food', label: 'Food' },
  { id: 'restroom', label: 'Restrooms' },
  { id: 'other', label: 'Other' },
];

function matchesFilter(zone: ZoneTelemetry, filter: ZoneFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'other') return zone.category === 'stage' || zone.category === 'service';
  return zone.category === filter;
}

export default function HomePage() {
  const ticket = useTicket();
  const zones = useZones();
  const recommendations = useRecommendations();
  const [filter, setFilter] = useState<ZoneFilter>('all');

  const visibleZones = useMemo(
    () => zones.data.filter((zone) => matchesFilter(zone, filter)),
    [zones.data, filter],
  );

  const [gpsLoading, setGpsLoading] = useState(false);

  const handleEnableGpsAndEnter = () => {
    setGpsLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          try {
            sessionStorage.setItem('attendee_gps_lat', String(pos.coords.latitude));
            sessionStorage.setItem('attendee_gps_lng', String(pos.coords.longitude));
            sessionStorage.setItem('attendee_gps_enabled', 'true');
          } catch (_) {}
          setGpsLoading(false);
          navigate('/user/map');
        },
        (_err) => {
          setGpsLoading(false);
          navigate('/user/map');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setGpsLoading(false);
      navigate('/user/map');
    }
  };

  const firstName = ticket.data?.holderName ? ticket.data.holderName.split(' ')[0] : 'Attendee';

  return (
    <>
      <header className="bg-slate-900 px-5 pb-16 pt-[calc(env(safe-area-inset-top)+1rem)] text-white">
        <div className="flex items-center justify-between gap-3">
          <p className={cn(DISPLAY_FONT, 'text-lg font-bold tracking-tight')}>EventFlow-AI</p>
          <DataStatusBadge status={zones.status} />
        </div>

        {ticket.status === 'loading' ? (
          <Skeleton className="mt-6 h-[68px] bg-white/10" />
        ) : (
          <div className="mt-6">
            <p className="text-sm text-slate-300">Welcome, {firstName}</p>
            <h1 className={cn(DISPLAY_FONT, 'mt-1 text-3xl font-extrabold leading-tight')}>
              {ticket.data.eventName}
            </h1>
          </div>
        )}
      </header>

      <main className="-mt-10 space-y-6 px-4 pb-8">
        {/* Real-Time GPS Action Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white shadow-xl shadow-blue-500/20 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Geospatial Mapbox
            </span>
            <span className="text-[11px] font-mono text-blue-100">GPS Engine Active</span>
          </div>
          <div>
            <h3 className="font-bold text-base leading-tight">Interactive Event Navigation</h3>
            <p className="text-xs text-blue-100 mt-0.5">Explore real-time Mapbox crowd heatmaps, cameras, and live turn-by-turn routing.</p>
          </div>
          <button
            type="button"
            onClick={handleEnableGpsAndEnter}
            disabled={gpsLoading}
            className="mt-1 w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white text-blue-900 hover:bg-blue-50 active:scale-[0.98] font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <span>🛰️</span>
            <span>{gpsLoading ? 'Acquiring GPS...' : 'Enable Real-Time GPS & Enter Event'}</span>
            <span>➔</span>
          </button>
        </div>
        <section aria-label="Your ticket">
          {ticket.status === 'loading' ? (
            <Skeleton className="h-[356px] rounded-3xl" />
          ) : (
            <TicketCard ticket={ticket.data} />
          )}
        </section>

        <section aria-labelledby="best-moves-heading">
          <h2 id="best-moves-heading" className={cn(DISPLAY_FONT, 'text-xl font-bold text-slate-900')}>
            Best moves right now
          </h2>

          {recommendations.status === 'loading' ? (
            <Skeleton className="mt-3 h-[136px]" />
          ) : recommendations.data.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">
              No suggestions yet. Quieter routes will appear here as crowds change.
            </p>
          ) : (
            <ul
              className={cn(
                '-mx-4 mt-3 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2',
                HIDE_SCROLLBAR,
              )}
            >
              {recommendations.data.map((recommendation) => (
                <li key={recommendation.id} className="w-[78%] shrink-0 snap-start">
                  <RecommendationCard recommendation={recommendation} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="crowd-heading">
          <h2 id="crowd-heading" className={cn(DISPLAY_FONT, 'text-xl font-bold text-slate-900')}>
            Crowd levels
          </h2>

          <div
            role="group"
            aria-label="Filter zones"
            className={cn('-mx-4 mt-3 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1', HIDE_SCROLLBAR)}
          >
            {ZONE_FILTERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={filter === id}
                onClick={() => setFilter(id)}
                className={cn(
                  'min-h-[48px] shrink-0 touch-manipulation rounded-full px-5 text-sm font-semibold transition-colors',
                  filter === id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 ring-1 ring-slate-200 active:bg-slate-100',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {zones.status === 'loading' ? (
            <div className="mt-3 space-y-3">
              <Skeleton className="h-[88px]" />
              <Skeleton className="h-[88px]" />
              <Skeleton className="h-[88px]" />
            </div>
          ) : visibleZones.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">
              No zones match this filter. Try All to see the whole venue.
            </p>
          ) : (
            <ul className="mt-3 space-y-3" aria-live="polite">
              {visibleZones.map((zone) => (
                <li key={zone.id}>
                  <ZoneRow zone={zone} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
