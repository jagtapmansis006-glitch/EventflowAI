import type { DataStatus } from '@/lib/hooks/useApiResource';
import { cn } from '@/lib/utils';

const STATUS: Record<DataStatus, { label: string; dot: string }> = {
  loading: { label: 'Connecting', dot: 'bg-slate-400' },
  live: { label: 'Live', dot: 'bg-emerald-400' },
  demo: { label: 'Demo data', dot: 'bg-amber-400' },
};

/** Sits on dark slate headers. Tells the attendee (and the judges) where the data is coming from. */
export default function DataStatusBadge({ status }: { status: DataStatus }) {
  const { label, dot } = STATUS[status];

  return (
    <span
      role="status"
      className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full bg-white/10 px-3 text-xs font-semibold text-white"
    >
      <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', dot)} />
      {label}
    </span>
  );
}
