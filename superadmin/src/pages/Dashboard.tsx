import React, { useEffect, useState } from 'react';
import {
  CalendarDays,
  Radio,
  Clock,
  CheckCircle2,
  Users,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  Activity,
  Zap,
  Gauge
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import { SuperAdminDashboardMetrics, EventSummary } from '../types';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { MapboxLiveMap } from '../components/MapboxLiveMap';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';

interface DashboardProps {
  onSelectEvent: (eventId: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectEvent, onNavigateTab }) => {
  const [metrics, setMetrics] = useState<SuperAdminDashboardMetrics | null>(null);
  const [eventSummaries, setEventSummaries] = useState<EventSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const res = await analyticsService.getSuperAdminDashboard();
      setMetrics(res.metrics);
      setEventSummaries(res.eventSummaries);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center text-slate-500">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 animate-spin text-blue-600" />
          <span className="font-semibold text-slate-700">Synchronizing global event telemetry...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-medium">
          {error}
        </div>
      </div>
    );
  }

  const m = metrics || {
    totalEvents: 0,
    liveEvents: 0,
    upcomingEvents: 0,
    completedEvents: 0,
    totalEventAdmins: 0,
    totalSuperAdmins: 0,
    activeCriticalAlerts: 0,
    activeIncidents: 0,
    maxSuperAdmins: 5,
    maxEventAdmins: 40
  };

  const statusDistribution = [
    { name: 'LIVE', count: m.liveEvents, color: '#10b981' },
    { name: 'UPCOMING', count: m.upcomingEvents, color: '#f59e0b' },
    { name: 'COMPLETED', count: m.completedEvents, color: '#94a3b8' }
  ];

  return (
    <div id="super-admin-dashboard" className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Global Command Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Multi-event telemetry aggregation, active crowd pressure & facility monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('telemetry')}
            className="px-3.5 py-1.5 text-xs bg-white hover:bg-slate-50 text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg font-semibold transition-all shadow-xs"
          >
            Live Inflow/Outflow Monitor
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard
          id="metric-total-events"
          title="Total Events"
          value={m.totalEvents}
          subtext="Under management"
          icon={CalendarDays}
          badgeType="blue"
        />
        <StatCard
          id="metric-live-events"
          title="Live Events"
          value={m.liveEvents}
          subtext="Telemetry active"
          icon={Radio}
          badge="STREAMING"
          badgeType="emerald"
        />
        <StatCard
          id="metric-upcoming-events"
          title="Upcoming"
          value={m.upcomingEvents}
          subtext="Scheduled"
          icon={Clock}
          badgeType="amber"
        />
        <StatCard
          id="metric-completed-events"
          title="Completed"
          value={m.completedEvents}
          subtext="Archived logs"
          icon={CheckCircle2}
          badgeType="slate"
        />
        <StatCard
          id="metric-event-admins"
          title="Event Admins"
          value={`${m.totalEventAdmins} / ${m.maxEventAdmins}`}
          subtext="Account capacity"
          icon={Users}
          badgeType="blue"
        />
        <StatCard
          id="metric-critical-alerts"
          title="Critical Alerts"
          value={m.activeCriticalAlerts}
          subtext="Requiring dispatch"
          icon={Flame}
          badgeType={m.activeCriticalAlerts > 0 ? 'rose' : 'slate'}
        />
        <StatCard
          id="metric-active-incidents"
          title="Active Incidents"
          value={m.activeIncidents}
          subtext="Open incident cases"
          icon={AlertTriangle}
          badgeType={m.activeIncidents > 0 ? 'amber' : 'slate'}
        />
      </div>

      {/* Visual Telemetry Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Events Distribution Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Event Lifecycle Distribution</h3>
            <span className="text-[11px] text-slate-500 font-mono">Real-time</span>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusDistribution} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#475569" fontSize={11} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Multi-Event Live Flow Status */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Active Crowd Pressure & Net Velocity</h3>
            <span className="text-[11px] text-emerald-700 font-mono font-semibold">30-second sliding windows</span>
          </div>
          <div className="space-y-2.5">
            {eventSummaries.map(evt => (
              <div
                key={evt.id}
                className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between hover:border-blue-300 hover:bg-blue-50/20 transition-all shadow-xs"
              >
                <div className="min-w-0 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 truncate">{evt.name}</span>
                    <StatusBadge status={evt.status} type="event" />
                    {evt.autonomousMode && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                        <Zap className="w-2.5 h-2.5 text-purple-600 fill-current" />
                        AI AUTO
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {evt.venueName} • {evt.city} • {evt.gatesCount} gates configured
                  </div>
                </div>

                <div className="flex items-center gap-5 shrink-0 font-mono text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-sans font-semibold">CROWD</span>
                    <span className="font-bold text-slate-900">{evt.currentPeopleCount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-sans font-semibold">FLOW</span>
                    <span className={evt.netFlow > 0 ? 'text-emerald-700 font-bold' : 'text-slate-700 font-bold'}>
                      {evt.netFlow > 0 ? `+${evt.netFlow}` : evt.netFlow}/30s
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-sans font-semibold">SPEED</span>
                    <span className="font-bold text-blue-700">
                      {evt.avgSpeedMps !== undefined ? `${evt.avgSpeedMps.toFixed(2)} m/s` : '1.10 m/s'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-sans font-semibold">DENSITY</span>
                    <StatusBadge status={evt.crowdDensityLevel} type="density" />
                  </div>
                  <button
                    onClick={() => onSelectEvent(evt.id)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Mapbox Geospatial Digital Twin & Tactical Radar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-blue-50 text-blue-600 text-xs font-bold font-mono">MAPBOX GL</span>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                Global Geospatial Digital Twin & Multi-Camera Telemetry
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time Mapbox dark canvas visualizing camera node coordinates, live SSE heatmaps, and active egress corridors.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>3 Active Feeds Streamed</span>
          </div>
        </div>

        <MapboxLiveMap
          lat={19.0635}
          lng={72.86744}
          venueName="Apex Grand Arena • Command Center Matrix"
          eventId="event_apex_summit_2026"
          crowdCount={((m.activeEventsCount ?? m.liveEvents) > 0) ? 4250 : 0}
          densityLevel="MODERATE"
          occupancyPercent={52}
          height="400px"
          showHeatmap={true}
          showCameras={true}
          showEvacuationRoute={true}
          showHazardZones={true}
          showGpsTracking={true}
        />
      </div>

      {/* Multi-Event Detailed Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            All Monitored Events ({eventSummaries.length})
          </h2>
          <span className="text-xs text-slate-500 font-medium">Click any event to inspect zones, cameras, and ML forecasts</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eventSummaries.map(evt => (
            <div
              key={evt.id}
              id={`event-card-${evt.id}`}
              onClick={() => onSelectEvent(evt.id)}
              className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-5 cursor-pointer transition-all duration-150 shadow-xs hover:shadow-md flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {evt.eventType}
                    </span>
                    {evt.autonomousMode && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5 fill-current text-purple-600" />
                        AUTO
                      </span>
                    )}
                  </div>
                  <StatusBadge status={evt.status} type="event" />
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-1">
                  {evt.name}
                </h3>
                <p className="text-xs text-slate-500 mb-3 font-medium">{evt.venueName}, {evt.city}</p>

                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono mb-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans font-semibold block">DENSITY LEVEL</span>
                    <StatusBadge status={evt.crowdDensityLevel} type="density" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans font-semibold block">EST. POPULATION</span>
                    <span className="text-slate-900 font-bold">{evt.currentPeopleCount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans font-semibold block">FLOW & VELOCITY</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Gauge className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-slate-900 font-bold">
                        {evt.avgSpeedMps !== undefined ? `${evt.avgSpeedMps.toFixed(2)} m/s` : '1.10 m/s'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans font-semibold block">ACTIVE ALERTS</span>
                    <span className={evt.activeAlertsCount > 0 ? 'text-amber-800 font-bold' : 'text-slate-600'}>
                      {evt.activeAlertsCount} ({evt.criticalAlertsCount} crit)
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="text-[11px] font-medium truncate">
                  {new Date(evt.startDateTime).toLocaleDateString()}
                </span>
                <span className="text-blue-600 flex items-center gap-1 font-bold text-[11px] group-hover:translate-x-0.5 transition-transform">
                  <span>Open Console</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};