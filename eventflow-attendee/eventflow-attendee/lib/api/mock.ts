/**
 * Demo data for the attendee portal.
 *
 * Everything here renders when the backend is unreachable, so it should feel
 * like a real event: crowd numbers drift over time, recommendations are derived
 * from the current crowd data, and the assistant answers from that same data.
 */

import type {
  AlertItem,
  AttendeeTicket,
  ChatMessage,
  ChatSource,
  Recommendation,
  Trend,
  VenueMap,
  ZoneCategory,
  ZoneTelemetry,
} from '@/lib/types';
import { LEVEL_META, clamp, deriveLevel, isAlertActive, sortAlerts, uid } from '@/lib/utils';

const minutesAgo = (minutes: number): string => new Date(Date.now() - minutes * 60_000).toISOString();

const todayAt = (hours: number, minutes = 0): string => {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

/* --------------------------------- Zones ---------------------------------- */

interface ZoneSeed {
  id: string;
  name: string;
  category: ZoneCategory;
  base: number;
  wait: number | null;
  trend: Trend;
}

const ZONE_SEEDS: ZoneSeed[] = [
  { id: 'gate-a', name: 'Gate A', category: 'entrance', base: 72, wait: 9, trend: 'rising' },
  { id: 'gate-b', name: 'Gate B', category: 'entrance', base: 36, wait: 3, trend: 'steady' },
  { id: 'main-floor', name: 'Main floor', category: 'stage', base: 81, wait: null, trend: 'rising' },
  { id: 'food-west', name: 'Food court west', category: 'food', base: 91, wait: 18, trend: 'rising' },
  { id: 'food-east', name: 'Food court east', category: 'food', base: 47, wait: 6, trend: 'steady' },
  { id: 'restrooms-west', name: 'Restrooms west', category: 'restroom', base: 63, wait: 5, trend: 'steady' },
  { id: 'restrooms-east', name: 'Restrooms east', category: 'restroom', base: 28, wait: 2, trend: 'falling' },
  { id: 'merch', name: 'Merch stand', category: 'service', base: 55, wait: 7, trend: 'steady' },
  { id: 'first-aid', name: 'First aid', category: 'service', base: 12, wait: 0, trend: 'steady' },
];

/**
 * Builds zone telemetry. Pass `null` for a fixed snapshot (used as the initial
 * value so server and client render identically); pass a timestamp for values
 * that drift slowly, which makes offline demos look live.
 */
export function buildDemoZones(now: number | null = null): ZoneTelemetry[] {
  const timestamp = new Date(now ?? Date.now()).toISOString();

  return ZONE_SEEDS.map((seed, index) => {
    const phase = now === null ? 0 : now / 25_000 + index * 1.7;
    const occupancyPct = Math.round(clamp(seed.base + Math.sin(phase) * 9, 2, 99));
    const slope = Math.cos(phase);
    const trend: Trend = now === null ? seed.trend : slope > 0.4 ? 'rising' : slope < -0.4 ? 'falling' : 'steady';

    return {
      id: seed.id,
      name: seed.name,
      category: seed.category,
      occupancyPct,
      level: deriveLevel(occupancyPct),
      trend,
      waitMinutes: seed.wait === null ? null : Math.max(0, Math.round(seed.wait * (occupancyPct / seed.base))),
      updatedAt: timestamp,
    };
  });
}

export const MOCK_ZONES: ZoneTelemetry[] = buildDemoZones(null);

/* --------------------------------- Ticket --------------------------------- */

export const MOCK_TICKET: AttendeeTicket = {
  id: 'demo-ticket',
  holderName: 'Aarav Mehta',
  eventName: 'Skyline Music Festival',
  venueName: 'Riverside Arena',
  tier: 'Floor access',
  gate: 'A',
  section: 'Floor 2',
  seat: 'Row F, 14',
  doorsOpenAt: todayAt(18, 30),
  startsAt: todayAt(20, 0),
  entryCode: 'EF-8K4Q-2291',
  seatZoneId: 'main-floor',
};

/* ---------------------------------- Alerts -------------------------------- */

export const MOCK_ALERTS: AlertItem[] = [
  {
    id: 'alert-1',
    severity: 'emergency',
    category: 'emergency',
    title: 'Keep the west aisle clear',
    message:
      'A medical team is responding near Food court west. Use the east concourse to reach restrooms and food, and follow staff directions.',
    issuedAt: minutesAgo(3),
    zoneId: 'food-west',
    actionLabel: 'Call emergency services',
    actionHref: 'tel:112',
  },
  {
    id: 'alert-2',
    severity: 'warning',
    category: 'route',
    title: 'Gate A is congested',
    message: 'Entry is taking about 9 minutes. Gate B is quicker at about 3 minutes.',
    issuedAt: minutesAgo(6),
    zoneId: 'gate-a',
    actionLabel: 'Route to Gate B',
    actionHref: '/user/map?zone=gate-b',
  },
  {
    id: 'alert-3',
    severity: 'warning',
    category: 'crowd',
    title: 'Food court west is packed',
    message: 'Lines are around 18 minutes. Food court east is quieter right now.',
    issuedAt: minutesAgo(11),
    zoneId: 'food-west',
    actionLabel: 'Route to Food court east',
    actionHref: '/user/map?zone=food-east',
  },
  {
    id: 'alert-4',
    severity: 'info',
    category: 'route',
    title: 'Step-free route open',
    message: 'The lift beside Gate B is working. Follow the blue floor signs to the main floor.',
    issuedAt: minutesAgo(38),
    zoneId: 'gate-b',
  },
  {
    id: 'alert-5',
    severity: 'info',
    category: 'service',
    title: 'Free water refill points',
    message: 'Refill stations are open at both food courts. Bring an empty bottle.',
    issuedAt: minutesAgo(54),
  },
];

/* ---------------------------- Recommendations ----------------------------- */

const waitOf = (zone: ZoneTelemetry): number => zone.waitMinutes ?? Number.POSITIVE_INFINITY;

function byCategory(zones: ZoneTelemetry[], category: ZoneCategory): ZoneTelemetry[] {
  return zones.filter((zone) => zone.category === category);
}

function shortestWait(zones: ZoneTelemetry[]): ZoneTelemetry[] {
  return [...zones].sort((a, b) => waitOf(a) - waitOf(b) || a.occupancyPct - b.occupancyPct);
}

export function buildDemoRecommendations(zones: ZoneTelemetry[]): Recommendation[] {
  const recommendations: Recommendation[] = [];

  const food = shortestWait(byCategory(zones, 'food'));
  if (food[0]) {
    const other = food[food.length - 1];
    recommendations.push({
      id: 'rec-food',
      kind: 'food',
      title: `Eat at ${food[0].name}`,
      detail:
        food.length > 1 && other.waitMinutes !== null
          ? `About ${food[0].waitMinutes ?? 0} min wait. ${other.name} is at ${other.waitMinutes} min.`
          : `About ${food[0].waitMinutes ?? 0} min wait right now.`,
      zoneId: food[0].id,
    });
  }

  const gates = shortestWait(byCategory(zones, 'entrance'));
  if (gates[0]) {
    const other = gates[gates.length - 1];
    recommendations.push({
      id: 'rec-gate',
      kind: 'exit',
      title: `Use ${gates[0].name}`,
      detail:
        gates.length > 1
          ? `About ${gates[0].waitMinutes ?? 0} min to get through. ${other.name} is at ${other.waitMinutes ?? 0} min.`
          : `About ${gates[0].waitMinutes ?? 0} min to get through.`,
      zoneId: gates[0].id,
    });
  }

  const restrooms = [...byCategory(zones, 'restroom')].sort((a, b) => a.occupancyPct - b.occupancyPct);
  if (restrooms[0]) {
    recommendations.push({
      id: 'rec-restroom',
      kind: 'restroom',
      title: `Try ${restrooms[0].name}`,
      detail: `${LEVEL_META[restrooms[0].level].label} at ${restrooms[0].occupancyPct}% full, the quietest restrooms right now.`,
      zoneId: restrooms[0].id,
    });
  }

  return recommendations;
}

export const MOCK_RECOMMENDATIONS: Recommendation[] = buildDemoRecommendations(MOCK_ZONES);

/* ------------------------------- Venue map -------------------------------- */

/**
 * A simple schematic. Corridors are the `edges` between `nodes`; each zone
 * hangs off one corridor node (`anchorNodeId`). Nodes are placed so that the
 * final stretch of a route runs straight into the zone's centre.
 */
export const MOCK_VENUE_MAP: VenueMap = {
  viewBox: { width: 360, height: 480 },
  metersPerUnit: 0.6,
  youAreHereNodeId: 'n-gate-a',
  zones: [
    { zoneId: 'gate-a', name: 'Gate A', category: 'entrance', x: 130, y: 16, width: 100, height: 44, anchorNodeId: 'n-gate-a' },
    { zoneId: 'merch', name: 'Merch stand', category: 'service', x: 12, y: 16, width: 98, height: 44, anchorNodeId: 'n-merch' },
    { zoneId: 'first-aid', name: 'First aid', category: 'service', x: 250, y: 16, width: 98, height: 44, anchorNodeId: 'n-aid' },
    { zoneId: 'food-west', name: 'Food court west', category: 'food', x: 12, y: 130, width: 64, height: 90, anchorNodeId: 'n-w-food' },
    { zoneId: 'restrooms-west', name: 'Restrooms west', category: 'restroom', x: 12, y: 240, width: 64, height: 90, anchorNodeId: 'n-w-rest' },
    { zoneId: 'food-east', name: 'Food court east', category: 'food', x: 284, y: 130, width: 64, height: 90, anchorNodeId: 'n-e-food' },
    { zoneId: 'restrooms-east', name: 'Restrooms east', category: 'restroom', x: 284, y: 240, width: 64, height: 90, anchorNodeId: 'n-e-rest' },
    { zoneId: 'main-floor', name: 'Main floor', category: 'stage', x: 104, y: 140, width: 152, height: 200, anchorNodeId: 'n-floor' },
    { zoneId: 'gate-b', name: 'Gate B', category: 'entrance', x: 130, y: 420, width: 100, height: 44, anchorNodeId: 'n-gate-b' },
  ],
  nodes: [
    { id: 'n-gate-a', x: 180, y: 78, label: 'Gate A' },
    { id: 'n-top', x: 180, y: 100, label: 'the north concourse' },
    { id: 'n-merch', x: 61, y: 100, label: 'the merch corner' },
    { id: 'n-tl', x: 90, y: 100, label: 'the north-west corner' },
    { id: 'n-tr', x: 270, y: 100, label: 'the north-east corner' },
    { id: 'n-aid', x: 299, y: 100, label: 'the first aid corner' },
    { id: 'n-w-food', x: 90, y: 175, label: 'the west concourse' },
    { id: 'n-w-rest', x: 90, y: 285, label: 'the west concourse' },
    { id: 'n-e-food', x: 270, y: 175, label: 'the east concourse' },
    { id: 'n-e-rest', x: 270, y: 285, label: 'the east concourse' },
    { id: 'n-bl', x: 90, y: 380, label: 'the south-west corner' },
    { id: 'n-br', x: 270, y: 380, label: 'the south-east corner' },
    { id: 'n-bot', x: 180, y: 380, label: 'the south concourse' },
    { id: 'n-gate-b', x: 180, y: 398, label: 'Gate B' },
    { id: 'n-floor', x: 180, y: 140, label: 'the main floor entrance' },
  ],
  edges: [
    { from: 'n-gate-a', to: 'n-top' },
    { from: 'n-top', to: 'n-tl' },
    { from: 'n-top', to: 'n-tr' },
    { from: 'n-top', to: 'n-floor' },
    { from: 'n-tl', to: 'n-merch' },
    { from: 'n-tr', to: 'n-aid' },
    { from: 'n-tl', to: 'n-w-food' },
    { from: 'n-w-food', to: 'n-w-rest' },
    { from: 'n-w-rest', to: 'n-bl' },
    { from: 'n-bl', to: 'n-bot' },
    { from: 'n-bot', to: 'n-br' },
    { from: 'n-bot', to: 'n-gate-b' },
    { from: 'n-br', to: 'n-e-rest' },
    { from: 'n-e-rest', to: 'n-e-food' },
    { from: 'n-e-food', to: 'n-tr' },
  ],
};

/* ---------------------------- Assistant (demo) ---------------------------- */

const zoneSource = (zone: ZoneTelemetry): ChatSource => ({
  label: `${zone.name} (live crowd data)`,
  kind: 'zone',
  id: zone.id,
});

/**
 * Keyword-based stand-in for the grounded assistant. Every answer is built from
 * the zone and alert data passed in, and lists what it was based on.
 */
export function buildDemoAssistantReply(question: string, zones: ZoneTelemetry[], alerts: AlertItem[]): ChatMessage {
  const q = question.toLowerCase();
  const reply = (content: string, sources: ChatSource[] = []): ChatMessage => ({
    id: uid(),
    role: 'assistant',
    content,
    sources,
    createdAt: new Date().toISOString(),
  });

  const activeAlerts = sortAlerts(alerts.filter((alert) => isAlertActive(alert, Date.now())));

  if (/emergenc|medical|\bhelp\b|hurt|injur|first aid|unwell|faint/.test(q)) {
    const aid = zones.find((zone) => zone.id === 'first-aid');
    const urgent = activeAlerts.find((alert) => alert.severity === 'emergency');
    const lines = ['If this is an emergency, call 112 or tell the nearest staff member right away.'];
    if (aid) lines.push(`The first aid point is open and ${LEVEL_META[aid.level].label.toLowerCase()} right now.`);
    if (urgent) lines.push(`Current advisory: ${urgent.title}. ${urgent.message}`);
    return reply(lines.join('\n'), [
      ...(aid ? [zoneSource(aid)] : []),
      ...(urgent ? [{ label: `Alert: ${urgent.title}`, kind: 'alert' as const, id: urgent.id }] : []),
    ]);
  }

  if (/food|eat|hungry|snack|drink|thirst|queue|line/.test(q)) {
    const food = shortestWait(byCategory(zones, 'food'));
    if (food[0]) {
      const busiest = food[food.length - 1];
      const extra =
        food.length > 1 ? ` ${busiest.name} is ${LEVEL_META[busiest.level].label.toLowerCase()} at ${busiest.waitMinutes ?? 0} min.` : '';
      return reply(
        `${food[0].name} has the shortest line right now, about ${food[0].waitMinutes ?? 0} min.${extra}`,
        food.map(zoneSource),
      );
    }
  }

  if (/restroom|toilet|washroom|bathroom|\bloo\b/.test(q)) {
    const restrooms = [...byCategory(zones, 'restroom')].sort((a, b) => a.occupancyPct - b.occupancyPct);
    if (restrooms[0]) {
      return reply(
        `Quietest right now: ${restrooms[0].name}, ${restrooms[0].occupancyPct}% full with a wait of about ${restrooms[0].waitMinutes ?? 0} min.`,
        restrooms.map(zoneSource),
      );
    }
  }

  if (/exit|leave|gate|\bout\b|entry|enter|way home|parking/.test(q)) {
    const gates = shortestWait(byCategory(zones, 'entrance'));
    if (gates[0]) {
      const busiest = gates[gates.length - 1];
      const extra = gates.length > 1 ? ` ${busiest.name} is slower at ${busiest.waitMinutes ?? 0} min.` : '';
      return reply(
        `${gates[0].name} is moving fastest, about ${gates[0].waitMinutes ?? 0} min.${extra} Conditions change quickly, so check the map before you head out.`,
        gates.map(zoneSource),
      );
    }
  }

  if (/alert|update|advis|closed|delay|happening|news|route/.test(q)) {
    const top = activeAlerts.slice(0, 2);
    if (top.length > 0) {
      return reply(
        top.map((alert) => `${alert.title}: ${alert.message}`).join('\n'),
        top.map((alert) => ({ label: `Alert: ${alert.title}`, kind: 'alert' as const, id: alert.id })),
      );
    }
    return reply('There are no active alerts right now. New route changes and safety notices will show on the Alerts tab.');
  }

  return reply(
    'I can help with queue times, the quietest restrooms, the fastest gate, walking routes and live alerts. Try asking "Where is the shortest food line?"',
  );
}
