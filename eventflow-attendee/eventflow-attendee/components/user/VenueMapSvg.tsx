'use client';

import type { KeyboardEvent } from 'react';
import type { RoutePlan, VenueMap, ZoneTelemetry } from '@/lib/types';
import { LEVEL_META, cn } from '@/lib/utils';

interface VenueMapSvgProps {
  map: VenueMap;
  zonesById: Record<string, ZoneTelemetry | undefined>;
  selectedId: string | null;
  route: RoutePlan | null;
  onSelect: (zoneId: string | null) => void;
}

/** Motion only plays for people who haven't asked for reduced motion. */
const MAP_CSS = `
@media (prefers-reduced-motion: no-preference) {
  .ef-route { animation: ef-flow 1s linear infinite; }
  .ef-pulse { transform-box: fill-box; transform-origin: center; animation: ef-pulse 2s ease-out infinite; }
}
@keyframes ef-flow { to { stroke-dashoffset: -10; } }
@keyframes ef-pulse { from { transform: scale(0.6); opacity: 1; } to { transform: scale(2); opacity: 0; } }
`;

const LABEL_FONT_SIZE = 10;
const CHAR_WIDTH = 5.5;
const LINE_HEIGHT = 12;

/** Greedy word wrap sized to the zone's width. */
function wrapLabel(text: string, width: number): string[] {
  const maxChars = Math.max(6, Math.floor((width - 6) / CHAR_WIDTH));
  const lines: string[] = [];
  let current = '';

  for (const word of text.split(' ')) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export default function VenueMapSvg({ map, zonesById, selectedId, route, onSelect }: VenueMapSvgProps) {
  const nodesById = new Map(map.nodes.map((node) => [node.id, node]));
  const origin = nodesById.get(map.youAreHereNodeId);
  const routePoints = route?.points.map((point) => `${point.x},${point.y}`).join(' ');
  const destination = route?.points[route.points.length - 1];

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>, zoneId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(zoneId === selectedId ? null : zoneId);
    }
  };

  return (
    <>
      <style>{MAP_CSS}</style>
      <svg
        viewBox={`0 0 ${map.viewBox.width} ${map.viewBox.height}`}
        role="group"
        aria-label="Venue map. Select a zone to see a walking route."
        className="h-auto w-full touch-manipulation select-none"
      >
        <rect width={map.viewBox.width} height={map.viewBox.height} rx={24} className="fill-slate-100" />

        {/* Concourses */}
        <g className="stroke-white" strokeWidth={14} strokeLinecap="round">
          {map.edges.map((edge) => {
            const from = nodesById.get(edge.from);
            const to = nodesById.get(edge.to);
            if (!from || !to) return null;
            return <line key={`${edge.from}-${edge.to}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
          })}
        </g>

        {/* Zones */}
        {map.zones.map((zone) => {
          const telemetry = zonesById[zone.zoneId];
          const meta = LEVEL_META[telemetry?.level ?? 'low'];
          const selected = zone.zoneId === selectedId;
          const lines = wrapLabel(zone.name, zone.width);
          const textLines = telemetry ? [...lines, `${telemetry.occupancyPct}%`] : lines;
          const centerX = zone.x + zone.width / 2;
          const firstY = zone.y + zone.height / 2 - ((textLines.length - 1) * LINE_HEIGHT) / 2;

          return (
            <g
              key={zone.zoneId}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`${zone.name}${telemetry ? `, ${meta.label}, ${telemetry.occupancyPct}% full` : ''}`}
              onClick={() => onSelect(selected ? null : zone.zoneId)}
              onKeyDown={(event) => handleKeyDown(event, zone.zoneId)}
              className="group cursor-pointer outline-none"
            >
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.width}
                height={zone.height}
                rx={12}
                strokeWidth={selected ? 3 : 1.5}
                className={cn(
                  meta.fill,
                  selected ? 'stroke-blue-600' : meta.stroke,
                  'transition-[stroke-width] group-focus-visible:stroke-blue-600',
                )}
              />
              {textLines.map((line, index) => (
                <text
                  key={`${line}-${index}`}
                  x={centerX}
                  y={firstY + index * LINE_HEIGHT}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={LABEL_FONT_SIZE}
                  className={cn(
                    'pointer-events-none',
                    index === lines.length ? 'fill-slate-600' : 'fill-slate-900 font-semibold',
                  )}
                >
                  {line}
                </text>
              ))}
            </g>
          );
        })}

        {/* Route */}
        {routePoints && (
          <g pointerEvents="none" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polyline points={routePoints} strokeWidth={8} className="stroke-white" />
            <polyline points={routePoints} strokeWidth={4} strokeDasharray="1 9" className="ef-route stroke-blue-600" />
          </g>
        )}
        {destination && (
          <circle cx={destination.x} cy={destination.y} r={6} strokeWidth={2} className="pointer-events-none fill-slate-900 stroke-white" />
        )}

        {/* You are here */}
        {origin && (
          <g transform={`translate(${origin.x} ${origin.y})`} pointerEvents="none">
            <circle r={9} className="ef-pulse fill-sky-500/40" />
            <circle r={5} strokeWidth={2} className="fill-blue-600 stroke-white" />
            <text
              x={11}
              y={0}
              dominantBaseline="central"
              fontSize={LABEL_FONT_SIZE}
              strokeWidth={3}
              className="fill-slate-900 stroke-white font-semibold"
              style={{ paintOrder: 'stroke' }}
            >
              You are here
            </text>
          </g>
        )}
      </svg>
    </>
  );
}
