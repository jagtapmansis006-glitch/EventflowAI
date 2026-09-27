/**
 * Turns whatever the backend returns into the UI's types.
 *
 * - Accepts camelCase (Next.js) or snake_case (FastAPI/Pydantic defaults).
 * - Accepts a bare array or an envelope such as `{ "zones": [...] }`.
 * - Returns `null` for garbage so the caller can fall back to demo data
 *   instead of rendering a broken screen.
 */

import type {
  AlertCategory,
  AlertItem,
  AlertSeverity,
  AttendeeTicket,
  ChatMessage,
  ChatSource,
  CrowdLevel,
  Recommendation,
  RoutePlan,
  Trend,
  VenueMap,
  ZoneCategory,
  ZoneTelemetry,
} from '@/lib/types';
import { clamp, deriveLevel, uid } from '@/lib/utils';

/* -------------------------------- Primitives ------------------------------ */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** First non-null value among the given keys. */
function read(source: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim() !== '') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asEnum<T extends string>(value: unknown, allowed: readonly T[], aliases: Record<string, T> = {}): T | null {
  if (typeof value !== 'string') return null;
  const key = value.toLowerCase();
  const direct = allowed.find((candidate) => candidate === key);
  return direct ?? aliases[key] ?? null;
}

/**
 * Alert actions come from the backend, so only allow links that can't run
 * script: in-app paths and tel:, mailto: or https: URLs.
 */
function safeHref(value: string | null): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return /^(tel:|mailto:|https:\/\/)/i.test(value) ? value : undefined;
}

function unwrapList(raw: unknown, key: string): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (isRecord(raw) && Array.isArray(raw[key])) return raw[key] as unknown[];
  return null;
}

/* --------------------------------- Zones ---------------------------------- */

const LEVELS = ['low', 'moderate', 'high', 'critical'] as const;
const LEVEL_ALIASES: Record<string, CrowdLevel> = { medium: 'moderate', busy: 'high', packed: 'critical' };
const CATEGORIES = ['entrance', 'food', 'restroom', 'stage', 'service'] as const;
const CATEGORY_ALIASES: Record<string, ZoneCategory> = {
  gate: 'entrance',
  restrooms: 'restroom',
  toilet: 'restroom',
  concession: 'food',
  main: 'stage',
};
const TRENDS = ['rising', 'steady', 'falling'] as const;

function normalizeZone(item: unknown): ZoneTelemetry | null {
  if (!isRecord(item)) return null;

  const id = asString(read(item, 'id', 'zone_id', 'zoneId'));
  const name = asString(read(item, 'name', 'zone_name', 'zoneName'));
  const pct = asNumber(read(item, 'occupancyPct', 'occupancy_pct', 'occupancy'));
  if (!id || !name || pct === null) return null;

  const occupancyPct = Math.round(clamp(pct, 0, 100));
  return {
    id,
    name,
    category: asEnum<ZoneCategory>(read(item, 'category', 'type'), CATEGORIES, CATEGORY_ALIASES) ?? 'service',
    occupancyPct,
    level: asEnum<CrowdLevel>(read(item, 'level', 'crowd_level', 'crowdLevel'), LEVELS, LEVEL_ALIASES) ?? deriveLevel(occupancyPct),
    trend: asEnum<Trend>(read(item, 'trend'), TRENDS) ?? 'steady',
    waitMinutes: asNumber(read(item, 'waitMinutes', 'wait_minutes', 'wait')),
    updatedAt: asString(read(item, 'updatedAt', 'updated_at', 'timestamp')) ?? new Date().toISOString(),
  };
}

export function normalizeZones(raw: unknown): ZoneTelemetry[] | null {
  const list = unwrapList(raw, 'zones');
  if (!list) return null;
  return list.flatMap((item) => {
    const zone = normalizeZone(item);
    return zone ? [zone] : [];
  });
}

/* --------------------------------- Alerts --------------------------------- */

const SEVERITIES = ['emergency', 'warning', 'info'] as const;
const SEVERITY_ALIASES: Record<string, AlertSeverity> = {
  critical: 'emergency',
  high: 'warning',
  medium: 'warning',
  low: 'info',
};
const ALERT_CATEGORIES = ['emergency', 'route', 'crowd', 'service'] as const;

function normalizeAlert(item: unknown, index: number): AlertItem | null {
  if (!isRecord(item)) return null;

  const title = asString(read(item, 'title', 'headline'));
  const message = asString(read(item, 'message', 'body', 'description'));
  if (!title || !message) return null;

  const severity = asEnum<AlertSeverity>(read(item, 'severity', 'level'), SEVERITIES, SEVERITY_ALIASES) ?? 'info';
  return {
    id: asString(read(item, 'id', 'alert_id', 'alertId')) ?? `alert-${index}`,
    severity,
    category: asEnum<AlertCategory>(read(item, 'category', 'type'), ALERT_CATEGORIES) ?? (severity === 'emergency' ? 'emergency' : 'service'),
    title,
    message,
    issuedAt: asString(read(item, 'issuedAt', 'issued_at', 'created_at', 'timestamp')) ?? new Date().toISOString(),
    expiresAt: asString(read(item, 'expiresAt', 'expires_at')),
    zoneId: asString(read(item, 'zoneId', 'zone_id')),
    actionLabel: asString(read(item, 'actionLabel', 'action_label')) ?? undefined,
    actionHref: safeHref(asString(read(item, 'actionHref', 'action_href', 'action_url'))),
  };
}

