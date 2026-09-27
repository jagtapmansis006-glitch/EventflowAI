import React from 'react';
import { useEventAdmin } from '../context/EventAdminContext.tsx';
import { 
  Users, 
  Percent, 
  Activity, 
  AlertOctagon, 
  DoorClosed, 
  DoorOpen, 
  Hourglass, 
  Video, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  TrendingUp, 
  Sparkles,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Info,
  Clock,
  Compass
} from 'lucide-react';
import { AlertCard, Gate, QueueItem, Zone, Camera } from '../types.ts';

export const CommandCenter: React.FC = () => {
  const { 
    event, 
    setSelectedItem, 
    handleAlertAction, 
    openSimulation, 
    setActiveTab, 
    toggleGate 
  } = useEventAdmin();

  if (!event) return null;

  // Active alerts prioritized: CRITICAL -> WARNING -> INFO
  const activeAlerts = event.alerts
    .filter(a => !a.resolved)
    .sort((a, b) => {
      const priorityWeights = { CRITICAL: 1, WARNING: 2, INFO: 3 };
      return priorityWeights[a.priority] - priorityWeights[b.priority];
    });

  const criticalCount = activeAlerts.filter(a => a.priority === 'CRITICAL').length;

  return (
    <div id="command-center-page" className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* 1. TOP SECTION: Compact Status Cards */}
      <section id="top-status-cards" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Current Crowd */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Current Crowd</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-2 font-mono tracking-tight">
            {event.currentCrowd.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Capacity: {event.capacity.toLocaleString()}</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> Live
            </span>
          </div>
        </div>

        {/* Occupancy % */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Occupancy</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Percent className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-2 font-mono tracking-tight">
            {event.occupancyPercent}%
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                event.occupancyPercent >= 90 ? 'bg-rose-500' : event.occupancyPercent >= 75 ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(100, event.occupancyPercent)}%` }}
            ></div>
          </div>
        </div>

        {/* Crowd Status */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Crowd Status</span>
            <span className="p-1.5 rounded-lg bg-slate-50 text-slate-600">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span 
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-extrabold tracking-wide uppercase ${
                event.crowdStatus === 'CRITICAL' 
                  ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                  : event.crowdStatus === 'BUSY' || event.crowdStatus === 'WARNING'
                  ? 'bg-amber-100 text-amber-900 border border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${
                event.crowdStatus === 'CRITICAL' ? 'bg-rose-600 animate-ping' : event.crowdStatus === 'BUSY' ? 'bg-amber-500' : 'bg-emerald-500'
              }`}></span>
              {event.crowdStatus}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Predicted: 9,100 in 10 min
          </div>
        </div>

        {/* Critical Alerts */}
        <div className={`rounded-2xl p-4 border transition-all ${
          criticalCount > 0 
            ? 'bg-rose-50/60 border-rose-200 shadow-xs' 
            : 'bg-white border-slate-200/80 shadow-xs'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Critical Alerts</span>
            <span className={`p-1.5 rounded-lg ${criticalCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-50 text-slate-600'}`}>
              <AlertOctagon className="w-4 h-4" />
            </span>
          </div>
          <div className={`text-2xl md:text-3xl font-extrabold mt-2 font-mono tracking-tight ${
            criticalCount > 0 ? 'text-rose-700' : 'text-slate-900'
          }`}>
            {criticalCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {criticalCount > 0 ? 'Immediate action advised' : 'All channels nominal'}
          </div>
        </div>
      </section>

      {/* 2. AI ACTION / ATTENTION AREA (Primary Focus Area) */}
      <section id="ai-attention-area" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
              AI Attention & Action Required
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Prioritized by impact • AI watches, detects & recommends
          </span>
        </div>

        {activeAlerts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200/80 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-base font-bold text-slate-900">
              No Operational Anomalies Detected
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              All gates, crowd zones, and queues are within nominal safety capacity. AI telemetry is actively scanning all 8 video streams.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map(alert => {
              const isCritical = alert.priority === 'CRITICAL';
              const isWarning = alert.priority === 'WARNING';
              const isIncident = alert.category === 'INCIDENT';

              return (
                <div
                  key={alert.id}
                  id={`action-card-${alert.id}`}
                  className={`bg-white rounded-2xl p-5 border transition-all shadow-xs ${
                    isCritical
                      ? 'border-rose-300 ring-1 ring-rose-200/50 bg-gradient-to-r from-rose-50/40 via-white to-white'
                      : isWarning
                      ? 'border-amber-300 bg-gradient-to-r from-amber-50/30 via-white to-white'
                      : 'border-blue-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    {/* Left: Priority Badge & Details */}
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span 
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase ${
                            isCritical
                              ? 'bg-rose-600 text-white'
                              : isWarning
                              ? 'bg-amber-500 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                          {isIncident ? 'INCIDENT' : alert.priority}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">
                          {alert.title}
                        </h3>
                        <span className="text-[11px] text-slate-400 font-mono ml-auto md:ml-2">
                          {alert.createdAt}
                        </span>
                      </div>

                      {/* Description & metrics */}
                      <p className="text-sm text-slate-700 font-medium">
                        {alert.description}
                      </p>

                      {/* AI Recommendation Highlight Box */}
                      {alert.recommendation && (
                        <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100 flex items-start gap-2.5 text-xs text-blue-900">
                          <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold text-blue-700 uppercase tracking-wider block text-[10px]">
                              AI Recommendation
                            </span>
                            <span className="font-semibold text-slate-800">
                              {alert.recommendation}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: One-Click Operational Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap md:flex-nowrap md:self-center">
                      {/* Primary One-Click Action */}
                      {alert.actionType === 'OPEN_GATE' && (
                        <button
                          id={`btn-open-${alert.id}`}
                          onClick={() => handleAlertAction(alert.id, 'OPEN_GATE', alert.actionPayload)}
                          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs tracking-wider transition-all shadow-sm shadow-blue-500/20 flex items-center gap-2 whitespace-nowrap"
                        >
                          <DoorOpen className="w-4 h-4" />
                          <span>{alert.actionLabel || 'OPEN GATE 3'}</span>
                        </button>
                      )}

                      {alert.actionType === 'REDIRECT_ROUTE' && (
                        <button
                          id={`btn-view-route-${alert.id}`}
                          onClick={() => {
                            setActiveTab('LIVE_MAP');
                          }}
                          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs tracking-wider transition-all shadow-sm shadow-blue-500/20 flex items-center gap-2 whitespace-nowrap"
                        >
                          <Compass className="w-4 h-4" />
                          <span>VIEW ROUTE</span>
                        </button>
                      )}

                      {alert.actionType === 'DISPATCH_STAFF' && (
                        <button
                          id={`btn-dispatch-${alert.id}`}
                          onClick={() => handleAlertAction(alert.id, 'DISPATCH_STAFF', alert.actionPayload)}
                          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs tracking-wider transition-all shadow-sm shadow-rose-500/20 flex items-center gap-2 whitespace-nowrap"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>DISPATCH STAFF</span>
                        </button>
                      )}

                      {/* Simulation Button (Opens What-If Simulation without changing real state) */}
                      {alert.hasSimulation && (
                        <button
                          id={`btn-simulate-${alert.id}`}
                          onClick={() => openSimulation(alert.actionType, alert.actionPayload?.gateId, alert.simulationPayload)}
                          className="px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-extrabold text-xs tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>SIMULATE</span>
                        </button>
                      )}

                      {/* Dismiss / Acknowledge */}
                      <button
                        id={`btn-dismiss-${alert.id}`}
                        onClick={() => handleAlertAction(alert.id, 'DISMISS')}
                        className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition-all whitespace-nowrap"
                      >
                        DISMISS
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. LIVE OPERATIONS SUMMARY (GATES, QUEUES, ZONES, CAMERAS) */}
      <section id="live-operations-summary" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
            Live Operations Summary
          </h2>
          <span className="text-xs text-slate-400">
            Click any module to open contextual side panel
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* GATES SUMMARY */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-blue-50 text-blue-600">
                    <DoorOpen className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Gates</span>
                </div>
                <span className="text-[11px] font-mono font-semibold text-slate-400">
                  {event.gates.filter(g => g.status === 'OPEN').length}/{event.gates.length} Open
                </span>
              </div>

              <div className="space-y-2">
                {event.gates.slice(0, 4).map(gate => (
                  <div
                    key={gate.id}
                    id={`gate-item-${gate.id}`}
                    onClick={() => setSelectedItem({ type: 'GATE', data: gate })}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200/60 hover:border-blue-200 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${gate.status === 'OPEN' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                          {gate.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                        {gate.currentCrowd.toLocaleString()} / {gate.capacity.toLocaleString()} cap
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        gate.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {gate.status}
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {gate.flowRate > 0 ? `+${gate.flowRate}/m` : `${gate.flowRate}/m`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* QUEUES SUMMARY */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-amber-50 text-amber-600">
                    <Hourglass className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Queues</span>
                </div>
                <span className="text-[11px] font-mono font-semibold text-slate-400">
                  {event.queues.length} Lines
                </span>
              </div>

              <div className="space-y-2">
                {event.queues.map(queue => (
                  <div
                    key={queue.id}
                    id={`queue-item-${queue.id}`}
                    onClick={() => setSelectedItem({ type: 'QUEUE', data: queue })}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200/60 hover:border-amber-200 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-amber-800">
                        {queue.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Length: {queue.length} persons
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        queue.status === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : queue.status === 'BUSY' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        ~{queue.waitMinutes}m wait
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ZONES SUMMARY */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-indigo-50 text-indigo-600">
                    <Layers className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Zones</span>
                </div>
                <span className="text-[11px] font-mono font-semibold text-slate-400">
                  {event.zones.length} Sectors
                </span>
              </div>

              <div className="space-y-2">
                {event.zones.map(zone => (
                  <div
                    key={zone.id}
                    id={`zone-item-${zone.id}`}
                    onClick={() => setSelectedItem({ type: 'ZONE', data: zone })}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/60 hover:border-indigo-200 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-800">
                        {zone.code}: {zone.name.split('&')[0]}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {zone.crowdCount.toLocaleString()} attendees
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        zone.density >= 90 ? 'bg-rose-100 text-rose-800' : zone.density >= 75 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {zone.density}% density
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CAMERAS SUMMARY */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-emerald-50 text-emerald-600">
                    <Video className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Cameras</span>
                </div>
                <span className="text-[11px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                  All Online (8/8)
                </span>
              </div>

              <div className="space-y-2">
                {event.cameras.slice(0, 4).map(cam => (
                  <div
                    key={cam.id}
                    id={`cam-item-${cam.id}`}
                    onClick={() => setSelectedItem({ type: 'CAMERA', data: cam })}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/60 hover:border-emerald-200 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-800">
                          {cam.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[130px]">
                        {cam.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-600 font-mono block">
                        {cam.fps} FPS
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {cam.lastTelemetryTime}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
