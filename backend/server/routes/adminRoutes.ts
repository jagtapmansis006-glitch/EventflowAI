import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { db, Gate, Alert, Incident, CrowdZone, Camera, Simulation, MLPrediction } from '../db';
import { realtimeManager } from '../realtime';
import { runPredictionForZone } from '../predictionEngine';
import { verifyToken } from '../auth';
import { recordAuditLog } from '../audit';
import { inferNugenWeather } from '../services/recommendationEngine';

const router = Router();

function getAuthUser(req: Request) {
  const token = (req.query.token as string) || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
  if (!token) return null;
  return verifyToken(token);
}

// GET /api/v1/admin/my-events
router.get('/my-events', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const events = db.get('events') || [];
    const assignments = db.get('eventAdminAssignments') || [];

    if (!user) {
      // Return public/live events if not authenticated
      const liveEvents = events.filter((e: any) => e.status === 'LIVE' || e.status === 'UPCOMING');
      return res.json({
        hasAssignment: true,
        assignedCount: liveEvents.length,
        events: liveEvents.map((e: any) => ({ ...e, canAccess: true }))
      });
    }

    if (user.role === 'SUPER_ADMIN') {
      return res.json({
        hasAssignment: true,
        assignedCount: events.length,
        events: events.map((e: any) => ({ ...e, canAccess: true }))
      });
    }

    // EVENT_ADMIN: filter by assignments
    const userAssignments = assignments.filter((a: any) => a.userId === (user as any).userId || a.userId === (user as any).id);
    const assignedIds = new Set(userAssignments.map((a: any) => a.eventId));

    const assignedEvents = events
      .filter((e: any) => assignedIds.has(e.id))
      .map((e: any) => ({ ...e, canAccess: true }));

    // If user has no specific assignments, grant default access to first live event for operation
    if (assignedEvents.length === 0 && events.length > 0) {
      const defaultEvent = events.find((e: any) => e.status === 'LIVE') || events[0];
      return res.json({
        hasAssignment: false,
        assignedCount: 0,
        events: [{ ...defaultEvent, canAccess: true }]
      });
    }

    return res.json({
      hasAssignment: assignedEvents.length > 0,
      assignedCount: assignedEvents.length,
      events: assignedEvents
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch my events', details: err.message });
  }
});

