import type { CrowdLevel } from '@/lib/types';
import { LEVEL_META, cn } from '@/lib/utils';

interface CrowdMeterProps {
  occupancyPct: number;
  level: CrowdLevel;
  className?: string;
}

const SEGMENTS = 10;

/** Ten-segment gauge. The level pill next to it carries the same information in words. */
export default function CrowdMeter({ occupancyPct, level, className }: CrowdMeterProps) {
  const filled = occupancyPct > 0 ? Math.max(1, Math.ceil(occupancyPct / (100 / SEGMENTS))) : 0;

  return (
    <div role="img" aria-label={`${occupancyPct}% full`} className={cn('flex gap-1', className)}>
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <span
          key={index}
          className={cn('h-2 flex-1 rounded-full', index < filled ? LEVEL_META[level].bar : 'bg-slate-200')}
        />
      ))}
    </div>
  );
}
