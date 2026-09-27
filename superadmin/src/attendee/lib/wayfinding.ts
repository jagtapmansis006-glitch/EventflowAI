import type { Point, RoutePlan, RouteStep, VenueMap } from '@/lib/types';

/** Average walking pace in a busy venue, in metres per minute. */
const WALK_METERS_PER_MINUTE = 75;

type Heading = 'north' | 'south' | 'east' | 'west';

interface Stop {
  point: Point;
  label: string;
}

interface Leg {
  heading: Heading;
  meters: number;
  endLabel: string;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** SVG y grows downward, so a negative dy means "north". */
function headingOf(from: Point, to: Point): Heading {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'east' : 'west';
  return dy >= 0 ? 'south' : 'north';
}

/** Dijkstra over the corridor graph. The graph is tiny, so a linear scan is plenty. */
function shortestPath(map: VenueMap, startId: string, endId: string): string[] | null {
  const nodes = new Map(map.nodes.map((node) => [node.id, node]));
  if (!nodes.has(startId) || !nodes.has(endId)) return null;

  const adjacency = new Map<string, Array<{ id: string; cost: number }>>();
  for (const edge of map.edges) {
    const a = nodes.get(edge.from);
    const b = nodes.get(edge.to);
    if (!a || !b) continue;
    const cost = distance(a, b);
    adjacency.set(a.id, [...(adjacency.get(a.id) ?? []), { id: b.id, cost }]);
    adjacency.set(b.id, [...(adjacency.get(b.id) ?? []), { id: a.id, cost }]);
  }

  const best = new Map<string, number>([[startId, 0]]);
  const previous = new Map<string, string>();
  const unvisited = new Set(nodes.keys());

  while (unvisited.size > 0) {
    let current: string | null = null;
    let currentCost = Infinity;
    for (const id of unvisited) {
      const cost = best.get(id) ?? Infinity;
      if (cost < currentCost) {
        current = id;
        currentCost = cost;
      }
    }
    if (current === null || current === endId) break;

    unvisited.delete(current);
    for (const next of adjacency.get(current) ?? []) {
      const candidate = currentCost + next.cost;
      if (candidate < (best.get(next.id) ?? Infinity)) {
        best.set(next.id, candidate);
        previous.set(next.id, current);
      }
    }
  }

  if (!best.has(endId)) return null;

  const path = [endId];
  while (path[0] !== startId) {
    const step = previous.get(path[0]);
    if (!step) return null;
    path.unshift(step);
  }
  return path;
}

/**
 * Builds a walking route from the attendee's position to a zone.
 * Used when `/api/navigation/route` is unavailable, and as a reference for
 * what a backend implementation should return.
 */
export function computeRoute(
  map: VenueMap,
  toZoneId: string,
  fromNodeId: string = map.youAreHereNodeId,
): RoutePlan | null {
  const zone = map.zones.find((candidate) => candidate.zoneId === toZoneId);
  if (!zone) return null;

  const path = shortestPath(map, fromNodeId, zone.anchorNodeId);
  if (!path) return null;

  // Already standing at this zone's entrance: nothing to walk.
  if (fromNodeId === zone.anchorNodeId) {
    const here = map.nodes.find((node) => node.id === fromNodeId);
    if (here) {
      const center: Point = { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 };
      return {
        toZoneId,
        points: [{ x: here.x, y: here.y }, center],
        steps: [{ instruction: `You are at ${zone.name}`, meters: 0 }],
        totalMeters: 0,
        totalMinutes: 0,
      };
    }
  }

  const nodesById = new Map(map.nodes.map((node) => [node.id, node]));
  const stops: Stop[] = path.flatMap((id) => {
    const node = nodesById.get(id);
    return node ? [{ point: { x: node.x, y: node.y }, label: node.label }] : [];
  });

  const center: Point = { x: zone.x + zone.width / 2, y: zone.y + zone.height / 2 };
  const lastStop = stops[stops.length - 1];
  if (!lastStop || distance(lastStop.point, center) > 1) {
    stops.push({ point: center, label: zone.name });
  }

  // Merge consecutive segments that head the same way into one instruction.
  const legs: Leg[] = [];
  for (let i = 1; i < stops.length; i += 1) {
    const heading = headingOf(stops[i - 1].point, stops[i].point);
    const meters = distance(stops[i - 1].point, stops[i].point) * map.metersPerUnit;
    const lastLeg = legs[legs.length - 1];
    if (lastLeg && lastLeg.heading === heading) {
      lastLeg.meters += meters;
      lastLeg.endLabel = stops[i].label;
    } else {
      legs.push({ heading, meters, endLabel: stops[i].label });
    }
  }

  const steps: RouteStep[] =
    legs.length === 0
      ? [{ instruction: `You are already at ${zone.name}`, meters: 0 }]
      : legs.map((leg, index) => {
          const meters = Math.max(5, Math.round(leg.meters / 5) * 5);
          const destination = index === legs.length - 1 ? zone.name : leg.endLabel;
          return { instruction: `Walk ${leg.heading} ${meters} m to ${destination}`, meters };
        });

  const totalMeters = steps.reduce((sum, step) => sum + step.meters, 0);
  return {
    toZoneId,
    points: stops.map((stop) => stop.point),
    steps,
    totalMeters,
    totalMinutes: Math.max(1, Math.ceil(totalMeters / WALK_METERS_PER_MINUTE)),
  };
}