// GET /api/v1/admin/events/:eventId
router.get('/events/:eventId', (req: Request, res: Response) => {
  const { eventId } = req.params;
  try {
    const events = db.get('events') || [];
    const event = events.find((e: any) => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    return res.json({ success: true, event });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch event', details: err.message });
  }
});

// GET /api/v1/admin/events/:eventId/dashboard
router.get('/events/:eventId/dashboard', (req: Request, res: Response) => {
  const { eventId } = req.params;
  try {
    const events = db.get('events') || [];
    const event = events.find((e: any) => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const telemetry = (db.get('crowdTelemetry') || []).filter((t: any) => t.eventId === eventId);
    const latestTelem = telemetry.length > 0 ? telemetry[telemetry.length - 1] : null;

    const allGates = (db.get('gates') || []).filter((g: any) => g.eventId === eventId);
    const allZones = (db.get('crowdZones') || []).filter((z: any) => z.eventId === eventId);
    const allQueues = (db.get('queues') || []).filter((q: any) => q.eventId === eventId);
    const allCameras = (db.get('cameras') || []).filter((c: any) => c.eventId === eventId);
    const allAlerts = (db.get('alerts') || []).filter((a: any) => a.eventId === eventId);
    const allIncidents = (db.get('incidents') || []).filter((i: any) => i.eventId === eventId);
    const allPredictions = (db.get('mlPredictions') || []).filter((p: any) => p.eventId === eventId);

    const totalGateCount = allGates.reduce((s: number, g: any) => s + (g.currentCount || 0), 0);
    const currentPeopleCount = latestTelem ? latestTelem.peopleCount : totalGateCount;
    const capacity = allZones.reduce((s: number, z: any) => s + (z.capacity || 0), 0) || 12000;
    const occupancyPercent = latestTelem ? latestTelem.occupancyPercent : Math.min(100, Math.round((currentPeopleCount / capacity) * 100));

    const currentCrowdStatus = {
      densityLevel: latestTelem ? latestTelem.densityLevel : (occupancyPercent > 85 ? 'CRITICAL' : occupancyPercent > 65 ? 'BUSY' : 'MODERATE'),
      currentPeopleCount,
      currentInflow: latestTelem ? latestTelem.inflow : 35,
      currentOutflow: latestTelem ? latestTelem.outflow : 20,
      netFlow: latestTelem ? latestTelem.netFlow : 15,
      avgSpeedMps: latestTelem?.avgSpeedMps !== undefined ? latestTelem.avgSpeedMps : 1.15,
      occupancyPercent,
      lastTelemetryTimestamp: latestTelem ? latestTelem.timestamp : new Date().toISOString()
    };

    return res.json({
      event: {
        ...event,
        autonomousMode: event.autonomousMode !== undefined ? Boolean(event.autonomousMode) : true
      },
      currentCrowdStatus,
      activeAlerts: allAlerts.filter((a: any) => a.status === 'ACTIVE'),
      criticalAlerts: allAlerts.filter((a: any) => a.status === 'ACTIVE' && a.severity === 'CRITICAL'),
      activeIncidents: allIncidents.filter((i: any) => i.status !== 'RESOLVED'),
      gateStatuses: allGates,
      zoneStatuses: allZones,
      queueStatuses: allQueues,
      cameraStatuses: allCameras,
      recentTelemetry: telemetry.slice(-40),
      recentPredictions: allPredictions.slice(-15)
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch event dashboard', details: err.message });
  }
});

// GET /api/v1/admin/events/:eventId/overview (Mirrors EventData shape for EventHead console)
router.get('/events/:eventId/overview', (req: Request, res: Response) => {
  const { eventId } = req.params;
  try {
    const events = db.get('events') || [];
    const event = events.find((e: any) => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const telemetry = (db.get('crowdTelemetry') || []).filter((t: any) => t.eventId === eventId);
    const latestTelem = telemetry.length > 0 ? telemetry[telemetry.length - 1] : null;

    const allGates = (db.get('gates') || []).filter((g: any) => g.eventId === eventId);
    const allZones = (db.get('crowdZones') || []).filter((z: any) => z.eventId === eventId);
    const allQueues = (db.get('queues') || []).filter((q: any) => q.eventId === eventId);
    const allCameras = (db.get('cameras') || []).filter((c: any) => c.eventId === eventId);
    const allRoutes = (db.get('routes') || []).filter((r: any) => r.eventId === eventId);
    const allFacilities = (db.get('facilities') || []).filter((f: any) => f.eventId === eventId);
    const allAlerts = (db.get('alerts') || []).filter((a: any) => a.eventId === eventId);
    const allIncidents = (db.get('incidents') || []).filter((i: any) => i.eventId === eventId);

    const totalGatePeople = allGates.reduce((s: number, g: any) => s + (g.currentCount || 0), 0);
    const currentCrowd = latestTelem ? latestTelem.peopleCount : (totalGatePeople || 3420);
    const capacity = allZones.reduce((s: number, z: any) => s + (z.capacity || 0), 0) || 12000;
    const occupancyPercent = latestTelem ? latestTelem.occupancyPercent : Math.min(100, Math.round((currentCrowd / capacity) * 100));

    const mappedGates = allGates.map((g: any, i: number) => ({
      id: g.id,
      name: g.name,
      number: i + 1,
      status: g.status === 'OPEN' ? 'OPEN' : 'CLOSED',
      currentCrowd: g.currentCount || 0,
      capacity: g.capacity || 2500,
      flowRate: g.status === 'OPEN' ? (latestTelem?.inflow || 45) : 0,
      zoneId: g.zoneId || allZones[0]?.id || 'zone_north_plaza',
      direction: g.gateType === 'MAIN_ENTRANCE' ? 'ENTRY' : (g.gateType === 'EGRESS_ONLY' ? 'EXIT' : 'BIDIRECTIONAL'),
      lastActionTime: g.updatedAt ? new Date(g.updatedAt).toLocaleTimeString() : '18:00'
    }));

    const mappedZones = allZones.map((z: any, i: number) => {
      const zTelem = telemetry.filter((t: any) => t.zoneId === z.id).slice(-1)[0];
      const count = zTelem ? zTelem.peopleCount : Math.round((z.capacity || 5000) * 0.45);
      const density = Math.min(100, Math.round((count / (z.capacity || 5000)) * 100));
      return {
        id: z.id,
        code: `Z-${i + 1}`,
        name: z.name,
        crowdCount: count,
        capacity: z.capacity || 5000,
        density,
        status: density >= 90 ? 'CRITICAL' : density >= 75 ? 'WARNING' : density >= 45 ? 'BUSY' : 'NORMAL',
        x: 40 + (i % 2) * 220,
        y: 40 + Math.floor(i / 2) * 160,
        width: 190,
        height: 130
      };
    });

    const mappedQueues = allQueues.length > 0 ? allQueues : allGates.map((g: any) => ({
      id: `q_${g.id}`,
      name: `${g.name} Ingress Queue`,
      gateId: g.id,
      length: Math.max(10, Math.round((g.currentCount || 200) * 0.12)),
      waitMinutes: Math.max(1, Math.round((g.currentCount || 200) / 90)),
      status: (g.currentCount || 0) > 2000 ? 'CRITICAL' : (g.currentCount || 0) > 1000 ? 'BUSY' : 'NORMAL'
    }));

    const mappedCameras = allCameras.map((c: any, i: number) => ({
      id: c.id,
      code: c.cameraCode || `CAM-0${i + 1}`,
      name: c.name,
      zoneId: c.zoneId,
      isOnline: c.status === 'ONLINE',
      fps: 25,
      lastTelemetryTime: c.lastSeenAt || new Date().toISOString(),
      detectedCount: latestTelem?.peopleCount || 340,
      x: 80 + i * 80,
      y: 80 + i * 50,
      fovAngle: 85,
      fovDirection: 45 * i,
      opticalStatus: latestTelem && latestTelem.avgSpeedMps < 0.35 ? 'FLOW_BOTTLENECK' : 'CLEAR'
    }));

    const mappedRoutes = allRoutes.length > 0 ? allRoutes : [
      { id: 'route_1', name: 'North Corridor Loop', fromZoneId: 'zone_north_plaza', toZoneId: 'zone_main_bowl', status: 'CLEAR', flowRate: 65, points: [{ x: 50, y: 50 }, { x: 200, y: 150 }] },
      { id: 'route_2', name: 'East Ingress Way', fromZoneId: 'zone_east_concourse', toZoneId: 'zone_main_bowl', status: 'CLEAR', flowRate: 40, points: [{ x: 250, y: 50 }, { x: 200, y: 150 }] }
    ];

    const mappedFacilities = allFacilities.length > 0 ? allFacilities : [
      { id: 'fac_med_01', name: 'First Aid North Station', type: 'MEDICAL', location: 'North Concourse', x: 60, y: 60, status: 'OPERATIONAL' },
      { id: 'fac_rest_01', name: 'Restroom Block East', type: 'RESTROOM', location: 'East Pavilion', x: 240, y: 60, status: 'OPERATIONAL' }
    ];

    const mappedAlerts = allAlerts.map((a: any) => ({
      id: a.id,
      priority: a.severity === 'CRITICAL' ? 'CRITICAL' : (a.severity === 'HIGH' ? 'WARNING' : 'INFO'),
      category: a.alertType === 'CROWD_SURGE' ? 'CONGESTION' : 'DENSITY',
      title: a.title,
      description: a.publicMessage || a.title,
      actionType: 'OPEN_GATE',
      actionLabel: 'Open Alternate Gate',
      actionPayload: { gateId: allGates[1]?.id || allGates[0]?.id },
      hasSimulation: true,
      simulationPayload: { action: 'OPEN_GATE', targetId: allGates[1]?.id || allGates[0]?.id },
      acknowledged: false,
      resolved: a.status === 'RESOLVED',
      createdAt: a.createdAt
    }));

    const mappedIncidents = allIncidents.map((inc: any) => ({
      id: inc.id,
      title: inc.title,
      type: inc.incidentType || 'OVERCROWD',
      zoneId: inc.zoneId,
      location: inc.locationDescription || 'Concourse',
      reportedAt: inc.createdAt,
      status: inc.status,
      priority: inc.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH'
    }));

    const overviewData = {
      id: event.id,
      name: event.name,
      venue: event.venueName,
      dateTime: `${new Date(event.startDateTime).toLocaleDateString()} ${new Date(event.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(event.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      capacity,
      currentCrowd,
      occupancyPercent,
      crowdStatus: occupancyPercent >= 85 ? 'CRITICAL' : (occupancyPercent >= 70 ? 'WARNING' : (occupancyPercent >= 40 ? 'BUSY' : 'NORMAL')),
      assignedAdminId: 'eventadmin',
      assignedAdminName: 'Event Operations Head',
      autonomousMode: event.autonomousMode !== undefined ? Boolean(event.autonomousMode) : true,
      gates: mappedGates,
      zones: mappedZones,
      queues: mappedQueues,
      cameras: mappedCameras,
      routes: mappedRoutes,
      facilities: mappedFacilities,
      alerts: mappedAlerts,
      incidents: mappedIncidents,
      analytics: {
        peakCrowd: Math.round(currentCrowd * 1.25),
        peakTime: '20:15',
        totalEntries: totalGatePeople + 1850,
        totalExits: 620,
        avgWaitMinutes: 3.8,
        aiAccuracyPercent: 94.6,
        aiRecommendationsGenerated: 14,
        aiActionsExecuted: 9,
        hourlyCrowd: [
          { time: '17:00', crowd: 1800, predicted: 1750 },
          { time: '18:00', crowd: 3400, predicted: 3200 },
          { time: '19:00', crowd: 5900, predicted: 5800 },
          { time: '20:00', crowd: 7400, predicted: 7200 }
        ],
        gateFlows: mappedGates.map((g: any) => ({ gate: g.name, entries: g.currentCrowd || 600, exits: Math.round((g.currentCrowd || 600) * 0.15) })),
        queueTrends: [{ time: '18:00', avgWait: 2 }, { time: '19:00', avgWait: 4 }, { time: '20:00', avgWait: 3 }]
      }
    };

    return res.json(overviewData);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch event overview', details: err.message });
  }
});

// GET /api/v1/admin/events/:eventId/analytics
router.get('/events/:eventId/analytics', (req: Request, res: Response) => {
  const { eventId } = req.params;
  try {
    const events = db.get('events') || [];
    const event = events.find((e: any) => e.id === eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const telemetry = (db.get('crowdTelemetry') || []).filter((t: any) => t.eventId === eventId);
    const latestTelem = telemetry.length > 0 ? telemetry[telemetry.length - 1] : null;
    const allGates = (db.get('gates') || []).filter((g: any) => g.eventId === eventId);
    const totalGatePeople = allGates.reduce((s: number, g: any) => s + (g.currentCount || 0), 0);
    const currentCrowd = latestTelem ? latestTelem.peopleCount : (totalGatePeople || 3420);

    const analyticsData = {
      peakCrowd: Math.round(currentCrowd * 1.25),
      peakTime: '20:15',
      totalEntries: totalGatePeople + 1850,
      totalExits: 620,
      avgWaitMinutes: 3.8,
      aiAccuracyPercent: 94.6,
      aiRecommendationsGenerated: 14,
      aiActionsExecuted: 9,
      hourlyCrowd: [
        { time: '17:00', crowd: 1800, predicted: 1750 },
        { time: '18:00', crowd: 3400, predicted: 3200 },
        { time: '19:00', crowd: 5900, predicted: 5800 },
        { time: '20:00', crowd: 7400, predicted: 7200 }
      ],
      gateFlows: allGates.map((g: any) => ({ gate: g.name, entries: g.currentCount || 600, exits: Math.round((g.currentCount || 600) * 0.15) })),
      queueTrends: [{ time: '18:00', avgWait: 2 }, { time: '19:00', avgWait: 4 }, { time: '20:00', avgWait: 3 }]
    };

    return res.json({ success: true, analytics: analyticsData, ...analyticsData });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch event analytics', details: err.message });
  }
});

// GET /api/v1/admin/events/:eventId/auto-execute
router.get('/events/:eventId/auto-execute', (req: Request, res: Response) => {
  const { eventId } = req.params;
  const events = db.get('events') || [];
  const event = events.find((e: any) => e.id === eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  return res.json({
    success: true,
    eventId,
    autonomousMode: event.autonomousMode !== undefined ? Boolean(event.autonomousMode) : true
  });
});

// PATCH /api/v1/admin/events/:eventId/auto-execute
router.patch('/events/:eventId/auto-execute', (req: Request, res: Response) => {
  const { eventId } = req.params;
  const autonomousMode = req.body.autonomousMode !== undefined ? req.body.autonomousMode : req.body.enabled;

  try {
    const events = db.get('events') || [];
    const event = events.find((e: any) => e.id === eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    event.autonomousMode = Boolean(autonomousMode);
    db.save();

    const user = getAuthUser(req) as any;
    recordAuditLog({
      userId: user?.userId || user?.id || 'system_admin',
      eventId: String(eventId),
      action: 'AUTONOMOUS_MODE_TOGGLED',
      resourceType: 'EVENT',
      resourceId: String(eventId),
      metadata: { autonomousMode: event.autonomousMode }
    });

    realtimeManager.broadcast('event_status_changed', {
      eventId: String(eventId),
      autonomousMode: event.autonomousMode,
      message: `AI Autonomous Control switched to ${event.autonomousMode ? 'AI CONTROL' : 'MANUAL'}`
    }, String(eventId));

    return res.json({
      success: true,
      eventId,
      autonomousMode: event.autonomousMode
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update autonomous mode', details: err.message });
  }
});

// POST /api/v1/admin/events/:eventId/ai-decision (Autonomous Structured Action Dispatcher)
router.post('/events/:eventId/ai-decision', (req: Request, res: Response) => {
  const { eventId } = req.params;
  const { action, gate, reason, confidence, source = 'system_ai_autopilot' } = req.body;

  if (!action || !gate) {
    return res.status(400).json({ error: 'action and gate are required in structured decision payload.' });
  }

  try {
    const gates = db.get('gates') || [];
    const targetGate = gates.find((g: any) => (g.eventId === eventId || !g.eventId) && (g.id === gate || g.name.toLowerCase().includes(gate.toLowerCase()) || g.gateCode?.toLowerCase() === gate.toLowerCase()));

    if (!targetGate) {
      return res.status(404).json({ error: `Target gate '${gate}' not found for event '${eventId}'.` });
    }

    const nextStatus = action.toUpperCase() === 'OPEN' ? 'OPEN' : 'CLOSED';
    targetGate.status = nextStatus;
    targetGate.updatedAt = new Date().toISOString();

    const now = new Date().toISOString();
    const isHumanApproved = source === 'human_operator_approved' || source === 'manual_admin' || source === 'human_operator';
    const auditUserId = isHumanApproved ? 'human_operator_approved' : (source || 'system_ai_autopilot');
    const auditAction = action.toUpperCase() === 'OPEN'
      ? (isHumanApproved ? 'GATE_OPENED_APPROVED' : 'GATE_OPENED_AUTONOMOUS')
      : (isHumanApproved ? 'GATE_CLOSED_APPROVED' : 'GATE_CLOSED_AUTONOMOUS');

    const auditRecord: any = {
      id: `audit_${isHumanApproved ? 'human' : 'ai'}_${crypto.randomUUID().slice(0, 8)}`,
      userId: auditUserId,
      eventId: String(eventId),
      action: auditAction,
      resourceType: 'GATE',
      resourceId: targetGate.id,
      metadata: {
        action,
        gateName: targetGate.name,
        reason: reason || 'AI crowd density threshold triggered',
        confidence: Number(confidence) || 0.94,
        source: auditUserId,
        executedAt: now
      },
      createdAt: now
    };

    const audits = db.get('auditLogs') || [];
    audits.unshift(auditRecord);

    // Resolve any pending recommendation matching this gate
    const recs = db.get('recommendations') || [];
    recs.forEach((r: any) => {
      if ((r.eventId === eventId || !r.eventId) && (r.suggestedGateId === targetGate.id || r.action?.toLowerCase().includes(targetGate.name.toLowerCase()))) {
        r.status = isHumanApproved ? 'APPROVED' : 'EXECUTED';
        r.resolvedAt = now;
      }
    });

    db.save();

    // Broadcast realtime updates across all connected dashboards
    realtimeManager.broadcast('gate_status_changed', {
      gateId: targetGate.id,
      gateName: targetGate.name,
      status: targetGate.status,
      reason,
      confidence: Number(confidence) || 0.94,
      source: auditUserId
    }, String(eventId));

    realtimeManager.broadcast('route_updated', {
      eventId: String(eventId),
      gateId: targetGate.id,
      action: nextStatus === 'OPEN' ? 'INGRESS_EXPANDED' : 'TRAFFIC_DIVERTED',
      notice: reason || `Gate ${targetGate.name} ${nextStatus}. Please follow digital wayfinding.`
    }, String(eventId));

    return res.json({
      success: true,
      executed: true,
      gate: targetGate,
      auditRecord
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'AI Decision execution failed', details: err.message });
  }
});

// GET /api/v1/admin/events/:eventId/recommendations
router.get('/events/:eventId/recommendations', (req: Request, res: Response) => {
  const { eventId } = req.params;
  try {
    const allRecs = db.get('recommendations') || [];
    const filtered = allRecs.filter((r: any) => r.eventId === eventId || !r.eventId);
    return res.json({ success: true, recommendations: filtered, data: filtered });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch recommendations', details: err.message });
  }
});

// POST /api/v1/admin/events/:eventId/recommendations/:id/approve
router.post('/events/:eventId/recommendations/:id/approve', (req: Request, res: Response) => {
  const { eventId, id } = req.params;
  try {
    const recs = db.get('recommendations') || [];
    const rec = recs.find((r: any) => r.id === id);
    if (!rec) return res.status(404).json({ error: 'Recommendation not found' });

    rec.status = 'APPROVED';
    rec.resolvedAt = new Date().toISOString();

    const gates = db.get('gates') || [];
    const targetGate = rec.suggestedGateId
      ? gates.find((g: any) => g.id === rec.suggestedGateId || g.name.toLowerCase().includes(rec.suggestedGateId?.toLowerCase() || ''))
      : gates.find((g: any) => (g.eventId === eventId || !g.eventId) && g.status === 'CLOSED');

    if (targetGate) {
      targetGate.status = 'OPEN';
      targetGate.updatedAt = new Date().toISOString();

      const auditRecord = {
        id: `audit_human_${crypto.randomUUID().slice(0, 8)}`,
        userId: 'human_operator_approved',
        eventId: String(eventId),
        action: 'GATE_OPENED_APPROVED',
        resourceType: 'GATE',
        resourceId: targetGate.id,
        metadata: {
          action: 'OPEN',
          gateName: targetGate.name,
          recommendationId: rec.id,
          reason: rec.reason || rec.description || 'Human operator approved gate recommendation',
          confidence: rec.confidence || 0.94,
          source: 'human_operator_approved',
          executedAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString()
      };
      (db.get('auditLogs') || []).unshift(auditRecord);

      realtimeManager.broadcast('gate_status_changed', {
        gateId: targetGate.id,
        gateName: targetGate.name,
        status: 'OPEN',
        reason: rec.reason || 'Human operator approved gate recommendation',
        confidence: rec.confidence || 0.94,
        source: 'human_operator_approved'
      }, String(eventId));

      realtimeManager.broadcast('route_updated', {
        eventId: String(eventId),
        gateId: targetGate.id,
        action: 'INGRESS_EXPANDED',
        notice: `Gate ${targetGate.name} opened by Operator Approval. Traffic rerouted.`
      }, String(eventId));
    }

    db.save();
    realtimeManager.broadcast('recommendation_updated', rec, String(eventId));
    return res.json({ success: true, approved: true, recommendation: rec, gate: targetGate });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to approve recommendation', details: err.message });
  }
});

// Helper to parse venue map JSON
function getParsedVenueMap() {
  const jsonPath = path.join(process.cwd(), '..', 'crowd_project', 'venue_map.json');
  if (fs.existsSync(jsonPath)) {
    try {
      return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    } catch (_) {}
  }
  return {
    venue_name: "Apex Stadium Ground",
    total_capacity: 50000,
    venue_area_sqm: 12000,
    gates: [
      { gate_id: "GATE 1 (Main Entry)", gate_type: "entry", camera_id: "CAM 1", distance_to_main_stage_meters: 48 },
      { gate_id: "GATE 2 (Entry)", gate_type: "entry", camera_id: "CAM 2", distance_to_main_stage_meters: 52 },
      { gate_id: "GATE 3 (Exit)", gate_type: "exit", camera_id: "CAM 6", distance_to_main_stage_meters: 70 },
      { gate_id: "GATE 4 (Entry/Exit)", gate_type: "entry-exit", camera_id: "CAM 5", distance_to_main_stage_meters: 90 },
      { gate_id: "GATE 5 (Exit)", gate_type: "exit", camera_id: "CAM 4", distance_to_main_stage_meters: 80 }
    ],
    cameras: [
      { camera_id: "CAM 1", location: "Gate 1 (Entry)", coverage_area: "Main Stage & Crowd" },
      { camera_id: "CAM 2", location: "Gate 2 (Entry)", coverage_area: "Stage Right & Crowd" },
      { camera_id: "CAM 3", location: "Left Corridor", coverage_area: "VIP Zone & Washrooms" },
      { camera_id: "CAM 4", location: "VIP Zone Entry", coverage_area: "VIP Area & Food Court" },
      { camera_id: "CAM 5", location: "Right Corridor", coverage_area: "Merchandise & Rest Area" },
      { camera_id: "CAM 6", location: "Gate 3 (Exit)", coverage_area: "Food Court & Main Exit" }
    ],
    zones: [
      { zone_name: "Main Stage", area_sqm: 300 },
      { zone_name: "General Admission (Standing)", area_sqm: 6500 },
      { zone_name: "VIP Zone", area_sqm: 1000 },
      { zone_name: "Food Court & Lounge", area_sqm: 1500 },
      { zone_name: "Washrooms", area_sqm: 400 },
      { zone_name: "Merchandise", area_sqm: 250 },
      { zone_name: "First Aid", area_sqm: 300 }
    ],
    distances: [
      { from: "Gate 1", to: "Main Stage", distance_meters: 48 },
      { from: "Gate 2", to: "Main Stage", distance_meters: 52 },
      { from: "Gate 3", to: "Food Court", distance_meters: 35 }
    ]
  };
}

// POST /api/v1/admin/events/:eventId/venue-map & /events/parse-venue-map
router.post(['/events/:eventId/venue-map', '/events/parse-venue-map'], (req: Request, res: Response) => {
  const eventId = req.params.eventId || req.body.eventId;
  const { fileData, fileName, imageBase64 } = req.body;

  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let savedPath = '/uploads/venue_map_default.png';
    const rawImage = imageBase64 || fileData;
    if (rawImage && rawImage.includes('base64,')) {
      const base64Data = rawImage.split(';base64,').pop();
      const ext = rawImage.includes('image/svg') ? 'svg' : (rawImage.includes('image/jpeg') ? 'jpg' : 'png');
      const uniqueName = `venue_map_${Date.now()}.${ext}`;
      const filePath = path.join(uploadsDir, uniqueName);
      fs.writeFileSync(filePath, base64Data, { encoding: 'base64' });
      savedPath = `/uploads/${uniqueName}`;
    }

    const parsedData = getParsedVenueMap();

    // If eventId provided, update event record in db.ts
    if (eventId) {
      const events = db.get('events') || [];
      const event = events.find((e: any) => e.id === eventId);
      if (event) {
        event.mapImageUrl = savedPath;
        event.venueMapPath = savedPath;
        event.venueMapData = parsedData;
        event.updatedAt = new Date().toISOString();
        db.save();

        realtimeManager.broadcast('venue_map_updated', {
          eventId: event.id,
          mapImageUrl: savedPath,
          venueData: parsedData
        }, String(eventId));
      }
    }

    return res.json({
      success: true,
      mapImageUrl: savedPath,
      venueMapPath: savedPath,
      venueData: parsedData,
      venueName: parsedData.venue_name,
      totalCapacity: parsedData.total_capacity,
      gates: parsedData.gates,
      zones: parsedData.zones,
      cameras: parsedData.cameras
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Venue map upload and parsing failed', details: err.message });
  }
});

// GET & PATCH /api/v1/admin/events/:eventId/gates/:gateId
router.get('/events/:eventId/gates/:gateId', (req: Request, res: Response) => {
  const { eventId, gateId } = req.params;
  const gates = db.get('gates') || [];
  const gate = gates.find((g: any) => g.id === gateId && (g.eventId === eventId || !g.eventId));
  if (!gate) return res.status(404).json({ error: 'Gate not found' });
  return res.json({ success: true, gate });
});

router.patch('/events/:eventId/gates/:gateId', (req: Request, res: Response) => {
  const { eventId, gateId } = req.params;
  const { status, source = 'manual_admin' } = req.body;

  try {
    const gates = db.get('gates') || [];
    const gate = gates.find((g: any) => g.id === gateId && (g.eventId === eventId || !g.eventId));
    if (!gate) return res.status(404).json({ error: 'Gate not found' });

    gate.status = status;
    gate.updatedAt = new Date().toISOString();
    db.save();

    const user = getAuthUser(req) as any;
    recordAuditLog({
      userId: user?.userId || user?.id || (source === 'voice' ? 'voice_assistant' : 'manual_admin'),
      eventId: String(eventId),
      action: status === 'OPEN' ? 'GATE_OPENED' : 'GATE_CLOSED',
      resourceType: 'GATE',
      resourceId: gate.id,
      metadata: { gateName: gate.name, status, source }
    });

    realtimeManager.broadcast('gate_status_changed', {
      gateId: gate.id,
      status: gate.status,
      source
    }, String(eventId));

    return res.json({ success: true, gate });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update gate', details: err.message });
  }
});

// GET & PATCH /api/v1/admin/gates/:gateId (Alias for backwards compatibility)
router.patch('/gates/:gateId', (req: Request, res: Response) => {
  const { gateId } = req.params;
  const { status, source = 'manual_admin' } = req.body;
  try {
    const gates = db.get('gates') || [];
    const gate = gates.find((g: any) => g.id === gateId);
    if (!gate) return res.status(404).json({ error: 'Gate not found' });

    gate.status = status;
    gate.updatedAt = new Date().toISOString();
    db.save();

    realtimeManager.broadcast('gate_status_changed', {
      gateId: gate.id,
      status: gate.status,
      source
    }, gate.eventId);

    return res.json({ success: true, gate });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update gate', details: err.message });
  }
});

// GET /api/v1/admin/events/:eventId/gates
router.get('/events/:eventId/gates', (req: Request, res: Response) => {
  const { eventId } = req.params;
  try {
    const gates = db.get('gates') || [];
    const filtered = gates.filter((g: any) => g.eventId === eventId || !g.eventId);
    return res.json({ success: true, gates: filtered });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch gates', details: err.message });
  }
});

// POST /api/v1/admin/events/:eventId/gates
router.post('/events/:eventId/gates', (req: Request, res: Response) => {
  const { eventId } = req.params;
  const { name, gateCode, capacity, latitude, longitude, status = 'OPEN', isPublic = true } = req.body;
  try {
    const gates = db.get('gates') || [];
    const newGate: Gate = {
      id: `gate_${crypto.randomUUID().slice(0, 8)}`,
      eventId: String(eventId),
      venueId: 'v_default',
      name: name || 'Gate',
      gateCode: gateCode || (name ? name.toUpperCase().replace(/\s+/g, '_') : 'GATE'),
      gateType: 'MAIN_ENTRANCE',
      status: status || 'OPEN',
      capacity: Number(capacity) || 2000,
      currentCount: 0,
      latitude: Number(latitude) || 18.9894,
      longitude: Number(longitude) || 73.1175,
      isPublic: isPublic !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    gates.push(newGate);
    db.save();
    return res.status(201).json({ success: true, gate: newGate });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create gate', details: err.message });
  }
});

// Helper to parse voice text for event creation
function parseVoiceEventCreation(text: string) {
  const raw = text.trim();
  const fields: Record<string, any> = {};

  // 1. Capacity
  const capMatch = raw.match(/capacity\s*(?:of|is|:)?\s*([\d,]+)/i) || raw.match(/([\d,]+)\s*(?:capacity|attendees|people|seats)/i);
  if (capMatch) {
    fields.capacity = Number(capMatch[1].replace(/,/g, ''));
  }

  // 2. Gate Coordinates
  const coordMatch = raw.match(/(?:coordinates?|coords?|lat(?:itude)?|location)?[:\s]*(-?\d+\.?\d*)\s*[,/ ]\s*(-?\d+\.?\d*)/i);
  if (coordMatch) {
    fields.latitude = Number(coordMatch[1]);
    fields.longitude = Number(coordMatch[2]);
  }

  // 3. Gate Name
  const gateNameMatch = raw.match(/(?:at|for|name)?\s*(gate\s*[a-z0-9]+|north gate|south gate|east gate|west gate|main gate)/i);
  if (gateNameMatch) {
    fields.gateName = gateNameMatch[1].trim().toUpperCase();
  } else {
    fields.gateName = 'GATE 1 (MAIN)';
  }

  // 4. Venue Name
  const venueMatch = raw.match(/venue[:\s]+([^,.]+?)(?:\s+with|\s+capacity|\s+gate|\s+in|\s+city|$)/i) 
    || raw.match(/at\s+([A-Za-z0-9\s]+?)(?:\s+with|\s+capacity|\s+gate|\s+in|\s+city|$)/i);
  if (venueMatch) {
    fields.venueName = venueMatch[1].trim();
  }

  // 5. Event Name
  const eventMatch = raw.match(/(?:create\s+event|event\s+name|event)[:\s]+([^,.]+?)(?:\s+at|\s+with|\s+venue|\s+capacity|$)/i);
  if (eventMatch) {
    fields.name = eventMatch[1].trim();
  } else if (fields.venueName) {
    fields.name = `${fields.venueName} Summit 2026`;
  }

  // 6. City
  const cityMatch = raw.match(/(?:city|region)[:\s]+([^,.]+)/i) || raw.match(/in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  if (cityMatch) {
    fields.city = cityMatch[1].trim();
  }

  return fields;
}

// POST /api/v1/admin/voice-command & /events/:eventId/voice-command
router.post(['/voice-command', '/events/:eventId/voice-command'], (req: Request, res: Response) => {
  const eventId = req.params.eventId || 'event_apex_summit_2026';
  const { command = '', confirmed = false } = req.body;
  const q = command.toLowerCase().trim();

  try {
    // Check if command is an event creation intent
    if (q.includes('create') || q.includes('event') || q.includes('venue') || q.includes('capacity') || q.includes('coordinate')) {
      const parsedFields = parseVoiceEventCreation(command);
      if (parsedFields.venueName || parsedFields.capacity || parsedFields.latitude) {
        return res.json({
          success: true,
          actionType: 'CREATE_EVENT_PARSED',
          fields: parsedFields,
          voiceResponse: `Parsed event parameters: Venue "${parsedFields.venueName || 'Default'}" with capacity ${parsedFields.capacity || 'not specified'}. Gate coordinates mapped.`
        });
      }
    }

    const gates = (db.get('gates') || []).filter((g: any) => g.eventId === eventId || !g.eventId);
    const telemetry = (db.get('crowdTelemetry') || []).filter((t: any) => t.eventId === eventId);
    const latest = telemetry.slice(-1)[0];

    // Busiest gate query intent
    if (q.includes('busiest') && (q.includes('gate') || q.includes('entrance') || q.includes('zone'))) {
      const sortedByCount = [...gates].sort((a: any, b: any) => (b.currentCount || 0) - (a.currentCount || 0));
      const busiest = sortedByCount[0] || gates[0];
      return res.json({
        executed: false,
        voiceResponse: `The busiest gate right now is ${busiest.name} with ${busiest.currentCount || 'peak'} attendees. Current status is ${busiest.status}.`
      });
    }

    // Shortest line query intent
    if (q.includes('shortest') || q.includes('fastest') || q.includes('least crowded') || q.includes('lowest wait')) {
      const openGates = gates.filter((g: any) => g.status === 'OPEN');
      const candidates = openGates.length > 0 ? openGates : gates;
      const quietest = [...candidates].sort((a: any, b: any) => (a.currentCount || 0) - (b.currentCount || 0))[0] || gates[0];
      return res.json({
        executed: false,
        voiceResponse: `The shortest line right now is at ${quietest.name} with approximately ${quietest.currentCount || 410} attendees and under 2 minutes estimated wait.`
      });
    }

    // Is Gate X open query intent
    if ((q.includes('is') || q.includes('check') || q.includes('status')) && (q.includes('gate') || q.includes('door'))) {
      const match = gates.find((g: any) => 
        (q.includes('3') && (g.id.includes('3') || g.name.includes('3'))) ||
        (q.includes('2') && (g.id.includes('2') || g.name.includes('2'))) ||
        (q.includes('1') && (g.id.includes('1') || g.name.includes('1'))) ||
        (q.includes('4') && (g.id.includes('4') || g.name.includes('4')))
      );
      if (match) {
        return res.json({
          executed: false,
          voiceResponse: `${match.name} is currently ${match.status}. Live count is ${match.currentCount || 'nominal'} attendees.`
        });
      }
    }

    // Exit B / directions intent
    if (q.includes('exit b') || q.includes('reach exit') || q.includes('how do i reach') || q.includes('nearest exit')) {
      return res.json({
        executed: false,
        voiceResponse: `To reach Exit B: Head south through the main concourse past Gate 4. Follow illuminated overhead signs toward the South Egress Portal.`
      });
    }

    // Open gate intent (e.g., "Open Gate 2", "Open Gate 3")
    if (q.includes('open') && (q.includes('gate') || q.includes('door'))) {
      const match = gates.find((g: any) => 
        (q.includes('2') && (g.id.includes('2') || g.name.includes('2') || g.gateCode?.includes('2'))) ||
        (q.includes('3') && (g.id.includes('3') || g.name.includes('3') || g.gateCode?.includes('3'))) ||
        (q.includes('1') && (g.id.includes('1') || g.name.includes('1') || g.gateCode?.includes('1'))) ||
        (q.includes('4') && (g.id.includes('4') || g.name.includes('4') || g.gateCode?.includes('4'))) ||
        q.includes(g.id.toLowerCase()) || 
        q.includes(g.name.toLowerCase()) || 
        q.includes(g.gateCode?.toLowerCase())
      );
      const target = match || gates.find((g: any) => g.status === 'CLOSED') || gates[0];

      if (target) {
        target.status = 'OPEN';
        target.updatedAt = new Date().toISOString();
        db.save();
        realtimeManager.broadcast('gate_status_changed', { gateId: target.id, status: 'OPEN', source: 'voice' }, String(eventId));
        return res.json({
          executed: true,
          actionType: 'TOGGLE_GATE',
          gateId: target.id,
          newStatus: 'OPEN',
          voiceResponse: `Acknowledged. ${target.name} is now OPEN. Flow diverted.`
        });
      }
    }

    // Close gate intent
    if (q.includes('close') && (q.includes('gate') || q.includes('door'))) {
      const match = gates.find((g: any) => 
        (q.includes('2') && (g.id.includes('2') || g.name.includes('2') || g.gateCode?.includes('2'))) ||
        (q.includes('3') && (g.id.includes('3') || g.name.includes('3') || g.gateCode?.includes('3'))) ||
        (q.includes('1') && (g.id.includes('1') || g.name.includes('1') || g.gateCode?.includes('1'))) ||
        (q.includes('4') && (g.id.includes('4') || g.name.includes('4') || g.gateCode?.includes('4'))) ||
        q.includes(g.id.toLowerCase()) || 
        q.includes(g.name.toLowerCase())
      );
      const target = match || gates.find((g: any) => g.status === 'OPEN') || gates[0];

      if (target) {
        target.status = 'CLOSED';
        target.updatedAt = new Date().toISOString();
        db.save();
        realtimeManager.broadcast('gate_status_changed', { gateId: target.id, status: 'CLOSED', source: 'voice' }, String(eventId));
        return res.json({
          executed: true,
          actionType: 'TOGGLE_GATE',
          gateId: target.id,
          newStatus: 'CLOSED',
          voiceResponse: `Confirmed. ${target.name} has been CLOSED. Turnstiles locked.`
        });
      }
    }

    // Crowd status intent
    if (q.includes('crowd') || q.includes('people') || q.includes('count') || q.includes('density') || q.includes('status')) {
      const count = latest ? latest.peopleCount : 4120;
      const occ = latest ? latest.occupancyPercent : 48;
      return res.json({
        executed: false,
        voiceResponse: `Current venue crowd is approximately ${count.toLocaleString()} attendees, running at ${occ}% occupancy.`
      });
    }

    // Default polite voice response
    return res.json({
      executed: false,
      voiceResponse: `Command received: "${command}". All zones and gates are operating nominally.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Voice command error', details: err.message });
  }
});

// POST /api/v1/admin/events/:eventId/digital-twin/simulate-weather & /digital-twin/simulate-weather
router.post(['/events/:eventId/digital-twin/simulate-weather', '/digital-twin/simulate-weather'], async (req: Request, res: Response) => {
  const eventId = req.params.eventId || req.body.eventId || 'event_apex_summit_2026';
  const { rainfall_mm, temp_c, storm_duration_min, zone_type } = req.body;

  try {
    const simulation = await inferNugenWeather({
      rainfall_mm: Number(rainfall_mm) || 0,
      temp_c: Number(temp_c) || 24,
      storm_duration_min: Number(storm_duration_min) || 0,
      zone_type: zone_type || 'OUTDOOR_PLAZA'
    });

    const recommendations: string[] = [];
    if (simulation.occupancy_shift_percent > 30) {
      recommendations.push('Activate auxiliary ingress corridors and indoor holding areas');
      recommendations.push('Dispatch crowd marshals to outdoor exits');
      recommendations.push('Display dynamic wayfinding broadcasts on attendee mobile portals');
    } else if (simulation.occupancy_shift_percent < -30) {
      recommendations.push('Outdoor evacuation active: unlock all turnstiles toward concourse shelters');
    } else {
      recommendations.push('Weather within operational tolerance; maintain standard ingress monitoring');
    }

    return res.json({
      success: true,
      eventId: String(eventId),
      zoneType: zone_type || 'OUTDOOR_PLAZA',
      model: 'eventflow-nugen-weather',
      predictions: simulation,
      recommendations,
      simulatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to simulate weather', details: err.message });
  }
});

// GET /api/v1/admin/events/:eventId/audit-logs & /activity-logs
router.get(['/events/:eventId/audit-logs', '/events/:eventId/activity-logs'], (req: Request, res: Response) => {
  const { eventId } = req.params;
  try {
    const audits = db.get('auditLogs') || [];
    const filtered = audits.filter((a: any) => a.eventId === eventId || a.eventId === 'global');
    return res.json(filtered.slice(0, 50));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch audit logs', details: err.message });
  }
});

// GET /api/v1/admin/events/:eventId/telemetry
router.get('/events/:eventId/telemetry', (req: Request, res: Response) => {
  const { eventId } = req.params;
  try {
    const telemetry = db.get('crowdTelemetry') || [];
    const filtered = telemetry.filter((t: any) => t.eventId === eventId);
    return res.json({ success: true, telemetry: filtered.slice(-60) });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch telemetry', details: err.message });
  }
});

// Predictions
router.get('/events/:eventId/predictions', (req: Request, res: Response) => {
  const { eventId } = req.params;
  const preds = db.get('mlPredictions') || [];
  return res.json({ predictions: preds.filter((p: any) => p.eventId === eventId).slice(-20) });
});

router.get('/events/:eventId/zones/:zoneId/predictions', (req: Request, res: Response) => {
  const { eventId, zoneId } = req.params;
  const preds = db.get('mlPredictions') || [];
  return res.json({ predictions: preds.filter((p: any) => p.eventId === eventId && p.zoneId === zoneId).slice(-10) });
});

router.post('/events/:eventId/zones/:zoneId/run-prediction', (req: Request, res: Response) => {
  const { eventId, zoneId } = req.params;
  try {
    const results = runPredictionForZone(String(eventId), String(zoneId));
    return res.json({ success: true, predictions: results });
  } catch (err: any) {
    return res.status(500).json({ error: 'Prediction run failed', details: err.message });
  }
});

// Zones
router.post('/events/:eventId/zones', (req: Request, res: Response) => {
  const { eventId } = req.params;
  const { name, capacity, warningThreshold, criticalThreshold, description } = req.body;
  const now = new Date().toISOString();
  const newZone: CrowdZone = {
    id: `zone_${crypto.randomUUID().slice(0, 8)}`,
    eventId: String(eventId),
    venueId: 'v_default',
    name: name || 'New Zone',
    description: description || '',
    capacity: Number(capacity) || 3000,
    warningThreshold: Number(warningThreshold) || Math.round((Number(capacity) || 3000) * 0.75),
    criticalThreshold: Number(criticalThreshold) || Math.round((Number(capacity) || 3000) * 0.9),
    latitude: 37.7749,
    longitude: -122.4194,
    isActive: true,
    createdAt: now,
    updatedAt: now
  };
  (db.get('crowdZones') || []).push(newZone);
  db.save();
  return res.status(201).json({ success: true, zone: newZone });
});

// Cameras
router.get('/events/:eventId/cameras', (req: Request, res: Response) => {
  const { eventId } = req.params;
  const cameras = (db.get('cameras') || []).filter((c: any) => c.eventId === eventId);
  return res.json({ cameras });
});

router.post('/events/:eventId/cameras', (req: Request, res: Response) => {
  const { eventId } = req.params;
  const { name, zoneId, sourceType, sourceUrl } = req.body;
  const now = new Date().toISOString();
  const newCam: Camera = {
    id: `cam_${crypto.randomUUID().slice(0, 8)}`,
    eventId: String(eventId),
    venueId: 'v_default',
    zoneId: zoneId || 'zone_default',
    name: name || 'New Camera',
    cameraCode: `CAM-${Date.now().toString().slice(-4)}`,
    sourceType: sourceType || 'VIDEO_FILE',
    sourceUrl: sourceUrl || '',
    status: 'ONLINE',
    isActive: true,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now
  };
  (db.get('cameras') || []).push(newCam);
  db.save();
  return res.status(201).json({ success: true, camera: newCam });
});

router.put('/events/:eventId/cameras/:cameraId', (req: Request, res: Response) => {
  const { eventId, cameraId } = req.params;
  const cameras = db.get('cameras') || [];
  const cam = cameras.find((c: any) => c.id === cameraId && c.eventId === eventId);
  if (!cam) return res.status(404).json({ error: 'Camera not found' });
  Object.assign(cam, req.body, { updatedAt: new Date().toISOString() });
  db.save();
  return res.json({ success: true, camera: cam });
});

// Alerts
router.get('/events/:eventId/alerts', (req: Request, res: Response) => {
  const { eventId } = req.params;
  const alerts = db.get('alerts') || [];
  const filtered = alerts.filter((a: any) => a.eventId === eventId || !a.eventId);
  return res.json({ success: true, alerts: filtered });
});

router.post('/events/:eventId/alerts', (req: Request, res: Response) => {
  const { eventId } = req.params;
  const { title, severity, alertType, publicMessage, internalMessage, zoneId } = req.body;
  const now = new Date().toISOString();
  const newAlert: Alert = {
    id: `alert_${crypto.randomUUID().slice(0, 8)}`,
    eventId: String(eventId),
    zoneId: zoneId || 'zone_default',
    alertType: alertType || 'CROWD_DENSITY',
    severity: severity || 'WARNING',
    title: title || 'Notice',
    publicMessage: publicMessage || title,
    internalMessage: internalMessage || '',
    status: 'ACTIVE',
    createdBy: 'admin_console',
    createdAt: now,
    updatedAt: now,
    resolvedAt: null
  };
  (db.get('alerts') || []).unshift(newAlert);
  db.save();
  realtimeManager.broadcast('alert_created', { alertId: newAlert.id, title: newAlert.title, severity: newAlert.severity }, String(eventId));
  return res.status(201).json({ success: true, alert: newAlert });
});

router.patch('/alerts/:alertId/status', (req: Request, res: Response) => {
  const { alertId } = req.params;
  const { status } = req.body;
  const alerts = db.get('alerts') || [];
  const alert = alerts.find((a: any) => a.id === alertId);
  if (alert) {
    alert.status = status;
    alert.updatedAt = new Date().toISOString();
    if (status === 'RESOLVED') alert.resolvedAt = new Date().toISOString();
    db.save();
    realtimeManager.broadcast('alert_updated', { alertId, status });
  }
  return res.json({ success: true, alert });
});

router.patch('/events/:eventId/alerts/:alertId', (req: Request, res: Response) => {
  const { alertId } = req.params;
  const { status } = req.body;
  const alerts = db.get('alerts') || [];
  const alert = alerts.find((a: any) => a.id === alertId);
  if (alert) {
    alert.status = status;
    alert.updatedAt = new Date().toISOString();
    db.save();
  }
  return res.json({ success: true, alert });
});

// Incidents
router.get('/events/:eventId/incidents', (req: Request, res: Response) => {
  const { eventId } = req.params;
  const incidents = db.get('incidents') || [];
  return res.json({ incidents: incidents.filter((i: any) => i.eventId === eventId) });
});

router.post('/events/:eventId/incidents', (req: Request, res: Response) => {
  const { eventId } = req.params;
  const { title, incidentType, severity, zoneId, locationDescription, description } = req.body;
  const now = new Date().toISOString();
  const newIncident: Incident = {
    id: `inc_${crypto.randomUUID().slice(0, 8)}`,
    eventId: String(eventId),
    zoneId: zoneId || 'zone_default',
    incidentType: incidentType || 'MEDICAL',
    severity: severity || 'MEDIUM',
    title: title || 'Incident Report',
    description: description || '',
    location: locationDescription || 'Venue Concourse',
    status: 'REPORTED',
    reportedBy: 'admin',
    assignedStaff: undefined,
    resolvedAt: null,
    createdAt: now,
    updatedAt: now
  };
  (db.get('incidents') || []).unshift(newIncident);
  db.save();
  realtimeManager.broadcast('incident_created', { incidentId: newIncident.id, title: newIncident.title }, String(eventId));
  return res.status(201).json({ success: true, incident: newIncident });
});

router.patch('/events/:eventId/incidents/:incidentId', (req: Request, res: Response) => {
  const { incidentId } = req.params;
  const { status, assignedStaff } = req.body;
  const incidents = db.get('incidents') || [];
  const inc = incidents.find((i: any) => i.id === incidentId);
  if (inc) {
    if (status) inc.status = status;
    if (assignedStaff) inc.assignedStaff = assignedStaff;
    inc.updatedAt = new Date().toISOString();
    if (status === 'RESOLVED') inc.resolvedAt = new Date().toISOString();
    db.save();
  }
  return res.json({ success: true, incident: inc });
});

// Simulations
router.get('/events/:eventId/simulations', (req: Request, res: Response) => {
  const { eventId } = req.params;
  const sims = db.get('simulations') || [];
  return res.json({ simulations: sims.filter((s: any) => s.eventId === eventId) });
});

router.get(['/simulations/:id', '/events/:eventId/simulations/:id'], (req: Request, res: Response) => {
  const simId = req.params.id;
  const sims = db.get('simulations') || [];
  const sim = sims.find((s: any) => s.id === simId);
  if (!sim) {
    return res.status(404).json({ error: 'Simulation not found' });
  }
  return res.json({ success: true, simulation: sim });
});

router.post('/events/:eventId/simulations', (req: Request, res: Response) => {
  const { eventId } = req.params;
  const { name, scenarioType, inputParameters, description } = req.body;
  const now = new Date().toISOString();

  const newSim: Simulation = {
    id: `sim_${crypto.randomUUID().slice(0, 8)}`,
    eventId: String(eventId),
    createdBy: 'admin',
    name: name || 'Simulation Run',
    description: description || '',
    scenarioType: scenarioType || 'GATE_CLOSURE',
    inputParameters: inputParameters || {},
    status: 'COMPLETED',
    results: {
      divertedAttendees: 1420,
      alternateGateWaitIncreaseMin: 2.4,
      pressureReliefPercentage: 38,
      recommendedReliefGate: 'Gate 2 (North-West Accessible)',
      estimatedQueueClearanceSeconds: 240
    },
    createdAt: now,
    completedAt: now
  };

  (db.get('simulations') || []).unshift(newSim);
  db.save();
  return res.status(201).json({ success: true, simulation: newSim, results: newSim.results });
});

// Recommendations
router.get('/events/:eventId/recommendations', (req: Request, res: Response) => {
  const { eventId } = req.params;
  try {
    const allRecs = db.get('recommendations') || [];
    const filtered = allRecs.filter((r: any) => r.eventId === eventId || !r.eventId);

    if (filtered.length === 0) {
      const gates = (db.get('gates') || []).filter((g: any) => g.eventId === eventId);
      const busyGate = gates.find((g: any) => g.status === 'OPEN' && (g.currentCount || 0) > 1500) || gates[0];
      const altGate = gates.find((g: any) => g.id !== busyGate?.id && g.status === 'OPEN') || gates[1];

      return res.json({
        success: true,
        recommendations: [
          {
            id: 'rec_auto_01',
            eventId,
            zoneId: busyGate?.zoneId || 'zone_north_plaza',
            type: 'GATE_REROUTE',
            action: altGate ? `Divert 30% inflow from ${busyGate?.name} to ${altGate.name}` : 'Throttle main entrance ingress',
            targetGateId: altGate?.id || 'gate_2',
            status: 'ACTIVE',
            confidence: 0.94,
            reason: 'Zone North Plaza density > 85% (Bottleneck Detected). Rerouting crowd.',
            timestamp: new Date().toISOString()
          },
          {
            id: 'rec_auto_02',
            eventId,
            zoneId: 'zone_east_concourse',
            type: 'STAFF_DISPATCH',
            action: 'Dispatch 2 guest liaisons to East Concourse queue',
            status: 'ACTIVE',
            confidence: 0.88,
            reason: 'Queue length accelerating > 80 persons.',
            timestamp: new Date().toISOString()
          }
        ]
      });
    }

    return res.json({ success: true, recommendations: filtered });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch recommendations', details: err.message });
  }
});

export default router;