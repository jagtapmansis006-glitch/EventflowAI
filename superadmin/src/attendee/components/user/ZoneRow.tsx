import { Link } from '@/lib/navigation';
import type { ZoneTelemetry } from '@/lib/types';
import { LEVEL_META, TREND_LABEL, cn } from '@/lib/utils';
import CrowdMeter from './CrowdMeter';
import { TrendIcon } from './icons';

export default function ZoneRow({ zone }: { zone: ZoneTelemetry }) {
  const meta = LEVEL_META[zone.level];
  const wait = zone.waitMinutes === null ? null : zone.waitMinutes === 0 ? 'No wait' : `${zone.waitMinutes} min wait`;

  return (
    <Link
      href={`/user/map?zone=${zone.id}`}
      className="block min-h-[72px] touch-manipulation rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200 transition-colors active:bg-slate-50"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="truncate font-semibold text-slate-900">{zone.name}</p>
        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', meta.pill)}>{meta.label}</span>
      </div>

      <CrowdMeter occupancyPct={zone.occupancyPct} level={zone.level} className="mt-2.5" />

      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-3">
          <span>{zone.occupancyPct}% full</span>
          {wait && <span>{wait}</span>}
        </span>
        <span className="flex items-center gap-1">
          <TrendIcon trend={zone.trend} />
          {TREND_LABEL[zone.trend]}
        </span>
      </div>
    </Link>
  );
}
