import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, RefreshCw, Lock, Unlock, AlertOctagon } from 'lucide-react';
import { apiClient } from '../api/client';

interface IncidentAlert {
  id: string;
  eventId: string;
  zoneId: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  timestamp: string;
}

interface Gate {
  id: string;
  name: string;
  zoneId: string;
  status: 'OPEN' | 'CLOSED' | 'RESTRICTED';
}

export const AlertsIncidentPage: React.FC = () => {
  const [alerts, setAlerts] = useState<IncidentAlert[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEventId] = useState<string>('evt_live_prod_01');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [alertsRes, gatesRes] = await Promise.all([
        apiClient<any>(`/api/v1/admin/events/${selectedEventId}/alerts`).catch(() => ({ alerts: [] })),
        apiClient<any>(`/api/v1/admin/events/${selectedEventId}/gates`).catch(() => ({ gates: [] }))
      ]);

      setAlerts(Array.isArray(alertsRes.alerts) ? alertsRes.alerts : (alertsRes.data || []));
      setGates(Array.isArray(gatesRes.gates) ? gatesRes.gates : (gatesRes.data || []));
    } catch (err) {
      console.error("Failed to load alerts/incidents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [selectedEventId]);

  const updateAlertStatus = async (alertId: string, status: 'ACKNOWLEDGED' | 'RESOLVED') => {
    try {
      await apiClient(`/api/v1/admin/alerts/${alertId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch (err) {
      alert("Failed to update alert status");
    }
  };

  const toggleGateStatus = async (gateId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      await apiClient(`/api/v1/admin/gates/${gateId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus })
      });
      fetchData();
    } catch (err) {
      alert("Failed to override gate status");
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            Alerts, Incidents & Override Control
          </h1>
          <p className="text-xs text-slate-500">Live AI anomaly detection and gate override matrix</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Feed
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Alerts Stream */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" /> Active Incident Stream
          </h2>

          {alerts.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No Active Incidents</p>
              <p className="text-xs text-slate-500">All event zones are currently operating within nominal parameters.</p>
            </div>
          ) : (
            alerts.map((item) => (
              <div
                key={item.id}
                className={`bg-white border rounded-xl p-4 shadow-xs flex flex-col justify-between gap-3 ${
                  item.severity === 'CRITICAL' ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                        item.severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {item.severity}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">{item.zoneId}</span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  {item.status === 'ACTIVE' && (
                    <button
                      onClick={() => updateAlertStatus(item.id, 'ACKNOWLEDGED')}
                      className="px-3 py-1 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Acknowledge
                    </button>
                  )}
                  {item.status !== 'RESOLVED' && (
                    <button
                      onClick={() => updateAlertStatus(item.id, 'RESOLVED')}
                      className="px-3 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Perimeter Gate Overrides */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-blue-500" /> Perimeter Gate Overrides
          </h2>

          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            {gates.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">No gates assigned to active event context.</p>
            ) : (
              gates.map((gate) => (
                <div key={gate.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{gate.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase">{gate.zoneId}</p>
                  </div>
                  <button
                    onClick={() => toggleGateStatus(gate.id, gate.status)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      gate.status === 'OPEN'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {gate.status === 'OPEN' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    {gate.status}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};