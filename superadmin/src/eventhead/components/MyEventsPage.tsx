import React from 'react';
import { useEventAdmin } from '../context/EventAdminContext.tsx';
import { Calendar, MapPin, Lock, ArrowRight, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

export const MyEventsPage: React.FC = () => {
  const { session, myEvents, hasAssignment, assignedCount, selectEvent, canAccessEvent } = useEventAdmin();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-6 py-10">
      <div className="w-full max-w-4xl">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold tracking-wider text-blue-600 uppercase">Event Admin</div>
            <div className="text-xl font-bold text-slate-900">
              {session?.name ? `Welcome, ${session.name}` : 'Your Events'}
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-6">
          Select an event below to enter its Command Center.
        </p>

        {hasAssignment ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold px-4 py-3 mb-6">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Assigned to {assignedCount} event{assignedCount === 1 ? '' : 's'}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold px-4 py-3 mb-6">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Currently you have no assignment. Contact your Super Admin to be assigned to an event.</span>
          </div>
        )}

        <div className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3">
          {hasAssignment ? 'Your assigned events' : `All events managed by your company (${myEvents.length})`}
        </div>

        {myEvents.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
            No events exist in the system yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {myEvents.map((evt: any) => {
              const accessible = canAccessEvent(evt.id);
              return (
                <button
                  key={evt.id}
                  disabled={!accessible}
                  onClick={() => accessible && selectEvent(evt.id)}
                  className={`text-left rounded-2xl border p-5 transition ${
                    accessible
                      ? 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-md cursor-pointer'
                      : 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-slate-900 text-sm">{evt.name}</div>
                    {accessible ? (
                      <ArrowRight className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    )}
                  </div>
                  {evt.venueName && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{evt.venueName}{evt.city ? `, ${evt.city}` : ''}</span>
                    </div>
                  )}
                  {evt.startDateTime && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(evt.startDateTime).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="mt-3">
                    <span
                      className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                        evt.status === 'LIVE'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {evt.status}
                    </span>
                    {!accessible && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-slate-200 text-slate-500">
                        No access
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};