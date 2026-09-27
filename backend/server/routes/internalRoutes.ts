import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db, CrowdTelemetry, MLPrediction, Alert } from '../db';
import { realtimeManager } from '../realtime';
import { runPredictionForZone } from '../predictionEngine';
import { verifyToken } from '../auth';
import { inferNugenDensity } from '../services/recommendationEngine';
import { predictNugenCrowd } from '../services/nugenService';
import { getLiveWeather } from '../services/weatherService';

const router = Router();
const INTERNAL_CV_API_KEY = process.env.INTERNAL_CV_API_KEY || 'eventflow_cv_secret_key';

// Middleware to authenticate trusted internal CV / ML services, admin testers, or dashboard EventSource
function internalAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] || req.headers['x-cv-key'] || (req.query.apiKey as string) || (req.query['x-api-key'] as string);
  if (apiKey && apiKey === INTERNAL_CV_API_KEY) {
    return next();
  }

  const token = (req.query.token as string) || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
  if (token) {
    const payload = verifyToken(token);
    if (payload && (payload.role === 'SUPER_ADMIN' || payload.role === 'EVENT_ADMIN' || payload.role === 'ATTENDEE')) {
      return next();
    }
  }

  // Allow read-only public or SSE dashboard clients if querying live telemetry
  if (req.method === 'GET') {
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized: Valid x-api-key header, query parameter, or Admin Bearer token required for internal CV telemetry endpoint.'
  });
}

router.use(internalAuth);

// GET /api/v1/internal/telemetry and /telemetry/stream (Supports SSE live stream and JSON list)
router.get(['/telemetry', '/telemetry/stream'], (req: Request, res: Response) => {
  const isSSE = req.headers.accept?.includes('text/event-stream') || req.path.endsWith('/stream') || req.query.stream === 'true' || req.query.sse === 'true';

  if (isSSE) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    const clientId = `internal_sse_${crypto.randomUUID().slice(0, 8)}`;
    const eventId = req.query.eventId as string;
    const token = req.query.token as string;
    let role = 'SUPER_ADMIN';
    if (token) {
      const payload = verifyToken(token);
      if (payload) role = payload.role;
    }

    realtimeManager.addClient(clientId, res, role, eventId);

    // Initial telemetry burst
    const recent = (db.get('crowdTelemetry') || []).slice(-10);
    res.write(`event: initial_telemetry\ndata: ${JSON.stringify({ telemetry: recent })}\n\n`);

    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch (_) {
        clearInterval(heartbeat);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      realtimeManager.removeClient(clientId);
    });
    return;
  }

  const eventId = req.query.eventId as string;
  const allTelem = db.get('crowdTelemetry') || [];
  const filtered = eventId ? allTelem.filter((t: any) => t.eventId === eventId) : allTelem;
  return res.json({
    success: true,
    telemetry: filtered.slice(-100)
  });
});

