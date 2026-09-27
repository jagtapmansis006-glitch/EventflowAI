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

export default function AttendeeNav() {
  const pathname = usePathname() ?? '';
  const { eventId } = useSelectedEvent();
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

  return (
    <nav
      aria-label="Attendee navigation"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-white/10 bg-slate-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="grid grid-cols-4">
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
                  'relative flex h-16 min-h-[48px] touch-manipulation flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors active:bg-white/5',
                  active ? 'text-sky-500' : 'text-slate-400',
                )}
              >
                {active && (
                  <span aria-hidden="true" className="absolute top-0 h-1 w-10 rounded-b-full bg-sky-500" />
                )}
                <span className="relative">
                  <Icon className="h-6 w-6" />
                  {showBadge && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                      <span className="sr-only">{urgentCount} active alerts</span>
                      <span aria-hidden="true">{urgentCount}</span>
                    </span>
                  )}
                </span>
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}