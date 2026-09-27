import React from 'react';
import { useEventAdmin } from '../context/EventAdminContext.tsx';
import { logout } from '../api.ts';
import { 
  LayoutDashboard, 
  MapPin, 
  FileBarChart2, 
  ShieldCheck, 
  Radio, 
  Users, 
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  onOpenSuperAdminModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenSuperAdminModal }) => {
  const { session, event, activeTab, setActiveTab, switchUserRole } = useEventAdmin();

  const isSuperAdmin = session?.role === 'SUPER_ADMIN';

  return (
    <aside 
      id="event-admin-sidebar"
      className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between flex-shrink-0 z-20 shadow-[1px_0_4px_rgba(0,0,0,0.02)]"
    >
      <div>
        {/* Brand / App Title */}
        <div className="p-5 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  {isSuperAdmin ? 'SUPER ADMIN' : 'EVENT ADMIN'}
                </div>
                <div className="text-base font-extrabold text-slate-900 tracking-tight leading-none mt-0.5">
                  EventFlow AI
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live
            </div>
          </div>

          {/* Assigned Event Card (Mandatory Display) */}
          <div className="mt-4 p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 flex items-center justify-between">
              <span>Assigned Event</span>
              <span className="text-[10px] bg-blue-200/60 text-blue-800 px-1.5 py-0.2 rounded font-mono">
                {event?.id ? event.id.substring(0, 10) : 'LOCK'}
              </span>
            </div>
            <div 
              className="text-sm font-bold text-slate-900 mt-1 line-clamp-1" 
              title={event?.name || 'No Event Assigned'}
            >
              {event?.name || 'Loading assigned event...'}
            </div>
            <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-blue-500 flex-shrink-0" />
              <span>{event?.venue || 'Venue verifying...'}</span>
            </div>
          </div>
        </div>

        {/* Minimal 3-Item Navigation */}
        <nav className="p-3 space-y-1">
          <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Operations View
          </div>

          <button
            id="nav-command-center"
            onClick={() => setActiveTab('COMMAND_CENTER')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'COMMAND_CENTER'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-4 h-4" />
              <span>Command Center</span>
            </div>
            {event && event.alerts.filter(a => !a.resolved && a.priority === 'CRITICAL').length > 0 && (
              <span 
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === 'COMMAND_CENTER' 
                    ? 'bg-white text-rose-600' 
                    : 'bg-rose-500 text-white'
                }`}
              >
                {event.alerts.filter(a => !a.resolved && a.priority === 'CRITICAL').length}
              </span>
            )}
          </button>

          <button
            id="nav-live-map"
            onClick={() => setActiveTab('LIVE_MAP')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'LIVE_MAP'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4" />
              <span>Live Map</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-mono">2D Interactive</span>
          </button>

          <button
            id="nav-event-report"
            onClick={() => setActiveTab('EVENT_REPORT')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'EVENT_REPORT'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileBarChart2 className="w-4 h-4" />
              <span>Event Report</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex flex-col gap-1 mb-2">
            <span className="text-xs font-mono font-semibold text-slate-800 truncate" title={session?.email || 'eventadmin@eventflow.ai'}>
              {session?.email || 'eventadmin@eventflow.ai'}
            </span>
            <span className={`self-start text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
              isSuperAdmin ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
            }`}>
              {isSuperAdmin ? 'SUPER ADMIN' : 'EVENT ADMIN'}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1 text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Session Active</span>
            </span>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold">
              {isSuperAdmin ? 'SUPER_ADMIN' : 'EVENT_ADMIN'}
            </span>
          </div>

          <button
            onClick={logout}
            className="mt-2.5 w-full flex items-center justify-center gap-1.5 text-[11px] font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 rounded-lg px-2 py-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
};