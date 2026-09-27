'use client';

import { useMemo, useState } from 'react';
import AlertCard from '@/components/user/AlertCard';
import PageHeader from '@/components/user/PageHeader';
import Skeleton from '@/components/user/Skeleton';
import { useAlerts } from '@/lib/hooks/useAttendeeData';
import { useNow } from '@/lib/hooks/useNow';
import { useSelectedEvent } from '@/lib/hooks/useSelectedEvent';
import type { AlertCategory } from '@/lib/types';
import { HIDE_SCROLLBAR, cn, isAlertActive, sortAlerts } from '@/lib/utils';

type AlertFilter = 'all' | AlertCategory;

const FILTERS: Array<{ id: AlertFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'route', label: 'Routes' },
  { id: 'crowd', label: 'Crowds' },
  { id: 'service', label: 'Services' },
];

export default function AlertsPage() {
  const { eventId } = useSelectedEvent();
  const alerts = useAlerts(eventId);
  const now = useNow(30_000);
  const [filter, setFilter] = useState<AlertFilter>('all');

  // Emergencies always sort first, then warnings, then info, newest first within each.
  const active = useMemo(
    () => sortAlerts(alerts.data.filter((alert) => isAlertActive(alert, now))),
    [alerts.data, now],
  );
  const visible = filter === 'all' ? active : active.filter((alert) => alert.category === filter);

  return (
    <>
      <PageHeader title="Alerts" subtitle="Route changes and safety notices" status={alerts.status} />

      <main className="space-y-4 px-4 py-4">
        <div
          role="group"
          aria-label="Filter alerts"
          className={cn('-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4', HIDE_SCROLLBAR)}
        >
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              className={cn(
                'min-h-[48px] shrink-0 touch-manipulation rounded-full px-5 text-sm font-semibold transition-colors',
                filter === id
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200 active:bg-slate-100',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {alerts.status === 'loading' ? (
          <div className="space-y-3">
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-3xl bg-white p-5 text-sm leading-relaxed text-slate-600 ring-1 ring-slate-200">
            {filter === 'all'
              ? 'No active alerts. Route changes and safety notices will appear here as soon as they are issued.'
              : 'Nothing in this category right now. Choose All to see every active alert.'}
          </div>
        ) : (
          <ul className="space-y-3" aria-live="polite">
            {visible.map((alert) => (
              <li key={alert.id}>
                <AlertCard alert={alert} now={now} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}