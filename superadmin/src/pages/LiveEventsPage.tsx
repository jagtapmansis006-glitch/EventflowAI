import React, { useState, useEffect } from 'react';
import {
  Radio,
  Activity,
  DoorOpen,
  Camera,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Zap,
  Users
} from 'lucide-react';
import { eventService } from '../services/eventService';
import { Event, EventDashboardData } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { StatCard } from '../components/StatCard';

interface LiveEventsPageProps {
  onSelectEvent: (eventId: string) => void;
}

export const LiveEventsPage: React.FC<LiveEventsPageProps> = ({ onSelectEvent }) => {
  const [liveEvents, setLiveEvents] = useState<Event[]>([]);
  const [eventDashboards, setEventDashboards] = useState<Record<string, EventDashboardData>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchLiveEvents = async () => {
    try {
      const all = await eventService.getAllEvents();
      const live = all.filter(e => e.status === 'LIVE');
      setLiveEvents(live);

      // Fetch dashboard details for each live event
      const dashboards: Record<string, EventDashboardData> = {};
      for (const e of live) {
        try {
          const d = await eventService.getEventDashboard(e.id);
          dashboards[e.id] = d;
        } catch (_) {}
      }
      setEventDashboards(dashboards);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveEvents();
    const interval = setInterval(fetchLiveEvents, 10000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
        <Activity className="w-5 h-5 animate-spin text-blue-600" />
        <span className="font-medium text-sm">Polling live event telemetry channels...</span>
      </div>
    );
  }

  return (
    <div id="live-events-page" className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Live Mission Control</h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              {liveEvents.length} ACTIVE STREAM{liveEvents.length === 1 ? '' : 'S'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Real-time ingress/egress velocities, gate pressure, and active sensor diagnostics
          </p>
        </div>

        <button
          onClick={fetchLiveEvents}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Sync Feeds</span>
        </button>
      </div>

      {liveEvents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-xs">
          <Radio className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No events currently LIVE</h3>
          <p className="text-xs text-slate-500 mt-1">
            Change an upcoming event status to LIVE in the Events tab to start real-time telemetry streaming.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {liveEvents.map(event => {
            const d = eventDashboards[event.id];
            const crowd = d?.currentCrowdStatus;
            const cameras = d?.cameraStatuses || [];
            const gates = d?.gateStatuses || [];
            const criticalAlerts = d?.criticalAlerts || [];

            return (
              <div
                key={event.id}
                id={`live-event-block-${event.id}`}
                className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6"
              >
                {/* Event header line */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <h2 className="text-lg font-bold text-slate-900">{event.name}</h2>
                      <StatusBadge status="LIVE" type="event" />
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      {event.venueName} • {event.city} • Telemetry Window: 30s
                    </p>
                  </div>

                  <button
                    onClick={() => onSelectEvent(event.id)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer self-start md:self-auto"
                  >
                    <span>Inspect Event Console</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Primary Real-time telemetry metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Monitored Population
                    </span>
                    <div className="text-2xl font-bold text-slate-900 font-mono">
                      {crowd ? crowd.currentPeopleCount.toLocaleString() : '—'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 font-medium">
                      Density: <StatusBadge status={crowd?.densityLevel || 'LOW'} type="density" size="sm" />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      30-Second Net Flow
                    </span>
                    <div className={`text-2xl font-bold font-mono ${
                      (crowd?.netFlow || 0) > 0 ? 'text-emerald-600' : 'text-slate-900'
                    }`}>
                      {crowd ? `${crowd.netFlow > 0 ? '+' : ''}${crowd.netFlow}/30s` : '—'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-1 font-medium">
                      In: +{crowd?.currentInflow || 0} | Out: -{crowd?.currentOutflow || 0}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Active Sensor Feeds
                    </span>
                    <div className="text-2xl font-bold text-slate-900 font-mono">
                      {cameras.filter(c => c.status === 'ONLINE').length} / {cameras.length}
                    </div>
                    <div className="text-[11px] text-emerald-700 font-mono mt-1 font-bold">
                      Line crossings operational
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Critical Alerts
                    </span>
                    <div className={`text-2xl font-bold font-mono ${
                      criticalAlerts.length > 0 ? 'text-rose-600' : 'text-slate-900'
                    }`}>
                      {criticalAlerts.length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 font-medium">
                      {criticalAlerts.length > 0 ? 'Urgent triage required' : 'Nominal operations'}
                    </div>
                  </div>
                </div>

                {/* Gate Load Progress Bars */}
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Ingress Gate Load Distribution
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {gates.map(g => {
                      const pct = Math.min(100, Math.round((g.currentCount / g.capacity) * 100));
                      return (
                        <div key={g.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900">{g.name}</span>
                            <StatusBadge status={g.status} type="gate" size="sm" />
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                pct > 85 ? 'bg-rose-500' : pct > 65 ? 'bg-amber-500' : 'bg-blue-600'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] font-mono text-slate-500 font-medium">
                            <span>Throughput: {g.currentCount}</span>
                            <span>Cap: {g.capacity} ({pct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Critical Alerts Banner inside card if any exist */}
                {criticalAlerts.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-1 shadow-2xs">
                    <div className="flex items-center gap-2 text-rose-800 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Active Critical Ingress Alerts</span>
                    </div>
                    {criticalAlerts.map(a => (
                      <div key={a.id} className="text-xs text-rose-700 font-mono pl-6 font-medium">
                        • {a.title}: {a.publicMessage}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
