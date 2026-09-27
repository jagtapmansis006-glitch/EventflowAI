import type { ZoneTelemetry } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';

interface ZoneRowProps {
  zone: ZoneTelemetry;
}

const CROWD_CONFIG: Record<string, { pill: string; label: string }> = {
  quiet: { pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', label: 'Quiet' },
  moderate: { pill: 'bg-amber-50 text-amber-700 ring-amber-600/20', label: 'Moderate' },
  busy: { pill: 'bg-orange-50 text-orange-700 ring-orange-600/20', label: 'Busy' },
  packed: { pill: 'bg-rose-50 text-rose-700 ring-rose-600/20', label: 'Packed' },
};

const DEFAULT_CONFIG = { pill: 'bg-amber-50 text-amber-700 ring-amber-600/20', label: 'Moderate' };

export default function ZoneRow({ zone }: ZoneRowProps) {
  const config = CROWD_CONFIG[zone?.crowdLevel] || DEFAULT_CONFIG;

  const waitText =
    zone.waitMinutes <= 0
      ? 'No wait'
      : `${zone.waitMinutes} min wait`;

  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">{zone.name}</p>
        <p className="text-xs text-slate-500">
          {zone.fillPercent}% full • {waitText}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
            config.pill,
          )}
        >
          {config.label}
        </span>

        {zone.trend === 'filling-up' && (
          <ArrowUpRight className="h-4 w-4 text-rose-500" title="Filling up" />
        )}
        {zone.trend === 'easing' && (
          <ArrowDownRight className="h-4 w-4 text-emerald-500" title="Easing" />
        )}
        {zone.trend === 'steady' && (
          <ArrowRight className="h-4 w-4 text-slate-400" title="Steady" />
        )}
      </div>
    </div>
  );
}