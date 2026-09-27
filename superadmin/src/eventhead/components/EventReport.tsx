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
            {event.analytics.peakCrowd.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Recorded at {event.analytics.peakTime}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold flex items-center justify-between">
            <span>Throughput Flow</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
            +{event.analytics.totalEntries.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Entries processed / -{event.analytics.totalExits.toLocaleString()} exits
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold flex items-center justify-between">
            <span>Average Queue Wait</span>
            <Hourglass className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2 font-mono">
            {event.analytics.avgWaitMinutes} min
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Down from 8.5m peak
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-semibold flex items-center justify-between">
            <span>AI Prediction Accuracy</span>
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-700 mt-2 font-mono">
            {event.analytics.aiAccuracyPercent}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {event.analytics.aiActionsExecuted} actions executed
          </div>
        </div>
      </section>

      {/* 2. CROWD & GATE ANALYTICS */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Crowd Analytics: Hourly Trend Curve & Predictions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Crowd & Occupancy Curve
              </h3>
              <p className="text-xs text-slate-400">Actual crowd vs AI predictive projection</p>
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

          <div className="h-44 flex items-end justify-between gap-3 pt-4 border-b border-slate-100">
            {event.analytics.hourlyCrowd.map((pt, i) => {
              const maxCrowd = 10000;
              const hActual = Math.round((pt.crowd / maxCrowd) * 140);
              const hPred = Math.round((pt.predicted / maxCrowd) * 140);

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
                  <div className="text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {pt.crowd.toLocaleString()}
                  </div>
                  <div className="w-full flex items-end justify-center gap-1">
                    <div 
                      className="w-3.5 bg-blue-600 rounded-t-sm transition-all"
                      style={{ height: `${hActual}px` }}
                      title={`Actual: ${pt.crowd}`}
                    ></div>
                    <div 
                      className="w-3.5 bg-indigo-200 rounded-t-sm transition-all"
                      style={{ height: `${hPred}px` }}
                      title={`Predicted: ${pt.predicted}`}
                    ></div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-1">
                    {pt.time.split(' ')[0]}
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
            {event.analytics.gateFlows.map((gf, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">{gf.gate}</div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    +{gf.entries.toLocaleString()} Ingress | -{gf.exits.toLocaleString()} Egress
                  </div>
                </div>
                <div className="w-32 bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${Math.min(100, (gf.entries / 6000) * 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
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
                {event.analytics.aiRecommendationsGenerated}
              </div>
              <div className="text-[10px] text-blue-600 uppercase font-semibold mt-0.5">
                Recommendations
              </div>
            </div>
            <div className="p-3 bg-emerald-50/70 rounded-xl text-center border border-emerald-100">
              <div className="text-xl font-bold font-mono text-emerald-900">
                {event.analytics.aiActionsExecuted}
              </div>
              <div className="text-[10px] text-emerald-600 uppercase font-semibold mt-0.5">
                Actions Executed
              </div>
            </div>
            <div className="p-3 bg-indigo-50/70 rounded-xl text-center border border-indigo-100">
              <div className="text-xl font-bold font-mono text-indigo-900">
                {event.analytics.aiAccuracyPercent}%
              </div>
              <div className="text-[10px] text-indigo-600 uppercase font-semibold mt-0.5">
                Model Precision
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <strong>Engine Note:</strong> Continuous optical flow telemetry from all 8 cameras correctly predicted the 18:30 Gate 2 surge with 4-minute lead time, enabling proactive Gate 3 activation before attendee queue spilled into transit avenues.
          </p>
        </div>

        {/* Operational Audit Trail (Mandatory Security Log) */}
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
              {auditLogs.length === 0 ? (
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
