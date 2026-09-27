import { Link } from '@/lib/navigation';
import type { AttendeeTicket } from '@/lib/types';
import { DISPLAY_FONT, cn, formatClock } from '@/lib/utils';
import { NavigationIcon } from './icons';

/** Boarding-pass style summary. The notches in the divider echo a torn ticket stub. */
export default function TicketCard({ ticket }: { ticket: AttendeeTicket }) {
  const details = [
    { label: 'Gate', value: ticket.gate },
    { label: 'Section', value: ticket.section },
    { label: 'Seat', value: ticket.seat },
  ];

  return (
    <article
      aria-label="Your ticket"
      className="rounded-3xl bg-white shadow-xl shadow-slate-900/20 ring-1 ring-slate-200"
    >
      <div className="px-5 pt-5">
        <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-blue-700">
          {ticket.tier}
        </span>
        <p className="mt-3 text-sm text-slate-500">{ticket.venueName}</p>
        <p className="text-lg font-semibold text-slate-900">{ticket.holderName}</p>
      </div>

      <dl className="grid grid-cols-3 gap-3 px-5 py-5">
        {details.map(({ label, value }) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs font-medium text-slate-500">{label}</dt>
            <dd className={cn(DISPLAY_FONT, 'truncate text-xl font-bold text-slate-900')}>{value}</dd>
          </div>
        ))}
      </dl>

      <div aria-hidden="true" className="relative h-6">
        <div className="absolute -left-3 top-0 h-6 w-6 rounded-full bg-slate-50" />
        <div className="absolute -right-3 top-0 h-6 w-6 rounded-full bg-slate-50" />
        <div className="absolute inset-x-6 top-1/2 border-t-2 border-dashed border-slate-200" />
      </div>

      <div className="flex items-end justify-between gap-4 px-5 pb-4 pt-2">
        <div>
          <p className="text-xs font-medium text-slate-500">Entry code</p>
          <p className="text-base font-bold tracking-wider text-slate-900">{ticket.entryCode}</p>
        </div>
        <div className="text-right text-sm text-slate-600">
          <p>Doors {formatClock(ticket.doorsOpenAt)}</p>
          <p>Show {formatClock(ticket.startsAt)}</p>
        </div>
      </div>

      <div className="px-5 pb-5">
        <Link
          href={`/user/map?zone=${ticket.seatZoneId ?? 'main-floor'}`}
          className="flex min-h-[48px] w-full touch-manipulation items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-semibold text-white transition-colors active:bg-blue-700"
        >
          <NavigationIcon className="h-5 w-5" />
          Route to my seat
        </Link>
      </div>
    </article>
  );
}
