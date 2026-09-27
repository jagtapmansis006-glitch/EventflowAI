import type { AlertItem, AlertSeverity, CrowdLevel, Trend } from '@/lib/types';

/* ------------------------------- Class names ------------------------------ */

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Heading typeface, wired up via next/font in `app/user/layout.tsx`. */
export const DISPLAY_FONT = 'font-[family-name:var(--font-display)]';

/** Hides the scrollbar on horizontally scrolling chip rows and carousels. */
export const HIDE_SCROLLBAR = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden';

/* --------------------------------- Numbers -------------------------------- */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/* --------------------------------- Crowds --------------------------------- */

export function deriveLevel(occupancyPct: number): CrowdLevel {
  if (occupancyPct >= 90) return 'critical';
  if (occupancyPct >= 70) return 'high';
  if (occupancyPct >= 40) return 'moderate';
  return 'low';
}

interface LevelMeta {
  label: string;
  /** Pill background + text */
  pill: string;
  /** Solid meter segment */
  bar: string;
  /** SVG zone fill / stroke */
  fill: string;
  stroke: string;
}

/**
 * Full literal class strings so Tailwind's scanner picks them up.
 * Every level also has a text label, so colour is never the only signal.
 */
export const LEVEL_META: Record<CrowdLevel, LevelMeta> = {
  low: {
    label: 'Quiet',
    pill: 'bg-emerald-100 text-emerald-800',
    bar: 'bg-emerald-500',
    fill: 'fill-emerald-100',
    stroke: 'stroke-emerald-500',
  },
  moderate: {
    label: 'Moderate',
    pill: 'bg-amber-100 text-amber-900',
    bar: 'bg-amber-400',
    fill: 'fill-amber-100',
    stroke: 'stroke-amber-500',
  },
  high: {
    label: 'Busy',
    pill: 'bg-orange-100 text-orange-900',
    bar: 'bg-orange-500',
    fill: 'fill-orange-100',
    stroke: 'stroke-orange-500',
  },
  critical: {
    label: 'Packed',
    pill: 'bg-rose-100 text-rose-800',
    bar: 'bg-rose-600',
    fill: 'fill-rose-100',
    stroke: 'stroke-rose-600',
  },
};

export const TREND_LABEL: Record<Trend, string> = {
  rising: 'Filling up',
  steady: 'Steady',
  falling: 'Easing',
};

/* --------------------------------- Alerts --------------------------------- */

export const SEVERITY_RANK: Record<AlertSeverity, number> = {
  emergency: 0,
  warning: 1,
  info: 2,
};

export function isAlertActive(alert: AlertItem, now: number): boolean {
  if (!alert.expiresAt) return true;
  const expires = Date.parse(alert.expiresAt);
  return Number.isNaN(expires) || expires > now;
}

export function sortAlerts(alerts: AlertItem[]): AlertItem[] {
  return [...alerts].sort((a, b) => {
    const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return Date.parse(b.issuedAt) - Date.parse(a.issuedAt);
  });
}

/* --------------------------------- Time ----------------------------------- */

export function formatRelative(iso: string, now: number): string {
  const diffMin = Math.round((now - Date.parse(iso)) / 60_000);
  if (Number.isNaN(diffMin)) return '';
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  return `${Math.floor(diffMin / 60)} h ago`;
}

export function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '–';
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

/* ---------------------------------- Ids ----------------------------------- */

/** `crypto.randomUUID` is undefined on non-HTTPS origins (e.g. a LAN demo), so guard it. */
export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
