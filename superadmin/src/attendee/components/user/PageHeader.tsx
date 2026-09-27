import type { DataStatus } from '@/lib/hooks/useApiResource';
import { DISPLAY_FONT, cn } from '@/lib/utils';
import DataStatusBadge from './DataStatusBadge';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  status?: DataStatus;
}

/** Sticky dark slate header. Pads for the notch when installed as a PWA. */
export default function PageHeader({ title, subtitle, status }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] text-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className={cn(DISPLAY_FONT, 'text-2xl font-bold tracking-tight')}>{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-slate-300">{subtitle}</p>}
        </div>
        {status && <DataStatusBadge status={status} />}
      </div>
    </header>
  );
}
