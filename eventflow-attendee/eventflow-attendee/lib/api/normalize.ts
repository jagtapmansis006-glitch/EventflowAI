import type {
  AlertItem,
  AttendeeTicket,
  ChatMessage,
  Recommendation,
  ZoneCategory,
  ZoneCrowdLevel,
  ZoneTelemetry,
  ZoneTrend,
} from '@/lib/types';

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function normalizeZones(raw: unknown): ZoneTelemetry[] | null {
  if (!raw) return null;
  const list = Array.isArray(raw) ? raw : (isObject(raw) && Array.isArray(raw.zones) ? raw.zones : null);
  if (!list) return null;

  // Allowed levels in ZoneRow: 'quiet' | 'moderate' | 'busy' | 'packed'
  const validLevels = ['quiet', 'moderate', 'busy', 'packed'];
  const validTrends = ['steady', 'filling-up', 'easing'];

  return list.map((item, idx) => {
    const obj = isObject(item) ? item : {};
    
    let level: ZoneCrowdLevel = 'moderate';
    const rawLevel = String(obj.crowdLevel || '').toLowerCase();
    if (validLevels.includes(rawLevel)) {
      level = rawLevel as ZoneCrowdLevel;
    } else if (rawLevel === 'low') {
      level = 'quiet';
    } else if (rawLevel === 'critical' || rawLevel === 'high') {
      level = 'packed';
    }

    let trend: ZoneTrend = 'steady';
    const rawTrend = String(obj.trend || '').toLowerCase();
    if (validTrends.includes(rawTrend)) {
      trend = rawTrend as ZoneTrend;
    }

    return {
      id: String(obj.id || `zone_${idx}`),
      name: String(obj.name || `Zone ${idx + 1}`),
      category: (obj.category as ZoneCategory) || 'entrance',
      crowdLevel: level,
      fillPercent: typeof obj.fillPercent === 'number' ? obj.fillPercent : 50,
      waitMinutes: typeof obj.waitMinutes === 'number' ? obj.waitMinutes : 5,
      trend: trend,
    };
  });
}

export function normalizeTicket(raw: unknown): AttendeeTicket | null {
  if (!raw) return null;
  const data = isObject(raw) && isObject(raw.ticket) ? raw.ticket : (isObject(raw) ? raw : null);
  if (!data) return null;

  return {
    eventName: String(data.eventName || 'Apex World Stadium Championship 2026'),
    venueName: String(data.venueName || 'Apex Grand Arena'),
    holderName: String(data.holderName || 'Aarav Mehta'),
    tier: String(data.tier || 'General Access'),
    gate: String(data.gate || 'Gate 1'),
    section: String(data.section || 'Arena Level 1'),
    seat: String(data.seat || 'Row C, 18'),
    entryCode: String(data.entryCode || 'EF-APEX-2026'),
    doorsOpenTime: String(data.doorsOpenTime || '6:30 PM'),
    eventStartTime: String(data.eventStartTime || '8:00 PM'),
  };
}

export function normalizeRecommendations(raw: unknown): Recommendation[] | null {
  if (!raw) return null;
  const list = Array.isArray(raw) ? raw : (isObject(raw) && Array.isArray(raw.recommendations) ? raw.recommendations : null);
  if (!list) return null;

  return list.map((item, idx) => {
    const obj = isObject(item) ? item : {};
    return {
      id: String(obj.id || `rec_${idx}`),
      title: String(obj.title || 'Entry Recommendation'),
      description: String(obj.description || 'Proceed to nearest gate.'),
      category: (obj.category as any) || 'gates',
      actionLabel: String(obj.actionLabel || 'View Map'),
    };
  });
}

/**
 * AlertCard (components/user/AlertCard.tsx) requires: id, title, severity,
 * message, category, issuedAt, and optionally actionHref/actionLabel.
 *
 * severity: AlertCard's SEVERITY_STYLE map only has keys 'emergency' |
 * 'warning' | 'info' (no 'critical'). If the backend's admin-side Alert
 * model sends 'CRITICAL' / 'WARNING' / 'INFO' (or any casing), an
 * unnormalized pass-through causes SEVERITY_STYLE[alert.severity] to be
 * undefined and AlertCard crashes on `style.card`. This maps case-
 * insensitively and folds 'critical'/'urgent' into 'emergency'.
 *
 * category / issuedAt / actionHref / actionLabel: the previous version of
 * this function didn't set these at all, so AlertCard rendered a blank
 * category badge and never showed an action button. Field names below
 * (obj.category, obj.issuedAt, obj.actionHref, obj.actionLabel) are a
 * best guess at the backend's Alert shape — confirm against an actual
 * /alerts response and adjust the obj.xxx lookups if the real field
 * names differ.
 */
export function normalizeAlerts(raw: unknown): AlertItem[] | null {
  if (!raw) return null;
  const list = Array.isArray(raw) ? raw : (isObject(raw) && Array.isArray(raw.alerts) ? raw.alerts : null);
  if (!list) return null;

  const validSeverities = ['emergency', 'warning', 'info'];
  const validCategories = ['emergency', 'route', 'crowd', 'service'];

  return list.map((item, idx) => {
    const obj = isObject(item) ? item : {};

    const rawSeverity = String(obj.severity || '').toLowerCase();
    let severity: AlertItem['severity'] = 'info';
    if (validSeverities.includes(rawSeverity)) {
      severity = rawSeverity as AlertItem['severity'];
    } else if (rawSeverity === 'critical' || rawSeverity === 'urgent') {
      severity = 'emergency';
    }

    const rawCategory = String(obj.category || '').toLowerCase();
    const category = (validCategories.includes(rawCategory) ? rawCategory : 'service') as AlertItem['category'];

    return {
      id: String(obj.id || `alert_${idx}`),
      title: String(obj.title || 'Operational Notice'),
      severity,
      category,
      message: String(obj.publicMessage || obj.message || 'Notice for all guests'),
      createdAt: String(obj.createdAt || new Date().toISOString()),
      issuedAt: String(obj.issuedAt || obj.createdAt || new Date().toISOString()),
      actionHref: typeof obj.actionHref === 'string' ? obj.actionHref : undefined,
      actionLabel: typeof obj.actionLabel === 'string' ? obj.actionLabel : undefined,
    };
  });
}

export function normalizeAssistantReply(raw: unknown): ChatMessage | null {
  if (!isObject(raw) || typeof raw.reply !== 'string') return null;
  return {
    id: `msg_${Date.now()}`,
    role: 'assistant',
    content: raw.reply,
    timestamp: typeof raw.timestamp === 'string' ? raw.timestamp : new Date().toISOString(),
  };
}

export function isVenueMap(raw: unknown): boolean {
  return isObject(raw) && Array.isArray(raw.nodes) && Array.isArray(raw.edges);
}

export function isRoutePlan(raw: unknown): boolean {
  return isObject(raw) && Array.isArray(raw.path) && typeof raw.distanceMeters === 'number';
}