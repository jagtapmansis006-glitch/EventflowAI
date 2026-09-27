'use client';

import { useEffect, useRef } from 'react';
import { API_BASE_URL } from '@/lib/api/client';

/**
 * Event types the backend's realtimeManager can broadcast.
 * Keep this list in sync with backend/server/realtime.ts's RealtimeEventType.
 */
const REALTIME_EVENT_TYPES = [
  'crowd_status_updated',
  'alert_created',
  'alert_updated',
  'gate_status_changed',
  'route_updated',
  'incident_created',
  'event_status_changed',
  'queue_status_changed',
] as const;

export type RealtimeEventType = (typeof REALTIME_EVENT_TYPES)[number];

export type RealtimeHandler = (eventType: RealtimeEventType, data: unknown) => void;

/**
 * Subscribes to GET /api/v1/realtime/stream?eventId=... over SSE.
 *
 * No auth token is sent, so the backend assigns role 'ATTENDEE' automatically
 * (see realtimeRoutes.ts) and realtimeManager only forwards events scoped to
 * this eventId. Pass null/empty eventId to stay disconnected (e.g. before the
 * attendee has picked an event).
 *
 * Typical use: call refresh() on the matching useApiResource hook when a
 * relevant event type arrives, rather than trying to merge partial payloads:
 *
 *   const alerts = useAlerts(eventId);
 *   useRealtime(eventId, (type) => {
 *     if (type === 'alert_created' || type === 'alert_updated') alerts.refresh();
 *   });
 */
export function useRealtime(eventId: string | null, onMessage: RealtimeHandler): void {
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  });

  useEffect(() => {
    if (!eventId) return undefined;

    const url = `${API_BASE_URL}/api/v1/realtime/stream?eventId=${encodeURIComponent(eventId)}`;
    const source = new EventSource(url);

    const listeners = REALTIME_EVENT_TYPES.map((type) => {
      const handler = (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data);
          onMessageRef.current(type, parsed.data ?? parsed);
        } catch {
          // Malformed payload: ignore this message, keep the connection open.
        }
      };
      source.addEventListener(type, handler as EventListener);
      return { type, handler };
    });

    source.onerror = () => {
      // EventSource retries automatically; nothing to do here beyond letting
      // the browser handle reconnection.
    };

    return () => {
      listeners.forEach(({ type, handler }) => source.removeEventListener(type, handler as EventListener));
      source.close();
    };
  }, [eventId]);
}
