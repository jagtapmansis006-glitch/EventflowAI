import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  badge?: string;
  badgeType?: 'emerald' | 'amber' | 'rose' | 'cyan' | 'slate' | 'blue';
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  id,
  title,
  value,
  subtext,
  icon: Icon,
  badge,
  badgeType = 'blue',
  trend
}) => {
  const badgeColors = {
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    amber: 'text-amber-800 bg-amber-50 border-amber-200',
    rose: 'text-rose-700 bg-rose-50 border-rose-200',
    cyan: 'text-blue-700 bg-blue-50 border-blue-200',
    blue: 'text-blue-700 bg-blue-50 border-blue-200',
    slate: 'text-slate-600 bg-slate-100 border-slate-200'
  };

  return (
    <div
      id={id}
      className="bg-white border border-slate-200 rounded-xl p-4.5 relative overflow-hidden transition-all hover:border-blue-300 hover:shadow-sm shadow-xs"
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">{title}</span>
        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono">{value}</span>
        {badge && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-semibold font-mono ${badgeColors[badgeType]}`}>
            {badge}
          </span>
        )}
      </div>

      {(subtext || trend) && (
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 mt-2">
          {subtext && <span className="truncate">{subtext}</span>}
          {trend && <span className="text-blue-600 font-semibold font-mono text-[11px] shrink-0 ml-1">{trend}</span>}
        </div>
      )}
    </div>
  );
};