export function normalizeAlerts(raw: unknown): AlertItem[] | null {
  const list = unwrapList(raw, 'alerts');
  if (!list) return null;
  return list.flatMap((item, index) => {
    const alert = normalizeAlert(item, index);
    return alert ? [alert] : [];
  });
}

/* ----------------------------- Recommendations ---------------------------- */

const REC_KINDS = ['food', 'restroom', 'route', 'exit', 'service'] as const;

function normalizeRecommendation(item: unknown, index: number): Recommendation | null {
  if (!isRecord(item)) return null;

  const title = asString(read(item, 'title', 'headline'));
  const detail = asString(read(item, 'detail', 'description', 'reason', 'message'));
  if (!title || !detail) return null;

  return {
    id: asString(read(item, 'id')) ?? `rec-${index}`,
    kind: asEnum<Recommendation['kind']>(read(item, 'kind', 'type', 'category'), REC_KINDS) ?? 'route',
    title,
    detail,
    zoneId: asString(read(item, 'zoneId', 'zone_id')) ?? undefined,
  };
}

export function normalizeRecommendations(raw: unknown): Recommendation[] | null {
  const list = unwrapList(raw, 'recommendations');
  if (!list) return null;
  return list.flatMap((item, index) => {
    const rec = normalizeRecommendation(item, index);
    return rec ? [rec] : [];
  });
}

/* --------------------------------- Ticket --------------------------------- */

export function normalizeTicket(raw: unknown): AttendeeTicket | null {
  const source = isRecord(raw) && isRecord(raw.ticket) ? raw.ticket : raw;
  if (!isRecord(source)) return null;

  const holderName = asString(read(source, 'holderName', 'holder_name', 'name', 'attendee_name'));
  const eventName = asString(read(source, 'eventName', 'event_name', 'event'));
  if (!holderName || !eventName) return null;

  const now = new Date().toISOString();
  return {
    id: asString(read(source, 'id', 'ticket_id', 'ticketId')) ?? 'ticket',
    holderName,
    eventName,
    venueName: asString(read(source, 'venueName', 'venue_name', 'venue')) ?? '',
    tier: asString(read(source, 'tier', 'ticket_type')) ?? 'General admission',
    gate: asString(read(source, 'gate')) ?? '–',
    section: asString(read(source, 'section')) ?? '–',
    seat: asString(read(source, 'seat')) ?? '–',
    doorsOpenAt: asString(read(source, 'doorsOpenAt', 'doors_open_at', 'doors')) ?? now,
    startsAt: asString(read(source, 'startsAt', 'starts_at', 'start_time')) ?? now,
    entryCode: asString(read(source, 'entryCode', 'entry_code', 'barcode')) ?? '–',
    seatZoneId: asString(read(source, 'seatZoneId', 'seat_zone_id')) ?? undefined,
  };
}

/* ------------------------------ Map and routes ---------------------------- */

/** The map and route endpoints must return camelCase JSON in the shape of `VenueMap` / `RoutePlan`. */
export function isVenueMap(raw: unknown): raw is VenueMap {
  return (
    isRecord(raw) &&
    isRecord(raw.viewBox) &&
    typeof raw.metersPerUnit === 'number' &&
    typeof raw.youAreHereNodeId === 'string' &&
    Array.isArray(raw.zones) &&
    Array.isArray(raw.nodes) &&
    Array.isArray(raw.edges)
  );
}

export function isRoutePlan(raw: unknown): raw is RoutePlan {
  return (
    isRecord(raw) &&
    typeof raw.toZoneId === 'string' &&
    Array.isArray(raw.points) &&
    raw.points.length > 1 &&
    Array.isArray(raw.steps) &&
    typeof raw.totalMinutes === 'number' &&
    typeof raw.totalMeters === 'number'
  );
}

/* ---------------------------------- Chat ---------------------------------- */

const SOURCE_KINDS = ['zone', 'alert', 'map', 'schedule'] as const;

function normalizeSources(raw: unknown): ChatSource[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!isRecord(item)) return [];
    const label = asString(read(item, 'label', 'title', 'name'));
    if (!label) return [];
    return [
      {
        label,
        kind: asEnum<ChatSource['kind']>(read(item, 'kind', 'type'), SOURCE_KINDS) ?? 'map',
        id: asString(read(item, 'id', 'zone_id', 'zoneId')) ?? undefined,
      },
    ];
  });
}

/** Accepts `{ message: { content } }`, `{ reply }`, `{ answer }` or `{ content }`. */
export function normalizeAssistantReply(raw: unknown): ChatMessage | null {
  if (!isRecord(raw)) return null;

  const nested = isRecord(raw.message) ? raw.message : raw;
  const content =
    asString(read(nested, 'content', 'reply', 'answer', 'text')) ?? asString(read(raw, 'reply', 'answer', 'text'));
  if (!content) return null;

  return {
    id: asString(read(nested, 'id')) ?? uid(),
    role: 'assistant',
    content,
    createdAt: new Date().toISOString(),
    sources: normalizeSources(read(nested, 'sources', 'citations') ?? read(raw, 'sources', 'citations')),
  };
}
