import React from 'react';
import { useEventAdmin } from '../context/EventAdminContext.tsx';
import { 
  Mic, 
  AlertTriangle, 
  Users, 
  Clock, 
  Activity, 
  ShieldAlert, 
  Radio
} from 'lucide-react';

export const Header: React.FC = () => {
  const { event, setVoiceOpen, openSimulation, session } = useEventAdmin();

  const criticalAlerts = event?.alerts.filter(a => !a.resolved && a.priority === 'CRITICAL') || [];

  return (
    <header 
      id="event-admin-header"
      className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between flex-shrink-0 z-10"
    >
      {/* Event Title & Rush Status */}
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              {event?.name || 'Live Operations Console'}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200/60">
              Live Rush Hour
            </span>
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
            <span>{event?.venue}</span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono text-slate-600">
              <Clock className="w-3 h-3 text-slate-400" />
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} IST
            </span>
          </div>
        </div>
      </div>

      {/* Right Actions: Voice Assistant trigger & Critical Banner */}
      <div className="flex items-center gap-3">
        {criticalAlerts.length > 0 && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-pulse">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{criticalAlerts.length} Action{criticalAlerts.length > 1 ? 's' : ''} Require Immediate Attention</span>
          </div>
        )}

        {/* Action-Based Voice Assistant Persistent Trigger */}
        <button
          id="btn-voice-assistant-header"
          onClick={() => setVoiceOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-sm shadow-blue-500/30 hover:shadow-md hover:shadow-blue-500/40"
          title="Open Action-Based Voice Assistant"
        >
          <div className="w-2 h-2 rounded-full bg-blue-200 animate-ping"></div>
          <Mic className="w-4 h-4" />
          <span>Voice Command</span>
          <span className="hidden sm:inline-block text-[10px] bg-blue-500/70 px-1.5 py-0.5 rounded font-mono">
            "Hey, open Gate 3"
          </span>
        </button>

        {/* User Profile Widget */}
        <div id="eventhead-header-profile" className="flex flex-col items-end pl-3 border-l border-slate-200">
          <span className="text-xs font-mono font-semibold text-slate-800 truncate max-w-[190px]">
            {session?.email || 'eventadmin@eventflow.ai'}
          </span>
          <span className="text-[10px] font-bold font-mono tracking-wide px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 mt-0.5">
            {session?.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'EVENT ADMIN'}
          </span>
        </div>
      </div>
    </header>
  );
};
