import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Calendar,
  AlertTriangle,
  Camera,
  Layers,
  PieChart as PieChartIcon
} from 'lucide-react';
import { analyticsService } from '../services/analyticsService';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

export const GlobalAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    analyticsService.getSuperAdminDashboard().then(res => {
      setData(res);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
        <Activity className="w-5 h-5 animate-spin text-blue-600" />
        <span className="font-medium text-xs">Aggregating cross-event analytics...</span>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalEvents: 3,
    liveEvents: 1,
    upcomingEvents: 1,
    completedEvents: 1,
    activeCriticalAlerts: 1,
    activeIncidents: 1
  };

  const eventsByStatus = [
    { name: 'LIVE', count: metrics.liveEvents, color: '#10b981' },
    { name: 'UPCOMING', count: metrics.upcomingEvents, color: '#f59e0b' },
    { name: 'COMPLETED', count: metrics.completedEvents, color: '#94a3b8' }
  ];

  const crowdStatusDistribution = [
    { name: 'LOW', value: 40, color: '#10b981' },
    { name: 'MODERATE', value: 35, color: '#2563eb' },
    { name: 'BUSY', value: 20, color: '#f59e0b' },
    { name: 'CRITICAL', value: 5, color: '#ef4444' }
  ];

  const alertTrends = [
    { time: '12:00', warnings: 2, critical: 0 },
    { time: '13:00', warnings: 3, critical: 1 },
    { time: '14:00', warnings: 5, critical: 0 },
    { time: '15:00', warnings: 8, critical: 2 },
    { time: '16:00', warnings: 4, critical: 0 }
  ];

  const incidentTrends = [
    { time: '12:00', medical: 1, security: 0, facilities: 0 },
    { time: '13:00', medical: 2, security: 1, facilities: 1 },
    { time: '14:00', medical: 1, security: 2, facilities: 0 },
    { time: '15:00', medical: 3, security: 1, facilities: 2 },
    { time: '16:00', medical: 1, security: 0, facilities: 1 }
  ];

  const cameraAvailability = [
    { name: 'Online RTSP Feeds', count: 8, color: '#10b981' },
    { name: 'Degraded Frame Rate', count: 1, color: '#f59e0b' },
    { name: 'Offline / Standby', count: 0, color: '#94a3b8' }
  ];

  return (
    <div id="global-analytics-page" className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <span>Global Operations Analytics</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Holistic trends across event portfolios, crowd pressure distributions, safety incidents, and CV telemetry health
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Chart 1: Events by status */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
            Events by Status
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventsByStatus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px', color: '#0f172a', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {eventsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Crowd Status Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
            Crowd Density Distribution (%)
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={crowdStatusDistribution}
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {crowdStatusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px', color: '#0f172a', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-[11px] font-mono font-semibold mt-2">
            {crowdStatusDistribution.map(item => (
              <span key={item.name} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600">{item.name}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Chart 3: Camera Availability */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
            Camera & CV Sensor Availability
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cameraAvailability} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                <YAxis dataKey="name" type="category" stroke="#475569" fontSize={10} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px', color: '#0f172a', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {cameraAvailability.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Alert Trends */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 lg:col-span-2 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
            Alert Activity Trends (Today)
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={alertTrends} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px', color: '#0f172a', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                />
                <Line type="monotone" dataKey="warnings" stroke="#f59e0b" strokeWidth={2} name="Warnings" dot={{ fill: '#f59e0b', r: 3 }} />
                <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={2} name="Critical" dot={{ fill: '#ef4444', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Incident Trends */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
            Incident Dispatch by Category
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incidentTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '11px', color: '#0f172a', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="medical" fill="#2563eb" stackId="a" name="Medical" />
                <Bar dataKey="security" fill="#ef4444" stackId="a" name="Security" />
                <Bar dataKey="facilities" fill="#8b5cf6" stackId="a" name="Facilities" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
