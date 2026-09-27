'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { navigate } from './usePathname';

const STORAGE_KEY = 'eventflow.selectedEventId';

interface SelectedEventContextValue {
  eventId: string | null;
  /** Selects an event and routes into the attendee home screen for it. */
  selectEvent: (eventId: string) => void;
  /** Clears the selection and returns to the event picker. */
  clearEvent: () => void;
}

const SelectedEventContext = createContext<SelectedEventContextValue | null>(null);

export function SelectedEventProvider({ children }: { children: ReactNode }) {
  const [eventId, setEventId] = useState<string | null>(null);

  // Restore the last-selected event on load, so a refresh doesn't dump the
  // attendee back on the picker mid-event.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setEventId(stored);
    } catch {
      // localStorage unavailable (private browsing, etc.) — just start on the picker.
    }
  }, []);

  const selectEvent = useCallback((id: string) => {
    setEventId(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Non-fatal: state still updates for this session even if persistence fails.
    }
    navigate('/user/home');
  }, []);

  const clearEvent = useCallback(() => {
    setEventId(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Non-fatal.
    }
    navigate('/user/events');
  }, []);

  return (
    <SelectedEventContext.Provider value={{ eventId, selectEvent, clearEvent }}>
      {children}
    </SelectedEventContext.Provider>
  );
}

/** Reads the currently selected event and how to change it. Must be used under SelectedEventProvider. */
export function useSelectedEvent(): SelectedEventContextValue {
  const ctx = useContext(SelectedEventContext);
  if (!ctx) throw new Error('useSelectedEvent must be used within SelectedEventProvider');
  return ctx;
}