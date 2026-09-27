import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  ShieldAlert,
  BarChart3,
  AlertTriangle,
  Camera,
  Activity,
  Sliders,
  Settings,
  LogOut,
  BrainCircuit,
  Radio
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { adminService } from '../services/adminService';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user, logout } = useAuth();
  const [eventAdminCount, setEventAdminCount] = useState<number>(2);
  const [superAdminCount, setSuperAdminCount] = useState<number>(1);

  useEffect(() => {
    adminService.getEventAdmins().then(res => setEventAdminCount(res.count)).catch(() => {});
    adminService.getSuperAdmins().then(res => setSuperAdminCount(res.count)).catch(() => {});
  }, [currentTab]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'autonomous-ops',
      label: 'AI Autonomous Ops',
      icon: BrainCircuit,
      badge: 'LIVE AI',
      badgeColor: 'text-purple-700 bg-purple-50 border-purple-200'
    },
    { id: 'telemetry', label: 'CCTV & CV Feeds', icon: Camera },
    { id: 'events', label: 'Events', icon: CalendarDays },
    { id: 'alerts', label: 'Alerts & Incidents', icon: AlertTriangle },
    { id: 'simulations', label: 'Simulations', icon: Sliders },
    { id: 'analytics', label: 'Global Analytics', icon: BarChart3 },
    {
      id: 'event-admins',
      label: 'Event Admins',
      icon: Users,
      badge: `${eventAdminCount}/40`,
      badgeColor: eventAdminCount >= 38 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-600 bg-slate-100 border-slate-200'
    },
    {
      id: 'super-admins',
      label: 'Super Admins',
      icon: ShieldAlert,
      badge: `${superAdminCount}/5`,
      badgeColor: superAdminCount >= 5 ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-slate-600 bg-slate-100 border-slate-200'
    },
    { id: 'settings', label: 'System Settings', icon: Settings },
    {
      id: 'public-portal',
      label: 'Public Safety Portal',
      icon: Radio,
      badge: 'PUBLIC',
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200'
    }
  ];

  return (
    <aside
      id="command-sidebar"
      className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen select-none shrink-0 z-20 shadow-xs"
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
          <Activity className="w-4 h-4" />
        </div>
        <div>
          <div className="font-bold text-sm tracking-wider uppercase text-slate-900 flex items-center gap-1.5">
            EventFlow <span className="text-blue-600 text-xs px-1.5 py-0.5 bg-blue-50 rounded-md border border-blue-200 font-bold">AI</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Control Center v1.0</p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <div className="px-2 pb-1.5 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
          Command Matrix
        </div>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-medium ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User profile & Logout footer */}
      <div className="p-3.5 border-t border-slate-100 bg-slate-50/80">
        <div className="flex flex-col gap-1 mb-2.5">
          <p className="text-xs font-mono font-semibold text-slate-800 truncate" title={user?.email || 'superadmin@eventflow.ai'}>
            {user?.email || 'superadmin@eventflow.ai'}
          </p>
          <span className="self-start text-[10px] px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-bold font-mono">
            {user?.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'EVENT ADMIN'}
          </span>
        </div>
        <button
          id="btn-logout"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors bg-white shadow-xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};