'use client';

import { Link, usePathname } from '@/lib/navigation';
import { useMemo, type ComponentType } from 'react';
import { useAlerts } from '@/lib/hooks/useAttendeeData';
import { useNow } from '@/lib/hooks/useNow';
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

/**
 * Fixed bottom tab bar. Height is 4rem plus the home-indicator inset, which
 * `app/user/layout.tsx` exposes as `--nav-h` so pages can stack above it.
 */
export default function AttendeeNav() {
  const pathname = usePathname() ?? '';
  const alerts = useAlerts();
  const now = useNow(60_000);

  const urgentCount = useMemo(() => {
    if (alerts.status === 'loading') return 0;
    return alerts.data.filter((alert) => alert.severity !== 'info' && isAlertActive(alert, now)).length;
  }, [alerts.data, alerts.status, now]);

  return (
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
              <Link
                href={href}
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
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
