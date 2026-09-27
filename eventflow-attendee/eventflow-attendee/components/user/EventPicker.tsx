'use client';

import React, { useState } from 'react';
import { useEventsList } from '@/lib/hooks/useAttendeeData';
import { useSelectedEvent } from '@/lib/hooks/useSelectedEvent';
import Skeleton from './Skeleton';
import { Navigation, Sparkles, MapPin, Radio, Calendar, ArrowRight } from 'lucide-react';
import { navigate } from '@/lib/hooks/usePathname';

const STATUS_STYLES: Record<string, string> = {
  LIVE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20',
  UPCOMING: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  COMPLETED: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
  CANCELLED: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

function formatStart(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Live Events List Landing Screen
 * Lists all active & upcoming events with "Enable Real-Time GPS & Enter Event" button.
 */
export default function EventPicker() {
  const events = useEventsList();
  const { selectEvent } = useSelectedEvent();
  const [requestingGps, setRequestingGps] = useState<string | null>(null);

  const handleEnterEventWithGps = (eventId: string) => {
    setRequestingGps(eventId);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          try {
            sessionStorage.setItem('attendee_gps_lat', String(pos.coords.latitude));
            sessionStorage.setItem('attendee_gps_lng', String(pos.coords.longitude));
            sessionStorage.setItem('attendee_gps_enabled', 'true');
          } catch (_) {}
          setRequestingGps(null);
          selectEvent(eventId);
          navigate('/user/map');
        },
        (_err) => {
          // Fallback if user denies or timeout: enter event anyway
          setRequestingGps(null);
          selectEvent(eventId);
          navigate('/user/map');
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      setRequestingGps(null);
      selectEvent(eventId);
      navigate('/user/map');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-5 pb-16 pt-10 text-slate-100 flex flex-col items-center">
      <div className="w-full max-w-md">
        {/* Header Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-3">
          <Radio className="w-3.5 h-3.5 animate-pulse text-blue-400" />
          <span>Live Venue Geospatial Network</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <span>EventFlow</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">AI</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400 leading-relaxed">
          Select an active event to access real-time crowd heatmaps, dynamic routing, and instant safety alerts.
        </p>

        {/* Live Events List */}
        <div className="mt-7 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Available Live Events</span>
            <span className="text-cyan-400">{events.data.length} Online</span>
          </div>

          {events.status === 'loading' &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-3xl bg-slate-800/60" />
            ))}

          {events.status !== 'loading' && events.data.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
              <MapPin className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
              No events are published right now. Check back closer to the start time.
            </div>
          )}

          {events.data.map((event) => {
            const isLive = event.status === 'LIVE';
            const isProcessing = requestingGps === event.id;

            return (
              <div
                key={event.id}
                className="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl transition-all hover:border-blue-500/50 hover:bg-slate-900"
              >
                {/* Background glow on live event */}
                {isLive && (
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {event.name}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">
                        {event.venueName}
                        {event.city ? `, ${event.city}` : ''}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold tracking-wide ${
                      STATUS_STYLES[event.status] ?? STATUS_STYLES.UPCOMING
                    }`}
                  >
                    {isLive ? '● LIVE NOW' : event.status}
                  </span>
                </div>

                {event.startDateTime && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>{formatStart(event.startDateTime)}</span>
                  </div>
                )}

                {/* Primary Action Button: Enable Real-Time GPS & Enter Event */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleEnterEventWithGps(event.id)}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Navigation className={`w-4 h-4 ${isProcessing ? 'animate-spin' : 'animate-pulse text-cyan-200'}`} />
                    <span>
                      {isProcessing ? 'Acquiring GPS & Entering...' : 'Enable Real-Time GPS & Enter Event'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {events.status === 'demo' && (
          <p className="mt-6 text-center text-xs text-slate-500">
            Showing demo events — simulated venue telemetry active.
          </p>
        )}
      </div>
    </div>
  );
}