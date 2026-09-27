import React from 'react';
import { Shield, Users, Smartphone, LogOut, Lock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface RoleInterconnectBannerProps {
  currentView: 'SUPER_ADMIN' | 'EVENT_ADMIN' | 'ATTENDEE';
}

export const RoleInterconnectBanner: React.FC<RoleInterconnectBannerProps> = ({
  currentView
}) => {
  const { user, logout } = useAuth();

  const roleConfigs = {
    SUPER_ADMIN: {
      roleTag: 'SUPER_ADMIN ONLY',
      label: 'Super Admin Command Matrix',
      badgeColor: 'bg-blue-600 text-white',
      border: 'border-blue-500',
      icon: Shield
    },
    EVENT_ADMIN: {
      roleTag: 'EVENT_ADMIN ONLY',
      label: 'Event Head Operations Console',
      badgeColor: 'bg-indigo-600 text-white',
      border: 'border-indigo-500',
      icon: Users
    },
    ATTENDEE: {
      roleTag: 'ATTENDEE ONLY',
      label: 'Attendee Mobile Experience',
      badgeColor: 'bg-emerald-600 text-white',
      border: 'border-emerald-500',
      icon: Smartphone
    }
  };

  const currentConfig = roleConfigs[currentView];
  const CurrentIcon = currentConfig.icon;

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 text-slate-200 px-4 py-2 flex flex-wrap items-center justify-between text-xs z-50 sticky top-0 shadow-md">
      {/* Current Interface Status with Strict Access Badge */}
      <div className="flex items-center gap-2.5">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold text-[11px] shadow-xs ${currentConfig.badgeColor}`}>
          <CurrentIcon className="w-3.5 h-3.5" />
          <span>{currentConfig.label}</span>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 font-mono text-[10px] font-bold">
          <Lock className="w-3 h-3 text-amber-400" />
          <span>{currentConfig.roleTag}</span>
        </div>

        <span className="text-slate-500 hidden md:inline">•</span>

        <span className="text-slate-300 font-medium hidden md:inline">
          Logged in as: <strong className="text-white">{user?.fullName || user?.email}</strong>
          <span className="text-slate-400 text-[11px] ml-1 font-mono">({user?.email})</span>
        </span>
      </div>

      {/* Strict Role Control & Sign Out */}
      <div className="flex items-center gap-3 mt-1 sm:mt-0">
        <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
          Port: <code className="text-slate-300 font-mono">5173</code>
        </span>

        <button
          id="btn-role-sign-out"
          onClick={logout}
          title="Sign Out to switch accounts or change role"
          className="px-3 py-1 rounded-md bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/70 text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out / Switch Account</span>
        </button>
      </div>
    </div>
  );
};