// POST /api/v1/internal/telemetry and /telemetry/ingest
router.post(['/telemetry', '/telemetry/ingest', '/ingest'], async (req: Request, res: Response) => {
  const {
    eventId,
    cameraId,
    zoneId,
    gateId,
    peopleCount,
    avgSpeedMps,
    inflow,
    outflow,
    netFlow,
    occupancyPercent,
    densityLevel,
    queueLength,
    averageDwellTime,
    timestamp
  } = req.body;

  // 1. Resolve event (allow flexible default for camera runners)
  const events = db.get('events') || [];
  const targetEvent = eventId 
    ? events.find((e: any) => e.id === eventId)
    : (events.find((e: any) => e.status === 'LIVE') || events[0]);

  if (!targetEvent) {
    return res.status(404).json({ error: `Event '${eventId || 'LIVE'}' does not exist.` });
  }

  const resolvedEventId = targetEvent.id;

  // 2. Resolve or find Gate if gateId is supplied
  const gates = db.get('gates') || [];
  const targetGate = gateId
    ? gates.find((g: any) => (g.eventId === resolvedEventId || !g.eventId) && (g.id === gateId || g.name.toLowerCase().includes(gateId.toLowerCase()) || g.gateCode?.toLowerCase() === gateId.toLowerCase()))
    : null;

  // 3. Resolve Zone & Camera
  const resolvedZoneId = zoneId || (targetGate ? (targetGate.zoneId || targetGate.id) : (gateId || 'zone_default'));
  const resolvedCamId = cameraId || (targetGate ? `cam_${targetGate.id}` : `cam_${resolvedZoneId}`);

  let camera = db.get('cameras').find(c => c.id === resolvedCamId);
  if (!camera) {
    camera = {
      id: resolvedCamId,
      eventId: resolvedEventId,
      venueId: 'v_default',
      zoneId: resolvedZoneId,
      name: `Sensor ${resolvedCamId}`,
      cameraCode: resolvedCamId.toUpperCase(),
      sourceType: 'VIDEO_FILE',
      sourceUrl: `./cameras/${resolvedCamId}/feed.mp4`,
      status: 'ONLINE',
      isActive: true,
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.get('cameras').push(camera);
  }

  let zone = db.get('crowdZones').find(z => z.id === resolvedZoneId);
  if (!zone) {
    zone = {
      id: resolvedZoneId,
      eventId: resolvedEventId,
      venueId: 'v_default',
      name: (targetGate ? targetGate.name : resolvedZoneId.replace(/_/g, ' ')).toUpperCase(),
      description: 'Dynamic detection zone',
      capacity: targetGate ? targetGate.capacity : 3500,
      warningThreshold: 2500,
      criticalThreshold: 3200,
      latitude: targetGate ? targetGate.latitude : 18.9894,
      longitude: targetGate ? targetGate.longitude : 73.1175,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.get('crowdZones').push(zone);
  }

  // 4. Numerical values & Gate Count Sync
  const pCount = Number(peopleCount) || 0;
  if (targetGate) {
    targetGate.currentCount = pCount;
    targetGate.updatedAt = new Date().toISOString();
  }

  const speed = avgSpeedMps !== undefined ? Number(avgSpeedMps) : 1.10;
  const inF = Number(inflow) || 0;
  const outF = Number(outflow) || 0;
  const nFlow = netFlow !== undefined ? Number(netFlow) : inF - outF;
  const occ = Number(occupancyPercent) || Math.min(100, Math.round((pCount / (zone.capacity || 3000)) * 100));
  const qLen = queueLength !== undefined ? Number(queueLength) : 0;
  const dwell = averageDwellTime !== undefined ? Number(averageDwellTime) : 180;

  // 5. Live Weather & Nugen AI Alignment Pipeline
  const liveWeather = await getLiveWeather();
  const nugenPrediction = await predictNugenCrowd({
    peopleCount: pCount,
    occupancyPercent: occ,
    inflow: inF,
    outflow: outF,
    avgSpeedMps: speed,
    zoneId: resolvedZoneId
  }, liveWeather);

  const validDensities = ['LOW', 'MODERATE', 'BUSY', 'CRITICAL'];
  const density = densityLevel && validDensities.includes(densityLevel)
    ? densityLevel
    : nugenPrediction.densityLevel;

  const recordTime = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

  const newTelemetry: CrowdTelemetry = {
    id: `telem_${crypto.randomUUID()}`,
    eventId: resolvedEventId,
    cameraId: resolvedCamId,
    zoneId: resolvedZoneId,
    timestamp: recordTime,
    peopleCount: pCount,
    avgSpeedMps: speed,
    inflow: inF,
    outflow: outF,
    netFlow: nFlow,
    occupancyPercent: occ,
    densityLevel: density,
    queueLength: qLen,
    averageDwellTime: dwell,
    createdAt: new Date().toISOString()
  };

  const crowdTelemetry = db.get('crowdTelemetry');
  crowdTelemetry.push(newTelemetry);

  // Update camera status & heartbeat
  camera.lastSeenAt = new Date().toISOString();
  camera.status = 'ONLINE';

  // 6. Dual Control Execution Loop
  if (density === 'CRITICAL' || occ >= 85) {
    const closedGate = gates.find((g: any) => (g.eventId === resolvedEventId || !g.eventId) && g.status === 'CLOSED');

    if (closedGate) {
      if (targetEvent.autonomousMode) {
        // AI Control ON: Auto-execute decision immediately
        closedGate.status = 'OPEN';
        closedGate.updatedAt = new Date().toISOString();

        const auditRecord = {
          id: `audit_ai_${crypto.randomUUID().slice(0, 8)}`,
          userId: 'system_ai_autopilot',
          eventId: resolvedEventId,
          action: 'GATE_OPENED_AUTONOMOUS',
          resourceType: 'GATE',
          resourceId: closedGate.id,
          metadata: {
            action: 'OPEN',
            gateName: closedGate.name,
            reason: `High Density: YOLO CV reported ${occ}% occupancy in ${zone.name} - Nugen density: ${density}`,
            confidence: nugenPrediction.confidence || 0.95,
            executedAt: new Date().toISOString(),
            source: 'system_ai_autopilot',
            model: nugenPrediction.model
          },
          createdAt: new Date().toISOString()
        };
        (db.get('auditLogs') || []).unshift(auditRecord);

        // Mark any existing pending recommendation as executed
        const recs = db.get('recommendations') || [];
        recs.forEach((r: any) => {
          if (r.eventId === resolvedEventId && r.suggestedGateId === closedGate.id && r.status === 'ACTIVE') {
            r.status = 'EXECUTED';
            r.resolvedAt = new Date().toISOString();
          }
        });

        realtimeManager.broadcast('gate_status_changed', {
          gateId: closedGate.id,
          gateName: closedGate.name,
          status: 'OPEN',
          reason: 'High Density',
          confidence: nugenPrediction.confidence || 0.95,
          source: 'system_ai_autopilot',
          nugenDecision: nugenPrediction.autopilotDecision
        }, resolvedEventId);

        realtimeManager.broadcast('route_updated', {
          eventId: resolvedEventId,
          gateId: closedGate.id,
          action: 'INGRESS_EXPANDED',
          notice: `Gate ${closedGate.name} auto-opened due to high density (${occ}%). Traffic rerouted.`
        }, resolvedEventId);
      } else {
        // Manual Mode (autonomousMode == false): Require explicit human click on Recommended Action
        const recs = db.get('recommendations') || [];
        const existingActiveRec = recs.find(
          (r: any) => r.eventId === resolvedEventId && r.suggestedGateId === closedGate.id && r.status === 'ACTIVE'
        );

        if (!existingActiveRec) {
          const newRec: any = {
            id: `rec_${crypto.randomUUID().slice(0, 8)}`,
            eventId: resolvedEventId,
            zoneId: resolvedZoneId,
            recommendationType: 'OPEN_GATE',
            type: 'OPEN_GATE',
            action: `Open ${closedGate.name}`,
            title: `Recommended Gate Action: Open ${closedGate.name}`,
            description: `High density (${occ}%) detected in ${zone.name}. Nugen Density: ${density}. Manual approval required to open ${closedGate.name}.`,
            reason: `High Density: ${occ}% occupancy in ${zone.name}`,
            suggestedGateId: closedGate.id,
            suggestedAction: 'OPEN',
            confidence: nugenPrediction.confidence || 0.95,
            priority: 'CRITICAL',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            resolvedAt: null
          };
          recs.unshift(newRec);

          realtimeManager.broadcast('recommendation_created', newRec, resolvedEventId);
        }
      }
    }
  }

  // 7. Automated Critical Alert Detection
  const alerts = db.get('alerts');
  const isBottleneck = speed < 0.35 && (density === 'CRITICAL' || density === 'BUSY');

  if (density === 'CRITICAL' || isBottleneck) {
    const existingActiveAlert = alerts.find(
      a => a.eventId === resolvedEventId && a.zoneId === resolvedZoneId && a.status === 'ACTIVE'
    );
    if (!existingActiveAlert) {
      const autoAlert: Alert = {
        id: `alert_auto_${crypto.randomUUID().slice(0, 8)}`,
        eventId: resolvedEventId,
        zoneId: resolvedZoneId,
        alertType: isBottleneck ? 'CROWD_SURGE' : 'CROWD_DENSITY',
        severity: 'CRITICAL',
        title: isBottleneck ? `BOTTLENECK DETECTED: ${zone.name}` : `CRITICAL CROWD DENSITY: ${zone.name}`,
        publicMessage: `Zone ${zone.name} is experiencing high density. Please follow digital signs to alternate gates.`,
        internalMessage: `YOLO CV telemetry reported velocity (${speed.toFixed(2)} m/s) and ${pCount} persons (${occ}% occupancy).`,
        status: 'ACTIVE',
        createdBy: 'system_cv_service',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resolvedAt: null
      };
      alerts.unshift(autoAlert);
      realtimeManager.broadcast('alert_created', { alertId: autoAlert.id, title: autoAlert.title, severity: 'CRITICAL' }, resolvedEventId);
    }
  }

  db.save();

  // 8. Broadcast real-time telemetry to all connected dashboards and SSE clients
  realtimeManager.broadcast('crowd_status_updated', {
    eventId: resolvedEventId,
    telemetry: newTelemetry,
    zoneName: zone.name,
    cameraName: camera.name,
    gateId: targetGate ? targetGate.id : null,
    densityLevel: density,
    nugenSource: nugenPrediction.source,
    nugenPrediction,
    weather: liveWeather
  }, resolvedEventId);

  // Trigger background prediction run
  try {
    runPredictionForZone(resolvedEventId, resolvedZoneId);
  } catch (err) {
    console.error('Prediction calculation error:', err);
  }

  return res.status(201).json({
    success: true,
    telemetryId: newTelemetry.id,
    eventId: resolvedEventId,
    zoneId: resolvedZoneId,
    densityLevel: density,
    netFlow: newTelemetry.netFlow,
    avgSpeedMps: newTelemetry.avgSpeedMps,
    nugenSource: nugenPrediction.source,
    nugenPrediction,
    weather: liveWeather,
    recordedAt: newTelemetry.timestamp
  });
});

// POST /api/v1/internal/predictions
router.post('/predictions', (req: Request, res: Response) => {
  const {
    eventId,
    zoneId,
    predictionType,
    forecastFor,
    predictedPeopleCount,
    predictedOccupancyPercent,
    predictedInflow,
    predictedOutflow,
    riskLevel,
    confidence,
    modelName,
    modelVersion,
    inputWindow
  } = req.body;

  if (!eventId || !zoneId || !predictedPeopleCount) {
    return res.status(400).json({ error: 'eventId, zoneId, and predictedPeopleCount are required.' });
  }

  const now = new Date().toISOString();
  const newPrediction: MLPrediction = {
    id: `pred_${crypto.randomUUID()}`,
    eventId,
    zoneId,
    predictionType: predictionType || 'CROWD_COUNT',
    predictionTime: now,
    forecastFor: forecastFor || new Date(Date.now() + 300000).toISOString(),
    predictedPeopleCount: Number(predictedPeopleCount),
    predictedOccupancyPercent: Number(predictedOccupancyPercent) || 0,
    predictedInflow: Number(predictedInflow) || 0,
    predictedOutflow: Number(predictedOutflow) || 0,
    riskLevel: riskLevel || 'LOW',
    confidence: Number(confidence) || 0.85,
    modelName: modelName || 'External-Python-ML',
    modelVersion: modelVersion || '1.0.0',
    inputWindow: inputWindow || '300S_AGGREGATED',
    createdAt: now
  };

  db.get('mlPredictions').push(newPrediction);
  db.save();

  return res.status(201).json({ success: true, prediction: newPrediction });
});

export default router;