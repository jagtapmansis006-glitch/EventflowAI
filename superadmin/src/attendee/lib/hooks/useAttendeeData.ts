'use client';

import {
  fetchAlerts,
  fetchRecommendations,
  fetchTicket,
  fetchVenueMap,
  fetchZones,
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

/** Live crowd levels per zone. Offline, the numbers drift so the demo feels alive. */
export function useZones(): ApiResource<ZoneTelemetry[]> {
  return useApiResource('zones', fetchZones, {
    fallback: MOCK_ZONES,
    demo: () => buildDemoZones(Date.now()),
    intervalMs: 10_000,
  });
}

export function useTicket(): ApiResource<AttendeeTicket> {
  return useApiResource('ticket', fetchTicket, { fallback: MOCK_TICKET });
}

export function useRecommendations(): ApiResource<Recommendation[]> {
  return useApiResource('recommendations', fetchRecommendations, {
    fallback: MOCK_RECOMMENDATIONS,
    demo: () => buildDemoRecommendations(buildDemoZones(Date.now())),
    intervalMs: 20_000,
  });
}

/** The nav badge and the Alerts page both call this, so they share one poll. */
export function useAlerts(): ApiResource<AlertItem[]> {
  return useApiResource('alerts', fetchAlerts, {
    fallback: MOCK_ALERTS,
    intervalMs: 15_000,
  });
}

export function useVenueMap(): ApiResource<VenueMap> {
  return useApiResource('venue-map', fetchVenueMap, { fallback: MOCK_VENUE_MAP });
}
