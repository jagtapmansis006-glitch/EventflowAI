import React from 'react';
import { useEventAdmin } from '../context/EventAdminContext.tsx';
import { 
  X, 
  DoorOpen, 
  DoorClosed, 
  Video, 
  Hourglass, 
  Layers, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  Play, 
  TrendingUp, 
  ExternalLink,
  Radio
} from 'lucide-react';
import { Gate, QueueItem, Zone, Camera, IncidentItem } from '../types.ts';

export const SidePanel: React.FC = () => {
  const { 
    selectedItem, 
    setSelectedItem, 
    toggleGate, 
    openSimulation, 
    dispatchIncidentStaff,
    event 
  } = useEventAdmin();

  if (!selectedItem) return null;

  const { type, data } = selectedItem;

  return (
    <div 
      id="operations-side-panel"
      className="fixed inset-y-0 right-0 w-96 max-w-full bg-white border-l border-slate-200/90 shadow-2xl z-40 flex flex-col justify-between animate-in slide-in-from-right duration-200"
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          {type === 'GATE' && <DoorOpen className="w-5 h-5 text-blue-600" />}
          {type === 'QUEUE' && <Hourglass className="w-5 h-5 text-amber-600" />}
          {type === 'ZONE' && <Layers className="w-5 h-5 text-indigo-600" />}
          {type === 'CAMERA' && <Video className="w-5 h-5 text-emerald-600" />}
          {type === 'INCIDENT' && <ShieldAlert className="w-5 h-5 text-rose-600" />}
          
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {type} Telemetry & Controls
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              {data.name || data.title || data.code}
            </h3>
          </div>
        </div>

        <button
          id="btn-close-side-panel"
          onClick={() => setSelectedItem(null)}
          className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body Content by Type */}
      <div className="p-5 overflow-y-auto space-y-5 flex-1">
        
        {/* ================= GATE PANEL ================= */}
        {type === 'GATE' && (
          <div className="space-y-4">
            {/* Status & Capacity */}
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Operating Status</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  data.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-800'
                }`}>
                  {data.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Current Crowd</span>
                <span className="text-sm font-bold font-mono text-slate-900">{data.currentCrowd?.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Total Capacity</span>
                <span className="text-sm font-bold font-mono text-slate-900">{data.capacity?.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Current Flow Rate</span>
                <span className="text-sm font-bold font-mono text-blue-600">
                  {data.flowRate > 0 ? `+${data.flowRate}/min` : `${data.flowRate}/min`}
                </span>
              </div>

              {/* Capacity Progress Bar */}
              <div className="pt-1">
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>Occupancy</span>
                  <span className="font-bold">{Math.round((data.currentCrowd / data.capacity) * 100)}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      (data.currentCrowd / data.capacity) >= 0.9 ? 'bg-rose-500' : (data.currentCrowd / data.capacity) >= 0.75 ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(100, (data.currentCrowd / data.capacity) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* AI Insight Box */}
            <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50/60 rounded-2xl border border-blue-200/70 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-blue-800 mb-1">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>AI Optical Sensor Prediction</span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                {data.status === 'CLOSED'
                  ? 'Activating this gate will distribute up to 45% of Gate 2 inflow, reducing main plaza queue wait time by ~4 minutes.'
                  : 'Flow is continuous. Peak entrance expected in 12 minutes.'}
              </p>
            </div>

            {/* Controls */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Gate Direct Controls
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-gate-toggle"
                  onClick={() => toggleGate(data.id, data.status === 'OPEN' ? 'CLOSED' : 'OPEN')}
                  className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                    data.status === 'OPEN'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {data.status === 'OPEN' ? <DoorClosed className="w-4 h-4" /> : <DoorOpen className="w-4 h-4" />}
                  <span>{data.status === 'OPEN' ? 'CLOSE GATE' : 'OPEN GATE'}</span>
                </button>

                <button
                  id="btn-gate-simulate"
                  onClick={() => openSimulation('OPEN_GATE', data.id)}
                  className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>SIMULATE</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= QUEUE PANEL ================= */}
        {type === 'QUEUE' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Status</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                  {data.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Queue Length</span>
                <span className="text-sm font-bold font-mono text-slate-900">{data.length} persons</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Estimated Wait</span>
                <span className="text-sm font-bold font-mono text-amber-700">~{data.waitMinutes} minutes</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
              <strong>Recommendation:</strong> Consider opening auxiliary turnstiles or redirecting trailing attendees toward Gate 3 to balance wait times.
            </div>

            <button
              onClick={() => openSimulation('OPEN_GATE', 'gate_3')}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Simulate Queue Relief</span>
            </button>
          </div>
        )}

        {/* ================= ZONE PANEL ================= */}
        {type === 'ZONE' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Zone Code</span>
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-bold text-xs">
                  {data.code}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Crowd Count</span>
                <span className="text-sm font-bold font-mono text-slate-900">{data.crowdCount?.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Density Rating</span>
                <span className={`text-sm font-bold font-mono ${
                  data.density >= 90 ? 'text-rose-600' : data.density >= 75 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {data.density}%
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900">
              <strong>Egress Capacity:</strong> Routes connected to this sector are currently operating at 68% flow velocity.
            </div>
          </div>
        )}

        {/* ================= CAMERA PANEL ================= */}
        {type === 'CAMERA' && (
          <div className="space-y-4">
            {/* Live Camera Feed Mock View */}
            <div className="relative rounded-2xl bg-slate-950 aspect-video overflow-hidden flex items-center justify-center border border-slate-800">
              <div className="text-center p-4">
                <Radio className="w-8 h-8 text-blue-400 mx-auto animate-pulse mb-2" />
                <div className="text-xs font-mono text-emerald-400 font-bold">
                  ● LIVE RTSP FEED
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Stream: 1080p @ {data.fps} FPS
                </div>
              </div>

              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 text-[10px] font-mono text-white">
                {data.code}
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-900/80 text-[10px] font-mono text-emerald-400">
                AI Vision Mesh Active
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="font-bold text-emerald-600">ONLINE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Coverage Zone</span>
                <span className="font-bold text-slate-800">{data.zoneId || 'Main Concourse'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Last Telemetry</span>
                <span className="font-mono text-slate-700">{data.lastTelemetryTime}</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= INCIDENT PANEL ================= */}
        {type === 'INCIDENT' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-700 uppercase">Priority</span>
                <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[11px] font-bold">
                  {data.severity || 'HIGH'}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-900">{data.title}</div>
              <p className="text-xs text-slate-600">{data.description}</p>
            </div>

            <button
              onClick={() => dispatchIncidentStaff(data.id)}
              className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>DISPATCH EMERGENCY STAFF</span>
            </button>
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
        <button
          onClick={() => setSelectedItem(null)}
          className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
        >
          Close Panel
        </button>
      </div>
    </div>
  );
};
