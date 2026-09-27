/**
 * One typed function per backend endpoint.
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

export const ENDPOINTS = {
  zones: '/api/telemetry/zones',
  ticket: '/api/attendee/ticket',
  recommendations: '/api/recommendations',
  alerts: '/api/alerts',
  venueMap: '/api/venue/map',
  route: '/api/navigation/route',
  chat: '/api/assistant/chat',
} as const;

function unexpected(name: string): ApiError {
  return new ApiError(`Unexpected ${name} response`);
}

export async function fetchZones(): Promise<ZoneTelemetry[]> {
  const zones = normalizeZones(await apiFetch<unknown>(ENDPOINTS.zones));
  if (!zones) throw unexpected('zones');
  return zones;
}

export async function fetchTicket(): Promise<AttendeeTicket> {
  const ticket = normalizeTicket(await apiFetch<unknown>(ENDPOINTS.ticket));
  if (!ticket) throw unexpected('ticket');
  return ticket;
}

export async function fetchRecommendations(): Promise<Recommendation[]> {
  const recommendations = normalizeRecommendations(await apiFetch<unknown>(ENDPOINTS.recommendations));
  if (!recommendations) throw unexpected('recommendations');
  return recommendations;
}

export async function fetchAlerts(): Promise<AlertItem[]> {
  const alerts = normalizeAlerts(await apiFetch<unknown>(ENDPOINTS.alerts));
  if (!alerts) throw unexpected('alerts');
  return alerts;
}

export async function fetchVenueMap(): Promise<VenueMap> {
  const map = await apiFetch<unknown>(ENDPOINTS.venueMap);
  if (!isVenueMap(map)) throw unexpected('venue map');
  return map;
}

/** Asks the backend for a route; computes one locally from the map if that fails. */
export async function loadRoute(map: VenueMap, toZoneId: string): Promise<RoutePlan | null> {
  try {
    const plan = await apiFetch<unknown>(ENDPOINTS.route, {
      query: { from: map.youAreHereNodeId, to: toZoneId },
    });
    if (isRoutePlan(plan)) return plan;
  } catch {
    // Backend offline: use the local route below.
  }
  return computeRoute(map, toZoneId);
}

export interface AskAssistantArgs {
  history: ChatMessage[];
  /** Latest crowd and alert data, used to ground the demo answer when offline. */
  zones: ZoneTelemetry[];
  alerts: AlertItem[];
}

export interface AssistantResult {
  message: ChatMessage;
  source: 'live' | 'demo';
}

const DEMO_REPLY_DELAY_MS = 700;

/** Never throws: falls back to a demo answer built from the data already on screen. */
export async function askAssistant({ history, zones, alerts }: AskAssistantArgs): Promise<AssistantResult> {
  try {
    const raw = await apiFetch<unknown>(ENDPOINTS.chat, {
      method: 'POST',
      // LLM responses are slower than telemetry, so allow more time.
      timeoutMs: 20_000,
      body: { messages: history.map(({ role, content }) => ({ role, content })) },
    });
    const message = normalizeAssistantReply(raw);
    if (message) return { message, source: 'live' };
  } catch {
    // Backend offline: use the demo answer below.
  }

  const lastQuestion = [...history].reverse().find((entry) => entry.role === 'user')?.content ?? '';
  await new Promise((resolve) => setTimeout(resolve, DEMO_REPLY_DELAY_MS));
  return { message: buildDemoAssistantReply(lastQuestion, zones, alerts), source: 'demo' };
}
