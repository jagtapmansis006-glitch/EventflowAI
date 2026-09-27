import { Link } from '@/lib/navigation';
import type { AlertCategory, AlertItem, AlertSeverity } from '@/lib/types';
import { DISPLAY_FONT, cn, formatRelative } from '@/lib/utils';
import { AlertTriangleIcon, ArrowRightIcon, InfoIcon, PhoneIcon } from './icons';

const CATEGORY_LABEL: Record<AlertCategory, string> = {
  emergency: 'Emergency',
  route: 'Route',
  crowd: 'Crowd',
  service: 'Service',
};

interface SeverityStyle {
  card: string;
  icon: string;
  meta: string;
  body: string;
  action: string;
}

const SEVERITY_STYLE: Record<AlertSeverity, SeverityStyle> = {
  emergency: {
    card: 'bg-rose-700 text-white ring-rose-800',
    icon: 'bg-white/15 text-white',
    meta: 'text-rose-100',
    body: 'text-white',
    action: 'bg-white text-rose-700 active:bg-rose-50',
  },
  warning: {
    card: 'bg-amber-50 text-slate-900 ring-amber-300',
    icon: 'bg-amber-200 text-amber-900',
    meta: 'text-amber-900',
    body: 'text-slate-700',
    action: 'bg-slate-900 text-white active:bg-slate-800',
  },
  info: {
    card: 'bg-white text-slate-900 ring-slate-200',
    icon: 'bg-sky-100 text-blue-700',
    meta: 'text-slate-500',
    body: 'text-slate-600',
    action: 'bg-slate-900 text-white active:bg-slate-800',
  },
};

interface AlertCardProps {
  alert: AlertItem;
  now: number;
}

export default function AlertCard({ alert, now }: AlertCardProps) {
  const style = SEVERITY_STYLE[alert.severity];
  const isPhone = alert.actionHref?.startsWith('tel:') ?? false;
  const isInternal = alert.actionHref?.startsWith('/') ?? false;
  const ActionIcon = isPhone ? PhoneIcon : ArrowRightIcon;
  const Icon = alert.severity === 'info' ? InfoIcon : AlertTriangleIcon;

  const actionClass = cn(
    'mt-4 flex min-h-[48px] w-full touch-manipulation items-center justify-center gap-2 rounded-2xl px-5 font-semibold transition-colors',
    style.action,
  );
  const actionContent = (
    <>
      <ActionIcon className="h-5 w-5" />
      {alert.actionLabel}
    </>
  );

  return (
    <article
      aria-label={`${CATEGORY_LABEL[alert.category]} alert: ${alert.title}`}
      className={cn('rounded-3xl p-4 shadow-sm ring-1', style.card)}
    >
      <div className="flex gap-3">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', style.icon)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className={cn('flex items-center justify-between gap-2 text-xs font-semibold', style.meta)}>
            <span>{CATEGORY_LABEL[alert.category]}</span>
            <span>{formatRelative(alert.issuedAt, now)}</span>
          </div>
          <h2 className={cn(DISPLAY_FONT, 'mt-1 text-lg font-bold leading-snug')}>{alert.title}</h2>
          <p className={cn('mt-1 text-[15px] leading-relaxed', style.body)}>{alert.message}</p>
        </div>
      </div>

      {alert.actionHref && alert.actionLabel && (isInternal ? (
        <Link href={alert.actionHref} className={actionClass}>
          {actionContent}
        </Link>
      ) : (
        <a href={alert.actionHref} className={actionClass}>
          {actionContent}
        </a>
      ))}
    </article>
  );
}
