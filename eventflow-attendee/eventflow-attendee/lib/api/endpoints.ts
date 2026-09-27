/**
 * One typed function per backend endpoint, parameterized by eventId.
 *
 * Fetchers throw when the backend is unreachable or returns something
 * unusable. `useApiResource` catches that and swaps in demo data, so no UI code
 * has to think about failure. `loadRoute` and `askAssistant` handle their own
 * fallback because they run on demand rather than through a hook.
 */

import type {
  AlertItem,
  AttendeeTicket,
  ChatMessage,
  Recommendation,
  RoutePlan,
  VenueMap,
  ZoneTelemetry,
} from '@/lib/types';
import { computeRoute } from '@/lib/wayfinding';
import { ApiError, apiFetch } from './client';
import { buildDemoAssistantReply } from './mock';
import {
  isRoutePlan,
  isVenueMap,
  normalizeAlerts,
  normalizeAssistantReply,
  normalizeRecommendations,
  normalizeTicket,
  normalizeZones,
} from './normalize';

/** Minimal shape returned by GET /api/v1/public/events, used for the event picker. */
export interface PublicEventSummary {
  id: string;
  name: string;
  description?: string;
  eventType?: string;
  venueName: string;
  venueAddress?: string;
  city: string;
  startDateTime: string;
  endDateTime?: string;
  status: string;
}

/** Per-event endpoint paths. Called fresh each time so eventId is never stale. */
export const eventEndpoints = (eventId: string) => ({
  eventDetail: `/api/v1/public/events/${eventId}`,
  zones: `/api/v1/public/events/${eventId}/telemetry`,
  ticket: `/api/v1/public/events/${eventId}/ticket`,
  recommendations: `/api/v1/public/events/${eventId}/recommendations`,
  alerts: `/api/v1/public/events/${eventId}/alerts`,
  facilities: `/api/v1/public/events/${eventId}/facilities`,
  // Not yet built on the backend — apiFetch will throw and callers fall back to demo data.
  venueMap: `/api/v1/public/events/${eventId}/map`,
  route: `/api/v1/public/events/${eventId}/navigation`,
});

/** Chat is NOT nested under /events/:eventId — eventId goes in the request body instead. */
const CHAT_ENDPOINT = '/api/v1/public/assistant/chat';
const EVENTS_LIST_ENDPOINT = '/api/v1/public/events';

function unexpected(name: string): ApiError {
  return new ApiError(`Unexpected ${name} response`);
}

/** List of published (non-DRAFT) events, for the event picker landing screen. */
export async function fetchEvents(): Promise<PublicEventSummary[]> {
  const raw = await apiFetch<{ events: PublicEventSummary[] }>(EVENTS_LIST_ENDPOINT);
  if (!raw || !Array.isArray(raw.events)) throw unexpected('events list');
  return raw.events;
}

export async function fetchZones(eventId: string): Promise<ZoneTelemetry[]> {
  const zones = normalizeZones(await apiFetch<unknown>(eventEndpoints(eventId).zones));
  if (!zones) throw unexpected('zones');
  return zones;
}

export async function fetchTicket(eventId: string): Promise<AttendeeTicket> {
  const ticket = normalizeTicket(await apiFetch<unknown>(eventEndpoints(eventId).ticket));
  if (!ticket) throw unexpected('ticket');
  return ticket;
}

export async function fetchRecommendations(eventId: string): Promise<Recommendation[]> {
  const recommendations = normalizeRecommendations(
    await apiFetch<unknown>(eventEndpoints(eventId).recommendations),
  );
  if (!recommendations) throw unexpected('recommendations');
  return recommendations;
}

export async function fetchAlerts(eventId: string): Promise<AlertItem[]> {
  const alerts = normalizeAlerts(await apiFetch<unknown>(eventEndpoints(eventId).alerts));
  if (!alerts) throw unexpected('alerts');
  return alerts;
}

export async function fetchVenueMap(eventId: string): Promise<VenueMap> {
  const map = await apiFetch<unknown>(eventEndpoints(eventId).venueMap);
  if (!isVenueMap(map)) throw unexpected('venue map');
  return map;
}

/** Asks the backend for a route; computes one locally from the map if that fails. */
export async function loadRoute(eventId: string, map: VenueMap, toZoneId: string): Promise<RoutePlan | null> {
  try {
    const plan = await apiFetch<unknown>(eventEndpoints(eventId).route, {
      query: { from: map.youAreHereNodeId, to: toZoneId },
    });
    if (isRoutePlan(plan)) return plan;
  } catch {
    // Backend offline or route not implemented yet: use the local route below.
  }
  return computeRoute(map, toZoneId);
}

export interface AskAssistantArgs {
  /** Event the attendee is currently viewing — sent in the request body, not the URL. */
  eventId: string;
  history: ChatMessage[];
  /** Latest crowd and alert data, used to ground the demo answer when offline. */
  zones: ZoneTelemetry[];
  alerts: AlertItem[];
  /** Carried across turns so the backend can keep one conversation thread per attendee. */
  sessionId?: string;
}

export interface AssistantResult {
  message: ChatMessage;
  source: 'live' | 'demo';
  /** Echoed back from the backend on a live reply; pass it into the next call's sessionId. */
  sessionId?: string;
}

const DEMO_REPLY_DELAY_MS = 700;

/** Never throws: falls back to a demo answer built from the data already on screen. */
export async function askAssistant({
  eventId,
  history,
  zones,
  alerts,
  sessionId,
}: AskAssistantArgs): Promise<AssistantResult> {
  const lastQuestion = [...history].reverse().find((entry) => entry.role === 'user')?.content ?? '';

  try {
    const raw = await apiFetch<{ sessionId: string; reply: string; timestamp: string }>(CHAT_ENDPOINT, {
      method: 'POST',
      // LLM responses are slower than telemetry, so allow more time.
      timeoutMs: 20_000,
      body: { eventId, message: lastQuestion, sessionId },
    });

    const message = normalizeAssistantReply(raw);
    if (message) return { message, source: 'live', sessionId: raw.sessionId };
  } catch {
    // Backend offline, or eventId missing: use the demo answer below.
  }

  await new Promise((resolve) => setTimeout(resolve, DEMO_REPLY_DELAY_MS));
  return { message: buildDemoAssistantReply(lastQuestion, zones, alerts), source: 'demo' };
}
