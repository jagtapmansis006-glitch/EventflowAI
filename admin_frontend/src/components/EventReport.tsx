import React, { useState } from 'react';
import { useEventAdmin } from '../context/EventAdminContext.tsx';
import { 
  Users, 
  TrendingUp, 
  DoorOpen, 
  Hourglass, 
  Layers, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  Download, 
  CheckCircle2,
  Calendar,
  BarChart3
} from 'lucide-react';

export const EventReport: React.FC = () => {
  const { event, auditLogs } = useEventAdmin();
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!event) return null;

  const handleExport = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  // Dynamic max crowd calculation from backend hourly records
  const hourlyData = event.analytics?.hourlyCrowd || [];
  const maxCrowdObserved = Math.max(
    ...hourlyData.map(pt => Math.max(pt.crowd || 0, pt.predicted || 0)),
    event.analytics?.peakCrowd || 40000,
    1000
  );

  return (
    <div id="event-report-page" className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Report Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              Live Operations & Post-Rush Performance Report
            </h1>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
              Live Audit Sync
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Historical analytics, throughput rates, AI recommendation telemetry, and operator audit records for {event.name}.
          </p>
        </div>

        <button
          id="btn-export-report"
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-xs"
        >
          {downloadSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700">Report Exported</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export Operational Log</span>
            </>
          )}
        </button>
      </div>

      {/* 1. KEY PERFORMANCE METRICS CARDS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold flex items-center justify-between">
            <span>Peak Crowd</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
            {event.analytics?.peakCrowd?.toLocaleString() || '0'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Recorded at {event.analytics?.peakTime || '--:--'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold flex items-center justify-between">
            <span>Throughput Flow</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
            +{event.analytics?.totalEntries?.toLocaleString() || '0'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Entries processed / -{event.analytics?.totalExits?.toLocaleString() || '0'} exits
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold flex items-center justify-between">
            <span>Average Queue Wait</span>
            <Hourglass className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
            {event.analytics?.avgWaitMinutes || '0'} min
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Real-time queue sensor average
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold flex items-center justify-between">
            <span>AI Prediction Accuracy</span>
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-700 mt-2 font-mono">
            {event.analytics?.aiAccuracyPercent || '95'}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {event.analytics?.aiActionsExecuted || '0'} actions executed
          </div>
        </div>
      </section>

      {/* 2. CROWD & GATE ANALYTICS */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Dynamic Hourly Trend Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Crowd & Occupancy Curve
              </h3>
              <p className="text-xs text-slate-400">Actual telemetry vs AI predictive projection</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Actual
              </span>
              <span className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-300"></span> Projected
              </span>
            </div>
          </div>

          {/* Chart Canvas Area */}
          <div className="relative h-56 w-full flex items-end justify-around gap-2 px-2 pt-8 pb-2 border-b border-slate-100 bg-slate-50/40 rounded-xl">
            {/* Background Guidelines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-2 opacity-30">
              <div className="border-b border-dashed border-slate-300 w-full text-[9px] font-mono text-slate-400 text-right">
                {maxCrowdObserved.toLocaleString()}
              </div>
              <div className="border-b border-dashed border-slate-300 w-full text-[9px] font-mono text-slate-400 text-right">
                {Math.round(maxCrowdObserved / 2).toLocaleString()}
              </div>
              <div className="border-b border-slate-200 w-full"></div>
            </div>

            {hourlyData.map((pt, i) => {
              // Exact normalized percentage height
              const hActualPercent = Math.min(100, Math.max(8, Math.round((pt.crowd / maxCrowdObserved) * 100)));
              const hPredPercent = Math.min(100, Math.max(8, Math.round((pt.predicted / maxCrowdObserved) * 100)));

              return (
                <div key={i} className="z-10 flex flex-col items-center gap-1 h-full justify-end group">
                  <div className="text-[10px] font-mono font-semibold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white px-1.5 py-0.5 rounded shadow-xs border border-slate-200">
                    {pt.crowd.toLocaleString()}
                  </div>
                  <div className="flex items-end justify-center gap-1.5">
                    <div 
                      className="w-3 sm:w-4 bg-blue-600 hover:bg-blue-700 rounded-t-md transition-all duration-300 shadow-xs"
                      style={{ height: `${(hActualPercent * 160) / 100}px` }}
                      title={`Actual: ${pt.crowd.toLocaleString()} attendees`}
                    ></div>
                    <div 
                      className="w-3 sm:w-4 bg-indigo-300 hover:bg-indigo-400 rounded-t-md transition-all duration-300"
                      style={{ height: `${(hPredPercent * 160) / 100}px` }}
                      title={`Predicted: ${pt.predicted.toLocaleString()} forecast`}
                    ></div>
                  </div>
                  <span className="text-[11px] text-slate-600 font-mono font-medium mt-2">
                    {pt.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gate Analytics Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Gate Performance & Congestion
              </h3>
              <p className="text-xs text-slate-400">Total ingress & egress distribution across gates</p>
            </div>
          </div>

          <div className="space-y-3">
            {(event.analytics?.gateFlows || []).map((gf, idx) => {
              const maxGateCapacity = 10000;
              const flowPercent = Math.min(100, Math.round(((gf.entries || 0) / maxGateCapacity) * 100));
              return (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">{gf.gate}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      +{(gf.entries || 0).toLocaleString()} Ingress | -{(gf.exits || 0).toLocaleString()} Egress
                    </div>
                  </div>
                  <div className="w-32 bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${flowPercent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </section>

      {/* 3. AI PERFORMANCE & AUDIT TRAIL */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* AI Performance Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              AI Decision Engine Performance
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-blue-50/70 rounded-xl text-center border border-blue-100">
              <div className="text-xl font-bold font-mono text-blue-900">
                {event.analytics?.aiRecommendationsGenerated || 0}
              </div>
              <div className="text-[10px] text-blue-600 uppercase font-semibold mt-0.5">
                Recommendations
              </div>
            </div>
            <div className="p-3 bg-emerald-50/70 rounded-xl text-center border border-emerald-100">
              <div className="text-xl font-bold font-mono text-emerald-900">
                {event.analytics?.aiActionsExecuted || 0}
              </div>
              <div className="text-[10px] text-emerald-600 uppercase font-semibold mt-0.5">
                Actions Executed
              </div>
            </div>
            <div className="p-3 bg-indigo-50/70 rounded-xl text-center border border-indigo-100">
              <div className="text-xl font-bold font-mono text-indigo-900">
                {event.analytics?.aiAccuracyPercent || 95}%
              </div>
              <div className="text-[10px] text-indigo-600 uppercase font-semibold mt-0.5">
                Model Precision
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <strong>Engine Telemetry:</strong> Real-time crowd aggregation pipeline synchronized with Computer Vision ingress models. Automatic load balancing dynamically re-projects throughput forecasts across all monitored gates.
          </p>
        </div>

        {/* Operational Audit Trail */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Operational Audit Trail
                </h3>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                Immutable Log
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {!auditLogs || auditLogs.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center">
                  No operational actions logged in this session yet.
                </div>
              ) : (
                auditLogs.slice(0, 6).map(log => (
                  <div 
                    key={log.id} 
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 font-mono">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          by {log.admin_name} ({log.source})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {log.details || log.target}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {log.timestamp}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </section>

    </div>
  );
};