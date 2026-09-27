import { db } from './db';

type ZStatus = 'NORMAL' | 'BUSY' | 'WARNING' | 'CRITICAL';

function zoneStatus(level?: string): ZStatus {
  if (level === 'CRITICAL') return 'CRITICAL';
  if (level === 'BUSY') return 'WARNING';
  if (level === 'MODERATE') return 'BUSY';
  return 'NORMAL';
}

function timeAgo(iso?: string): string {
  if (!iso) return 'No signal';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 5) return 'Just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

function fmtTime(iso?: string): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

export function buildEventOverview(eventId: string) {
  const event: any = db.get('events').find(e => e.id === eventId);
  if (!event) return null;

  const zonesRaw: any[] = db.get('crowdZones').filter(z => z.eventId === eventId && z.isActive !== false);
  const gatesRaw: any[] = db.get('gates').filter(g => g.eventId === eventId);
  const camerasRaw: any[] = db.get('cameras').filter(c => c.eventId === eventId);
  const queuesRaw: any[] = db.get('queues').filter(q => q.eventId === eventId);
  const routesRaw: any[] = db.get('routes').filter(r => r.eventId === eventId);
  const facilitiesRaw: any[] = db.get('facilities').filter(f => f.eventId === eventId);
  const locationsRaw: any[] = db.get('venueLocations').filter(l => l.eventId === eventId);
  const alertsRaw: any[] = db.get('alerts').filter(a => a.eventId === eventId);
  const incidentsRaw: any[] = db.get('incidents').filter(i => i.eventId === eventId);
  const recsRaw: any[] = db.get('recommendations').filter(r => r.eventId === eventId);
  const predsRaw: any[] = db.get('mlPredictions').filter(p => p.eventId === eventId);
  const telemetryRaw: any[] = db.get('crowdTelemetry').filter(t => t.eventId === eventId);

  const byTimeDesc = (a: any, b: any) =>
    new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime();

  const telemetrySorted = [...telemetryRaw].sort(byTimeDesc);
  const latestByZone: Record<string, any> = {};
  for (const t of telemetrySorted) {
    if (!latestByZone[t.zoneId]) latestByZone[t.zoneId] = t;
  }
  const latestByCamera: Record<string, any> = {};
  for (const t of telemetrySorted) {
    if (!latestByCamera[t.cameraId]) latestByCamera[t.cameraId] = t;
  }

  const predsSorted = [...predsRaw].sort(byTimeDesc);
  const latestPredByZone: Record<string, any> = {};
  for (const p of predsSorted) {
    if (!latestPredByZone[p.zoneId]) latestPredByZone[p.zoneId] = p;
  }

  // ---- map coordinates (lat/lng -> 800x500 canvas) ----
  const pts = [...zonesRaw, ...gatesRaw, ...facilitiesRaw, ...locationsRaw].filter(
    p => typeof p.latitude === 'number' && typeof p.longitude === 'number'
  );
  const lats = pts.map(p => p.latitude);
  const lngs = pts.map(p => p.longitude);
  const minLat = lats.length ? Math.min(...lats) : 0;
  const maxLat = lats.length ? Math.max(...lats) : 1;
  const minLng = lngs.length ? Math.min(...lngs) : 0;
  const maxLng = lngs.length ? Math.max(...lngs) : 1;
  const spanLat = maxLat - minLat || 0.001;
  const spanLng = maxLng - minLng || 0.001;
  const toXY = (lat: number, lng: number) => ({
    x: Math.round(120 + ((lng - minLng) / spanLng) * 560),
    y: Math.round(100 + (1 - (lat - minLat) / spanLat) * 300)
  });

  // ---- zones ----
  const zones = zonesRaw.map((z, i) => {
    const t = latestByZone[z.id];
    const pos = toXY(z.latitude, z.longitude);
    const crowdCount = t ? t.peopleCount : 0;
    const density = Math.min(100, Math.round((crowdCount / (z.capacity || 1)) * 100));
    return {
      id: z.id,
      code: `Zone ${String.fromCharCode(65 + i)}`,
      name: z.name,
      crowdCount,
      capacity: z.capacity,
      density,
      status: zoneStatus(t?.densityLevel),
      x: pos.x - 90,
      y: pos.y - 60,
      width: 180,
      height: 120,
      latitude: z.latitude,
      longitude: z.longitude
    };
  });

  const nearestZoneId = (lat: number, lng: number): string => {
    let best = '';
    let bestD = Infinity;
    for (const z of zonesRaw) {
      const d = (z.latitude - lat) ** 2 + (z.longitude - lng) ** 2;
      if (d < bestD) {
        bestD = d;
        best = z.id;
      }
    }
    return best;
  };

  // ---- gates ----
  const gates = gatesRaw.map((g, i) => {
    const pos = toXY(g.latitude, g.longitude);
    const zoneId = nearestZoneId(g.latitude, g.longitude);
    const nameNum = String(g.name || '').match(/Gate\s*(\d+)/i);
    const open = g.status === 'OPEN';
    const zt = latestByZone[zoneId];
    return {
      id: g.id,
      name: g.name,
      gateCode: g.gateCode,
      number: nameNum ? parseInt(nameNum[1], 10) : i + 1,
      status: open ? 'OPEN' : 'CLOSED',
      rawStatus: g.status,
      currentCrowd: g.currentCount,
      currentCount: g.currentCount,
      capacity: g.capacity,
      flowRate: open && zt ? zt.netFlow : 0,
      zoneId,
      direction: String(g.gateType || '').includes('EGRESS') ? 'EXIT' : 'ENTRY',
      lastActionTime: fmtTime(g.updatedAt),
      x: pos.x,
      y: pos.y,
      latitude: g.latitude,
      longitude: g.longitude
    };
  });

  // ---- queues ----
  const queues = queuesRaw.map(q => ({
    id: q.id,
    name: q.name,
    gateId: gates.find(g => g.zoneId === q.zoneId)?.id || '',
    length: q.currentLength,
    waitMinutes: q.averageWaitTime,
    status: q.status === 'CLOSED' ? 'NORMAL' : q.status
  }));

  // ---- cameras ----
  const cameras = camerasRaw.map((c, i) => {
    const zone = zones.find(z => z.id === c.zoneId);
    const t = latestByCamera[c.id] || latestByZone[c.zoneId];
    const level = t?.densityLevel;
    return {
      id: c.id,
      code: c.cameraCode,
      name: c.name,
      zoneId: c.zoneId,
      isOnline: c.status === 'ONLINE' && c.isActive !== false,
      fps: 30,
      lastTelemetryTime: timeAgo(t?.timestamp || c.lastSeenAt),
      detectedCount: t ? t.peopleCount : 0,
      x: (zone ? zone.x + 90 : 400) + ((i % 3) - 1) * 40,
      y: (zone ? zone.y + 60 : 250) + (Math.floor(i / 3) - 0.5) * 30,
      fovAngle: 75,
      fovDirection: 90,
      opticalStatus:
        level === 'CRITICAL' ? 'HIGH_DENSITY' : level === 'BUSY' ? 'FLOW_BOTTLENECK' : 'CLEAR'
    };
  });

  // ---- routes ----
  const locById: Record<string, any> = {};
  for (const l of locationsRaw) locById[l.id] = l;
  const routes = routesRaw.map(r => {
    const a = locById[r.sourceLocationId];
    const b = locById[r.destinationLocationId];
    const pa = a ? toXY(a.latitude, a.longitude) : { x: 200, y: 200 };
    const pb = b ? toXY(b.latitude, b.longitude) : { x: 300, y: 250 };
    return {
      id: r.id,
      name: r.name,
      fromZoneId: a ? nearestZoneId(a.latitude, a.longitude) : '',
      toZoneId: b ? nearestZoneId(b.latitude, b.longitude) : '',
      status: r.status === 'OPEN' ? 'CLEAR' : r.status,
      flowRate: 0,
      points: [pa, pb]
    };
  });

  // ---- facilities ----
  const facTypeMap: Record<string, string> = {
    MEDICAL: 'MEDICAL',
    SECURITY: 'SECURITY',
    TOILET: 'RESTROOM',
    HELP_DESK: 'INFO'
  };
  const facilities = facilitiesRaw.map(f => {
    const pos = toXY(f.latitude, f.longitude);
    return {
      id: f.id,
      name: f.name,
      type: facTypeMap[f.facilityType] || 'INFO',
      facilityType: f.facilityType,
      location: f.description,
      x: pos.x,
      y: pos.y,
      status: f.status === 'OPERATIONAL' ? 'OPERATIONAL' : 'BUSY',
      latitude: f.latitude,
      longitude: f.longitude
    };
  });

  // ---- alerts (real alerts + active recommendations) ----
  const sevMap: Record<string, string> = { INFO: 'INFO', WARNING: 'WARNING', HIGH: 'WARNING', CRITICAL: 'CRITICAL' };
  const catMap: Record<string, string> = {
    CROWD_DENSITY: 'DENSITY',
    CROWD_SURGE: 'DENSITY',
    QUEUE: 'CONGESTION',
    GATE: 'CONGESTION',
    ROUTE: 'CONGESTION',
    SECURITY: 'SECURITY',
    MEDICAL: 'INCIDENT'
  };
  const alertCards: any[] = alertsRaw.map(a => ({
    id: a.id,
    priority: sevMap[a.severity] || 'INFO',
    category: catMap[a.alertType] || 'SYSTEM',
    title: a.title,
    description: a.internalMessage,
    actionType: 'RESOLVE',
    actionLabel: 'RESOLVE',
    acknowledged: a.status === 'ACKNOWLEDGED',
    resolved: a.status === 'RESOLVED' || a.status === 'DISMISSED',
    createdAt: fmtTime(a.createdAt),
    _sort: new Date(a.createdAt).getTime()
  }));

  const recActionMap: Record<string, string> = {
    OPEN_GATE: 'OPEN_GATE',
    REDIRECT_ROUTE: 'REDIRECT_ROUTE',
    REDIRECT_ATTENDEES: 'REDIRECT_ROUTE',
    PREPARE_ALTERNATE_ROUTE: 'REDIRECT_ROUTE',
    DISPATCH_STAFF: 'DISPATCH_STAFF',
    DEPLOY_STAFF: 'DISPATCH_STAFF'
  };
  const recCards: any[] = recsRaw
    .filter(r => r.status === 'ACTIVE')
    .map(r => {
      const rtype = r.recommendationType || r.type;
      return {
        id: r.id,
        priority: sevMap[r.priority] || 'INFO',
        category: 'CONGESTION',
        title: r.title,
        description: r.description,
        details: r.reason,
        recommendation: r.suggestedAction,
        actionType: recActionMap[rtype] || 'RESOLVE',
        actionLabel: String(rtype || 'ACT').replace(/_/g, ' '),
        actionPayload: { recommendationId: r.id, gateId: r.suggestedGateId },
        hasSimulation: false,
        acknowledged: false,
        resolved: false,
        createdAt: fmtTime(r.createdAt),
        _sort: new Date(r.createdAt).getTime()
      };
    });

  const alerts = [...recCards, ...alertCards]
    .sort((a, b) => b._sort - a._sort)
    .map(({ _sort, ...rest }) => rest);

  // ---- incidents ----
  const incTypeMap: Record<string, string> = {
    MEDICAL: 'MEDICAL',
    SECURITY: 'SECURITY',
    CROWD: 'OVERCROWD',
    INFRASTRUCTURE: 'EQUIPMENT',
    LOST_PERSON: 'LOST_CHILD'
  };
  const incidents = incidentsRaw
    .sort(byTimeDesc)
    .map(i => ({
      id: i.id,
      title: i.title,
      type: incTypeMap[i.incidentType] || 'SECURITY',
      zoneId: i.zoneId || '',
      location: i.location,
      reportedAt: fmtTime(i.createdAt),
      status: i.status === 'INVESTIGATING' ? 'ON_SCENE' : i.status,
      priority: i.severity === 'LOW' ? 'MEDIUM' : i.severity,
      notes: i.description
    }));

  // ---- totals ----
  const currentCrowd = zones.reduce((s, z) => s + z.crowdCount, 0);
  const capacity = zones.reduce((s, z) => s + z.capacity, 0);
  const occupancyPercent = capacity ? Math.round((currentCrowd / capacity) * 100) : 0;
  const rank: Record<string, number> = { NORMAL: 0, BUSY: 1, WARNING: 2, CRITICAL: 3 };
  const crowdStatus = zones.reduce<ZStatus>(
    (worst, z) => (rank[z.status] > rank[worst] ? z.status : worst),
    'NORMAL'
  );

  // ---- analytics ----
  const peakByZone: Record<string, any> = {};
  for (const t of telemetryRaw) {
    if (!peakByZone[t.zoneId] || t.peopleCount > peakByZone[t.zoneId].peopleCount) {
      peakByZone[t.zoneId] = t;
    }
  }
  const peakRecords = Object.values(peakByZone);
  const peakCrowd = peakRecords.reduce((s, t: any) => s + t.peopleCount, 0);
  const peakTop: any = [...peakRecords].sort((a: any, b: any) => b.peopleCount - a.peopleCount)[0];

  const byHour: Record<string, Record<string, number[]>> = {};
  for (const t of telemetryRaw) {
    const label = new Date(t.timestamp).getHours().toString().padStart(2, '0') + ':00';
    if (!byHour[label]) byHour[label] = {};
    if (!byHour[label][t.zoneId]) byHour[label][t.zoneId] = [];
    byHour[label][t.zoneId].push(t.peopleCount);
  }
  const hourlyCrowd: { time: string; crowd: number; predicted: number }[] = Object.entries(byHour)
    .map(([time, zs]) => {
      const crowd = Object.values(zs).reduce(
        (s, arr) => s + arr.reduce((a, b) => a + b, 0) / arr.length,
        0
      );
      return { time, crowd: Math.round(crowd), predicted: Math.round(crowd) };
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  const predictedTotal = Object.values(latestPredByZone).reduce(
    (s, p: any) => s + p.predictedPeopleCount,
    0
  );
  if (predictedTotal > 0) {
    hourlyCrowd.push({ time: 'Forecast', crowd: currentCrowd, predicted: Math.round(predictedTotal) });
  }

  const preds = Object.values(latestPredByZone) as any[];
  const aiAccuracyPercent = preds.length
    ? Math.round((preds.reduce((s, p) => s + p.confidence, 0) / preds.length) * 1000) / 10
    : 0;

  const assignment: any = db.get('eventAdminAssignments').find(a => a.eventId === eventId);
  const adminUser: any = assignment ? db.get('users').find(u => u.id === assignment.userId) : null;

  return {
    id: event.id,
    name: event.name,
    description: event.description,
    status: event.status,
    venue: `${event.venueName}, ${event.city}`,
    dateTime: `${new Date(event.startDateTime).toLocaleString()} - ${new Date(event.endDateTime).toLocaleString()}`,
    capacity,
    currentCrowd,
    occupancyPercent,
    crowdStatus,
    assignedAdminId: adminUser?.id || '',
    assignedAdminName: adminUser?.fullName || '',
    gates,
    zones,
    queues,
    cameras,
    routes,
    facilities,
    alerts,
    incidents,
    analytics: {
      peakCrowd,
      peakTime: fmtTime(peakTop?.timestamp),
      totalEntries: telemetryRaw.reduce((s, t) => s + t.inflow, 0),
      totalExits: telemetryRaw.reduce((s, t) => s + t.outflow, 0),
      avgWaitMinutes: queues.length
        ? Math.round((queues.reduce((s, q) => s + q.waitMinutes, 0) / queues.length) * 10) / 10
        : 0,
      aiAccuracyPercent,
      aiRecommendationsGenerated: recsRaw.length,
      aiActionsExecuted: recsRaw.filter(r => r.status === 'APPROVED' || r.status === 'EXECUTED').length,
      hourlyCrowd,
      gateFlows: gates.map(g => ({ gate: g.name, entries: g.currentCount, exits: 0 })),
      queueTrends: []
    }
  };
}