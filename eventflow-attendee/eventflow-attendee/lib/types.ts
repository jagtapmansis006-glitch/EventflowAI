/**
 * Shared domain types for the EventFlow-AI attendee portal.
 *
 * These are the shapes the UI consumes. Backend responses are normalised into
 * them in `lib/api/normalize.ts`, so a FastAPI (snake_case) or Next.js
 * (camelCase) backend can both feed the same components.
 */

export type CrowdLevel = 'low' | 'moderate' | 'high' | 'critical';
export type ZoneCategory = 'entrance' | 'food' | 'restroom' | 'stage' | 'service';
export type Trend = 'rising' | 'steady' | 'falling';

export interface ZoneTelemetry {
  id: string;
  name: string;
  category: ZoneCategory;
  /** 0–100 */
  occupancyPct: number;
  level: CrowdLevel;
  trend: Trend;
  /** Queue wait in minutes; null when a queue doesn't apply (e.g. the stage). */
  waitMinutes: number | null;
  /** ISO 8601 */
  updatedAt: string;
}

export interface AttendeeTicket {
  id: string;
  holderName: string;
  eventName: string;
  venueName: string;
  tier: string;
  gate: string;
  section: string;
  seat: string;
  /** ISO 8601 */
  doorsOpenAt: string;
  /** ISO 8601 */
  startsAt: string;
  entryCode: string;
  /** Map zone that contains the attendee's seat. */
  seatZoneId?: string;
}

export interface Recommendation {
  id: string;
  kind: 'food' | 'restroom' | 'route' | 'exit' | 'service';
  title: string;
  detail: string;
  zoneId?: string;
}

export type AlertSeverity = 'emergency' | 'warning' | 'info';
export type AlertCategory = 'emergency' | 'route' | 'crowd' | 'service';

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  message: string;
  /** ISO 8601 */
  issuedAt: string;
  /** ISO 8601. Omit for alerts that stay active until withdrawn. */
  expiresAt?: string | null;
  zoneId?: string | null;
  actionLabel?: string;
  /** Internal path (`/user/map?zone=gate-b`) or external scheme (`tel:112`). */
  actionHref?: string;
}

/* ---------------------------------- Map ---------------------------------- */

export interface Point {
  x: number;
  y: number;
}

export interface VenueZoneShape {
  zoneId: string;
  name: string;
  category: ZoneCategory;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Corridor node where a walking route to this zone ends. */
  anchorNodeId: string;
}

export interface VenueNode extends Point {
  id: string;
  /** Read aloud in directions, e.g. "the north concourse". */
  label: string;
}

export interface VenueEdge {
  from: string;
  to: string;
}

export interface VenueMap {
  viewBox: { width: number; height: number };
  /** Real-world metres represented by one map unit. */
  metersPerUnit: number;
  youAreHereNodeId: string;
  zones: VenueZoneShape[];
  nodes: VenueNode[];
  edges: VenueEdge[];
}

export interface RouteStep {
  instruction: string;
  meters: number;
}

export interface RoutePlan {
  toZoneId: string;
  points: Point[];
  steps: RouteStep[];
  totalMeters: number;
  totalMinutes: number;
}

/* --------------------------------- Chat ---------------------------------- */

export interface ChatSource {
  label: string;
  kind: 'zone' | 'alert' | 'map' | 'schedule';
  id?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** ISO 8601 */
  createdAt: string;
  /** What the assistant's answer was grounded in. */
  sources?: ChatSource[];
}
