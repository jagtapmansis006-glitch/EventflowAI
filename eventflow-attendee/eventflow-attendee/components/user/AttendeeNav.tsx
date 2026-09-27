import { useMemo, type ComponentType, type MouseEvent } from 'react';
import { useAlerts } from '@/lib/hooks/useAttendeeData';
import { useNow } from '@/lib/hooks/useNow';
import { usePathname, navigate } from '@/lib/hooks/usePathname';
import { useSelectedEvent } from '@/lib/hooks/useSelectedEvent';
import { cn, isAlertActive } from '@/lib/utils';
import { BellIcon, ChatIcon, HomeIcon, MapIcon } from './icons';

interface Tab {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
}

const TABS: Tab[] = [
  { href: '/user/home', label: 'Home', Icon: HomeIcon },
  { href: '/user/map', label: 'Map', Icon: MapIcon },
  { href: '/user/alerts', label: 'Alerts', Icon: BellIcon },
  { href: '/user/assistant', label: 'Assistant', Icon: ChatIcon },
];

/** Minimal inline icon so this doesn't depend on icons.tsx exporting one. */
function SwapIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
      <path d="M7 7h11l-3-3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 17H6l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AttendeeNav() {
  const pathname = usePathname() ?? '';
  const { eventId, clearEvent } = useSelectedEvent();
  const alerts = useAlerts(eventId);
  const now = useNow(60_000);

  const urgentCount = useMemo(() => {
    if (alerts.status === 'loading') return 0;
    return alerts.data.filter((alert) => alert.severity !== 'info' && isAlertActive(alert, now)).length;
  }, [alerts.data, alerts.status, now]);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    navigate(href);
  };

  const handleSwitchEvent = () => {
    // Returns to EventPicker (App.tsx renders it full-screen whenever eventId is null).
    clearEvent();
  };

  return (
    <>
      {/* Floating control to leave the current event, since nothing else in the
          shell exposes clearEvent(). Sits above the content, clear of the nav bar. */}
      <button
        type="button"
        onClick={handleSwitchEvent}
        aria-label="Switch event"
        className="fixed right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-40 mx-auto flex max-w-md touch-manipulation items-center gap-1.5 rounded-full bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-200 ring-1 ring-white/10 backdrop-blur transition-colors active:bg-slate-800"
      >
        <SwapIcon className="h-3.5 w-3.5" />
        Switch event
      </button>

      <nav
        aria-label="Attendee navigation"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md border-t border-slate-800 bg-slate-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md shadow-2xl shadow-black/80"
      >
        <ul className="grid grid-cols-4 items-center">
          {TABS.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const showBadge = href === '/user/alerts' && urgentCount > 0;

            return (
              <li key={href}>
                <a
                  href={href}
                  onClick={(e) => handleClick(e, href)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex h-16 min-h-[52px] touch-manipulation flex-col items-center justify-center py-2 px-1 text-xs font-semibold transition-all active:scale-95',
                    active ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200',
                  )}
                >
                  {active && (
                    <span aria-hidden="true" className="absolute top-0 h-1 w-12 rounded-b-full bg-sky-400 shadow-md shadow-sky-400/50" />
                  )}
                  <span className="relative flex items-center justify-center">
                    <Icon className="h-6 w-6 transition-transform group-hover:scale-110" />
                    {showBadge && (
                      <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-slate-900">
                        <span className="sr-only">{urgentCount} active alerts</span>
                        <span aria-hidden="true">{urgentCount}</span>
                      </span>
                    )}
                  </span>
                  <span className="mt-1 text-[11px] tracking-tight">{label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}