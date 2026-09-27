'use client';

import {
  fetchAlerts,
  fetchEvents,
  fetchRecommendations,
  fetchTicket,
  fetchVenueMap,
  fetchZones,
  type PublicEventSummary,
} from '@/lib/api/endpoints';
import {
  MOCK_ALERTS,
  MOCK_RECOMMENDATIONS,
  MOCK_TICKET,
  MOCK_VENUE_MAP,
  MOCK_ZONES,
  buildDemoRecommendations,
  buildDemoZones,
} from '@/lib/api/mock';
import type { AlertItem, AttendeeTicket, Recommendation, VenueMap, ZoneTelemetry } from '@/lib/types';
import { useApiResource, type ApiResource } from './useApiResource';

/**
 * List of published events, for the event picker landing screen.
 * Not event-scoped, so it keeps one fixed cache key.
 */
export function useEventsList(): ApiResource<PublicEventSummary[]> {
  return useApiResource('events-list', fetchEvents, {
    fallback: [],
    intervalMs: 30_000,
  });
}

/**
 * Live crowd levels per zone for one event. Offline, the numbers drift so the
 * demo feels alive. The cache key includes eventId so switching events never
 * shows another event's stale data.
 */
export function useZones(eventId: string | null): ApiResource<ZoneTelemetry[]> {
  return useApiResource(`zones:${eventId ?? 'none'}`, () => fetchZones(eventId as string), {
    fallback: MOCK_ZONES,
    demo: () => buildDemoZones(Date.now()),
    intervalMs: 10_000,
    enabled: Boolean(eventId),
  });
}

export function useTicket(eventId: string | null): ApiResource<AttendeeTicket> {
  return useApiResource(`ticket:${eventId ?? 'none'}`, () => fetchTicket(eventId as string), {
    fallback: MOCK_TICKET,
    enabled: Boolean(eventId),
  });
}

export function useRecommendations(eventId: string | null): ApiResource<Recommendation[]> {
  return useApiResource(`recommendations:${eventId ?? 'none'}`, () => fetchRecommendations(eventId as string), {
    fallback: MOCK_RECOMMENDATIONS,
    demo: () => buildDemoRecommendations(buildDemoZones(Date.now())),
    intervalMs: 20_000,
    enabled: Boolean(eventId),
  });
}

/** The nav badge and the Alerts page both call this, so they share one poll per event. */
export function useAlerts(eventId: string | null): ApiResource<AlertItem[]> {
  return useApiResource(`alerts:${eventId ?? 'none'}`, () => fetchAlerts(eventId as string), {
    fallback: MOCK_ALERTS,
    intervalMs: 15_000,
    enabled: Boolean(eventId),
  });
}

export function useVenueMap(eventId: string | null): ApiResource<VenueMap> {
  return useApiResource(`venue-map:${eventId ?? 'none'}`, () => fetchVenueMap(eventId as string), {
    fallback: MOCK_VENUE_MAP,
    enabled: Boolean(eventId),
  });
}
