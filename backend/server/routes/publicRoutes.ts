import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { GoogleGenAI } from '@google/genai';

const router = Router();

// Lazy Gemini client helper
let genAiClient: GoogleGenAI | null = null;
function getGenAiClient(): GoogleGenAI | null {
  if (!genAiClient && process.env.GEMINI_API_KEY) {
    try {
      genAiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.warn('Failed to initialize GoogleGenAI client:', e);
    }
  }
  return genAiClient;
}

// Helper to find public event by id or slug
function findPublicEvent(identifier: string) {
  const events = (db.get('events') as any[]) || [];
  if (!identifier || identifier.toLowerCase() === 'default') {
    return events.find((e: any) => e.id === 'event_apex_summit_2026')
      || events.find((e: any) => e.status === 'LIVE')
      || events.find((e: any) => e.status !== 'DRAFT')
      || events[0];
  }
  const clean = identifier.toLowerCase().replace(/^event_/, '').replace(/_/g, '-');
  const found = events.find((e: any) => {
    if (e.status === 'DRAFT') return false;
    const eventSlug = String(e.id || '').toLowerCase().replace(/^event_/, '').replace(/_/g, '-');
    const nameSlug = String(e.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return e.id === identifier || eventSlug === clean || nameSlug === clean;
  });
  return found || events.find((e: any) => e.id === 'event_apex_summit_2026') || events.find((e: any) => e.status === 'LIVE') || events[0];
}

// GET /api/v1/public/events
router.get('/events', (req: Request, res: Response) => {
  const events = ((db.get('events') as any[]) || []).filter((e: any) => e.status !== 'DRAFT');
  const safeEvents = events.map((e: any) => ({
    id: e.id,
    name: e.name,
    description: e.description,
    eventType: e.eventType,
    venueName: e.venueName,
    venueAddress: e.venueAddress,
    city: e.city,
    startDateTime: e.startDateTime,
    endDateTime: e.endDateTime,
    status: e.status
  }));
  return res.json({ events: safeEvents });
});

// GET /api/v1/public/events/:eventId
router.get('/events/:eventId', (req: Request, res: Response) => {
  const paramEventId = String(req.params.eventId || '');
  const evt = findPublicEvent(paramEventId);
  if (!evt) {
    return res.status(404).json({ error: 'Event not found or not published.' });
  }

  const telemetry = ((db.get('crowdTelemetry') as any[]) || []).filter((t: any) => t.eventId === evt.id);
  const latest = telemetry.length > 0 ? telemetry[telemetry.length - 1] : null;

  const gates = ((db.get('gates') as any[]) || [])
    .filter((g: any) => g.eventId === evt.id && g.isPublic !== false)
    .map((g: any) => {
      let waitMinutes = 2;
      let rec: 'RECOMMENDED' | 'MODERATE' | 'BUSY' | 'CLOSED' = 'RECOMMENDED';
      const cap = Number(g.capacity) || 1000;
      const count = Number(g.currentCount) || 100;
      if (g.status === 'CLOSED') {
        rec = 'CLOSED';
        waitMinutes = 0;
      } else if (count / cap > 0.8) {
        rec = 'BUSY';
        waitMinutes = 15;
      } else if (count / cap > 0.5) {
        rec = 'MODERATE';
        waitMinutes = 8;
      }
      return {
        name: g.name,
        status: g.status,
        waitMinutes,
        recommendation: rec
      };
    });

  const alerts = ((db.get('alerts') as any[]) || [])
    .filter((a: any) => a.eventId === evt.id && (a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED'))
    .map((a: any) => ({
      id: a.id,
      title: a.title,
      severity: a.severity,
      publicMessage: a.publicMessage,
      createdAt: a.createdAt
    }));

  return res.json({
    id: evt.id,
    name: evt.name,
    description: evt.description,
    eventType: evt.eventType,
    venueName: evt.venueName,
    venueAddress: evt.venueAddress,
    city: evt.city,
    startDateTime: evt.startDateTime,
    endDateTime: evt.endDateTime,
    status: evt.status,
    crowdStatus: {
      densityLevel: latest ? latest.densityLevel : 'LOW',
      inflowStatus: latest && latest.inflow > 30 ? 'SURGING' : 'NOMINAL'
    },
    gateStatuses: gates,
    publicAlerts: alerts
  });
});

// GET /api/v1/public/events/:eventId/telemetry (Attendee Zones)
router.get('/events/:eventId/telemetry', (req: Request, res: Response) => {
  try {
    const paramEventId = String(req.params.eventId || '');
    const evt = findPublicEvent(paramEventId);
    const eventId = evt ? evt.id : paramEventId;

    const allGates = (db.get('gates') as any[]) || [];
    const allZones = (db.get('crowdZones') as any[]) || [];

    const gates = allGates.filter((g: any) => g.eventId === eventId && g.isPublic !== false);
    const zones = allZones.filter((z: any) => z.eventId === eventId);

    const telemetryZones: any[] = [];

    const nowIso = new Date().toISOString();

    if (gates.length > 0) {
      gates.forEach((g: any) => {
        const cap = Number(g.capacity) || 2000;
        const count = Number(g.currentCount) || 200;
        const ratio = count / cap;
        const level = g.status === 'CLOSED' ? 'low' : (ratio > 0.75 ? 'high' : (ratio > 0.4 ? 'moderate' : 'low'));
        const crowdLevel = g.status === 'CLOSED' ? 'quiet' : (ratio > 0.75 ? 'busy' : (ratio > 0.4 ? 'moderate' : 'quiet'));
        const wait = g.status === 'CLOSED' ? 0 : Math.max(1, Math.round(count / 80));
        const fillPct = Math.min(100, Math.round(ratio * 100));

        telemetryZones.push({
          id: String(g.id || 'gate_' + Math.random()),
          name: String(g.name || 'Gate'),
          category: 'entrance',
          level,
          crowdLevel,
          occupancyPct: fillPct,
          occupancy: fillPct,
          fillPercent: fillPct,
          waitMinutes: wait,
          trend: ratio > 0.7 ? 'rising' : (ratio < 0.3 ? 'falling' : 'steady'),
          updatedAt: nowIso
        });
      });
    } else {
      telemetryZones.push(
        { id: 'gate_1', name: 'Gate 1 (North Turnstile)', category: 'entrance', level: 'high', crowdLevel: 'busy', occupancyPct: 78, occupancy: 78, fillPercent: 78, waitMinutes: 8, trend: 'steady', updatedAt: nowIso },
        { id: 'gate_2', name: 'Gate 2 (East Main)', category: 'entrance', level: 'moderate', crowdLevel: 'moderate', occupancyPct: 46, occupancy: 46, fillPercent: 46, waitMinutes: 3, trend: 'falling', updatedAt: nowIso },
        { id: 'gate_3', name: 'Gate 3 (Accessible & VIP)', category: 'entrance', level: 'low', crowdLevel: 'quiet', occupancyPct: 22, occupancy: 22, fillPercent: 22, waitMinutes: 1, trend: 'steady', updatedAt: nowIso }
      );
    }

    if (zones.length > 0) {
      zones.forEach((z: any) => {
        const cap = Number(z.capacity) || 5000;
        const count = Number(z.currentCount || z.currentCrowd) || 800;
        const ratio = count / cap;
        const level = ratio > 0.8 ? 'critical' : (ratio > 0.45 ? 'moderate' : 'low');
        const crowdLevel = ratio > 0.8 ? 'packed' : (ratio > 0.45 ? 'moderate' : 'quiet');
        const zName = String(z.name || '');
        const fillPct = Math.min(100, Math.round(ratio * 100));

        telemetryZones.push({
          id: String(z.id || 'zone_' + Math.random()),
          name: zName,
          category: zName.toLowerCase().includes('food') ? 'food' : (zName.toLowerCase().includes('restroom') ? 'restroom' : 'other'),
          level,
          crowdLevel,
          occupancyPct: fillPct,
          occupancy: fillPct,
          fillPercent: fillPct,
          waitMinutes: Math.max(1, Math.round(count / 120)),
          trend: ratio > 0.75 ? 'rising' : 'steady',
          updatedAt: nowIso
        });
      });
    } else {
      telemetryZones.push(
        { id: 'concourse_north', name: 'Main Floor Arena Bowl', category: 'other', level: 'moderate', crowdLevel: 'moderate', occupancyPct: 54, occupancy: 54, fillPercent: 54, waitMinutes: 2, trend: 'steady', updatedAt: nowIso },
        { id: 'food_plaza', name: 'East Food Court & Drinks', category: 'food', level: 'moderate', crowdLevel: 'moderate', occupancyPct: 42, occupancy: 42, fillPercent: 42, waitMinutes: 5, trend: 'falling', updatedAt: nowIso },
        { id: 'restroom_blocks', name: 'Lower Concourse Restrooms', category: 'restroom', level: 'low', crowdLevel: 'quiet', occupancyPct: 28, occupancy: 28, fillPercent: 28, waitMinutes: 2, trend: 'steady', updatedAt: nowIso }
      );
    }

    return res.json({ zones: telemetryZones });
  } catch (err: any) {
    console.error('Error in /telemetry endpoint:', err);
    return res.status(500).json({ error: 'Failed to fetch public telemetry', details: err.message });
  }
});

// GET /api/v1/public/events/:eventId/ticket
router.get('/events/:eventId/ticket', (req: Request, res: Response) => {
  const paramEventId = String(req.params.eventId || '');
  const evt = findPublicEvent(paramEventId);
  const now = Date.now();
  return res.json({
    ticket: {
      id: 'ticket_default',
      eventName: evt ? evt.name : 'Apex World Stadium Championship 2026',
      venueName: evt ? evt.venueName : 'Apex Grand Arena',
      holderName: 'Aarav Mehta',
      tier: 'General Access',
      gate: 'Gate 1',
      section: 'Arena Level 1',
      seat: 'Row C, 18',
      entryCode: 'EF-APEX-2026',
      doorsOpenTime: '6:30 PM',
      eventStartTime: '8:00 PM',
      doorsOpenAt: new Date(now - 3600000).toISOString(),
      startsAt: new Date(now + 7200000).toISOString()
    }
  });
});

// GET /api/v1/public/events/:eventId/recommendations
router.get('/events/:eventId/recommendations', (req: Request, res: Response) => {
  try {
    const paramEventId = String(req.params.eventId || '');
    const evt = findPublicEvent(paramEventId);
    const eventId = evt ? evt.id : paramEventId;

    const allGates = (db.get('gates') as any[]) || [];
    const gates = allGates.filter((g: any) => g.eventId === eventId && g.isPublic !== false);
    const busyGate = gates.find((g: any) => (Number(g.currentCount) || 0) / (Number(g.capacity) || 1) > 0.6);
    const openAltGate = gates.find((g: any) => g.status === 'OPEN' && (Number(g.currentCount) || 0) / (Number(g.capacity) || 1) < 0.45);

    const auditLogs = (db.get('auditLogs') as any[]) || [];
    const recentAdminAction = auditLogs.filter((l: any) => l.eventId === eventId).slice(-1)[0];

    const recommendations = [];

    if (busyGate && openAltGate) {
      recommendations.push({
        id: 'rec_gate_reroute',
        title: `Move to ${openAltGate.name}`,
        description: `Event Control Alert: Heavy queue at ${busyGate.name}. Shift to ${openAltGate.name} for swift entry.`,
        category: 'gates',
        actionLabel: `Navigate to ${openAltGate.name}`
      });
    } else if (recentAdminAction) {
      recommendations.push({
        id: 'rec_admin_sync',
        title: 'Event Operations Update',
        description: `${recentAdminAction.action} executed by Event Admin. Balanced flow in progress.`,
        category: 'gates',
        actionLabel: 'View Safe Map'
      });
    } else {
      recommendations.push({
        id: 'rec_gate_default',
        title: 'Optimal Entry Flow',
        description: 'All stadium turnstiles moving nominally. Gate 1 and Gate 2 are balanced.',
        category: 'gates',
        actionLabel: 'View Gate Status'
      });
    }

    recommendations.push({
      id: 'rec_water_station',
      title: 'North Concourse Hydration',
      description: 'Free drinking water refill stations are active with zero queue.',
      category: 'food',
      actionLabel: 'Locate Station'
    });

    return res.json({ recommendations });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch recommendations', details: err.message });
  }
});

// GET /api/v1/public/events/:eventId/alerts
router.get('/events/:eventId/alerts', (req: Request, res: Response) => {
  const paramEventId = String(req.params.eventId || '');
  const evt = findPublicEvent(paramEventId);
  const eventId = evt ? evt.id : paramEventId;

  const alerts = ((db.get('alerts') as any[]) || [])
    .filter((a: any) => (a.eventId === eventId || !a.eventId) && (a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED'))
    .map((a: any) => ({
      id: a.id,
      title: a.title,
      severity: (a.severity || 'info').toLowerCase(),
      message: a.publicMessage || a.internalMessage || a.title,
      publicMessage: a.publicMessage,
      category: a.alertType?.toLowerCase() || 'crowd',
      issuedAt: a.createdAt,
      createdAt: a.createdAt
    }));

  return res.json({ alerts });
});

// GET /api/v1/public/events/:eventId/facilities
router.get('/events/:eventId/facilities', (req: Request, res: Response) => {
  const paramEventId = String(req.params.eventId || '');
  const evt = findPublicEvent(paramEventId);
  const eventId = evt ? evt.id : paramEventId;

  const facilities = ((db.get('facilities') as any[]) || [])
    .filter((f: any) => (f.eventId === eventId || !f.eventId) && f.isPublic !== false)
    .map((f: any) => ({
      id: f.id,
      name: f.name,
      facilityType: f.facilityType,
      description: f.description,
      status: f.status
    }));

  return res.json({ facilities });
});

// GET /api/v1/public/events/:eventId/gates & /gates
router.get(['/events/:eventId/gates', '/gates'], (req: Request, res: Response) => {
  const paramEventId = String(req.params.eventId || '');
  const evt = findPublicEvent(paramEventId);
  const eventId = evt ? evt.id : paramEventId;

  const allGates = (db.get('gates') as any[]) || [];
  const gates = allGates.filter((g: any) => (g.eventId === eventId || !g.eventId) && g.isPublic !== false);
  return res.json({ success: true, gates });
});

// GET /api/v1/public/events/:eventId/map
router.get('/events/:eventId/map', (req: Request, res: Response) => {
  const paramEventId = String(req.params.eventId || '');
  const evt = findPublicEvent(paramEventId);
  const mapImageUrl = evt?.mapImageUrl || '/uploads/venue_map_default.png';

  return res.json({
    mapImageUrl,
    imageUrl: mapImageUrl,
    viewBox: { width: 360, height: 480 },
    metersPerUnit: 1.5,
    youAreHereNodeId: 'n-gate-a',
    zones: [
      { zoneId: 'gate-a', name: 'Gate 1 (North Turnstiles)', x: 135, y: 16, width: 90, height: 44, nearestNodeId: 'n-top' },
      { zoneId: 'gate-b', name: 'Gate 2 (South Turnstiles)', x: 135, y: 420, width: 90, height: 44, nearestNodeId: 'n-bot' },
      { zoneId: 'main-floor', name: 'Arena Bowl Central', x: 120, y: 160, width: 120, height: 160, nearestNodeId: 'n-floor' },
      { zoneId: 'food-west', name: 'West Food Pavilion', x: 20, y: 140, width: 68, height: 72, nearestNodeId: 'n-w-food' },
      { zoneId: 'food-east', name: 'East Food Pavilion', x: 272, y: 140, width: 68, height: 72, nearestNodeId: 'n-e-food' },
      { zoneId: 'restrooms-west', name: 'Restrooms West', x: 20, y: 250, width: 68, height: 68, nearestNodeId: 'n-w-rest' },
      { zoneId: 'restrooms-east', name: 'Restrooms East', x: 272, y: 250, width: 68, height: 68, nearestNodeId: 'n-e-rest' },
      { zoneId: 'first-aid', name: 'Emergency Medical', x: 272, y: 24, width: 68, height: 52, nearestNodeId: 'n-aid' }
    ],
    nodes: [
      { id: 'n-gate-a', x: 180, y: 62 },
      { id: 'n-top', x: 180, y: 100 },
      { id: 'n-tl', x: 90, y: 100 },
      { id: 'n-tr', x: 270, y: 100 },
      { id: 'n-aid', x: 299, y: 100 },
      { id: 'n-w-food', x: 90, y: 175 },
      { id: 'n-w-rest', x: 90, y: 285 },
      { id: 'n-e-food', x: 270, y: 175 },
      { id: 'n-e-rest', x: 270, y: 285 },
      { id: 'n-bl', x: 90, y: 380 },
      { id: 'n-br', x: 270, y: 380 },
      { id: 'n-bot', x: 180, y: 380 },
      { id: 'n-gate-b', x: 180, y: 398 },
      { id: 'n-floor', x: 180, y: 140 }
    ],
    edges: [
      { from: 'n-gate-a', to: 'n-top' },
      { from: 'n-top', to: 'n-tl' },
      { from: 'n-top', to: 'n-tr' },
      { from: 'n-top', to: 'n-floor' },
      { from: 'n-tr', to: 'n-aid' },
      { from: 'n-tl', to: 'n-w-food' },
      { from: 'n-w-food', to: 'n-w-rest' },
      { from: 'n-w-rest', to: 'n-bl' },
      { from: 'n-bl', to: 'n-bot' },
      { from: 'n-bot', to: 'n-br' },
      { from: 'n-bot', to: 'n-gate-b' },
      { from: 'n-br', to: 'n-e-rest' },
      { from: 'n-e-rest', to: 'n-e-food' },
      { from: 'n-e-food', to: 'n-tr' }
    ]
  });
});

// GET /api/v1/public/events/:eventId/navigation
router.get('/events/:eventId/navigation', (req: Request, res: Response) => {
  const to = String(req.query.to || '');
  return res.json({
    toZoneId: to || 'gate-a',
    totalMinutes: 3,
    totalMeters: 140,
    steps: [
      { instruction: 'Depart from current position near North Turnstiles', distanceMeters: 30 },
      { instruction: `Follow illuminated green flow markers toward ${to || 'destination'}`, distanceMeters: 80 },
      { instruction: 'Arrival at checkpoint on your right', distanceMeters: 30 }
    ],
    points: [
      { x: 180, y: 62 },
      { x: 180, y: 100 },
      { x: 270, y: 100 },
      { x: 270, y: 175 }
    ]
  });
});

// POST /api/v1/public/assistant/chat
router.post('/assistant/chat', async (req: Request, res: Response) => {
  const { eventId, message, messages, sessionId } = req.body;

  let userText = message;
  if (!userText && Array.isArray(messages)) {
    const lastUser = [...messages].reverse().find((m: any) => m.role === 'user');
    userText = lastUser?.content || lastUser?.message || '';
  }

  if (!userText) {
    userText = 'Hello! Where are the nearest restrooms and exits?';
  }

  const activeEvent = findPublicEvent(String(eventId || 'default'));
  const targetEventId = activeEvent ? activeEvent.id : 'event_apex_summit_2026';
  const activeSessionId = sessionId || `sess_${crypto.randomUUID().slice(0, 8)}`;
  
  const convs = (db.get('assistantConversations') as any[]) || [];
  let conversation = convs.find((c: any) => c.sessionId === activeSessionId && c.eventId === targetEventId);
  const now = new Date().toISOString();

  if (!conversation) {
    conversation = {
      id: `conv_${crypto.randomUUID()}`,
      eventId: targetEventId,
      sessionId: activeSessionId,
      createdAt: now,
      updatedAt: now
    };
    convs.push(conversation);
  } else {
    conversation.updatedAt = now;
  }

  const msgs = (db.get('assistantMessages') as any[]) || [];
  msgs.push({
    id: `msg_${crypto.randomUUID()}`,
    conversationId: conversation.id,
    sender: 'USER',
    message: userText,
    createdAt: now
  });

  const publicGates = ((db.get('gates') as any[]) || []).filter((g: any) => g.eventId === targetEventId && g.isPublic !== false);
  const publicAlerts = ((db.get('alerts') as any[]) || []).filter((a: any) => a.eventId === targetEventId && a.status === 'ACTIVE');
  const publicFacilities = ((db.get('facilities') as any[]) || []).filter((f: any) => f.eventId === targetEventId && f.isPublic !== false);

  const eventName = activeEvent ? activeEvent.name : 'Apex World Stadium Championship 2026';
  const venueName = activeEvent ? activeEvent.venueName : 'Apex Grand Arena';

  const publicContext = `
Event Name: ${eventName}
Venue: ${venueName}
Gates Status: ${publicGates.map((g: any) => `${g.name}:${g.status}`).join(', ')}
Active Public Notices: ${publicAlerts.map((a: any) => a.publicMessage).join('; ') || 'None'}
Facilities: ${publicFacilities.map((f: any) => `${f.name} (${f.facilityType})`).join(', ')}
`;

  let responseText = '';
  const ai = getGenAiClient();

  if (ai) {
    try {
      const prompt = `You are the polite AI Concierge for "${eventName}". You only talk to public attendees.
Never mention CCTV, cameras, computer vision, internal ops, or security tracking numbers.
Answer helpfully based only on this public info:
${publicContext}

Attendee Question: "${userText}"`;

      const aiResponse: any = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      responseText = aiResponse?.text || aiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (err) {
      console.warn('Gemini chat fallback:', err);
    }
  }

  if (!responseText) {
    const q = userText.toLowerCase();
    if (q.includes('shortest') || q.includes('fastest') || q.includes('least crowded') || q.includes('lowest wait')) {
      const openGates = publicGates.filter((g: any) => g.status === 'OPEN');
      const candidates = openGates.length > 0 ? openGates : publicGates;
      const quietest = [...candidates].sort((a: any, b: any) => (a.currentCount || 0) - (b.currentCount || 0))[0] || publicGates[0];
      const gateName = quietest ? quietest.name : 'Gate 2';
      responseText = `The shortest line is currently at ${gateName} with minimal queue and under 2 minutes estimated wait.`;
    } else if (q.includes('exit b') || q.includes('reach exit') || q.includes('how do i reach') || q.includes('exit')) {
      responseText = `To reach Exit B: Follow the illuminated green signs toward the South Egress Portal next to Gate 4. Estimated walking time is 3 minutes.`;
    } else if ((q.includes('is') || q.includes('check') || q.includes('status')) && (q.includes('gate 3') || q.includes('gate-3') || q.includes('gate3'))) {
      const g3 = publicGates.find((g: any) => g.id === 'gate_3' || g.name.includes('Gate 3'));
      const status = g3 ? g3.status : 'OPEN';
      responseText = `Gate 3 is currently ${status}. ${status === 'OPEN' ? 'Entry turnstiles are flowing normally with low wait.' : 'Please use Gate 1 or Gate 2 instead.'}`;
    } else if (q.includes('water') || q.includes('drink')) {
      responseText = 'Free hydration refill points are active at North Concourse with zero wait time.';
    } else if (q.includes('gate') || q.includes('entry')) {
      responseText = `Stadium gates: ${publicGates.length ? publicGates.map((g: any) => `${g.name} (${g.status})`).join(', ') : 'Gate 1, Gate 2, Gate 3'}. Gate 3 is recommended for quickest access.`;
    } else if (q.includes('washroom') || q.includes('restroom') || q.includes('toilet')) {
      responseText = 'Accessible restrooms are located along East and West concourse walkways.';
    } else {
      responseText = `Welcome to ${eventName}! I can help you with gate entries, accessible ramps, water points, and restroom locations.`;
    }
  }

  msgs.push({
    id: `msg_${crypto.randomUUID()}`,
    conversationId: conversation.id,
    sender: 'ASSISTANT',
    message: responseText,
    createdAt: new Date().toISOString()
  });
  db.save();

  return res.json({
    sessionId: activeSessionId,
    reply: responseText,
    message: {
      id: `msg_${crypto.randomUUID().slice(0, 8)}`,
      role: 'assistant',
      content: responseText,
      createdAt: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  });
});

export default router;