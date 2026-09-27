import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { EventData, AuditRecord, Gate, Zone, AlertCard, IncidentItem } from './src/types.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// In-Memory Database for Events & Isolation
const initialEvents: Record<string, EventData> = {
  'evt_mumbai_expo_2026': {
    id: 'evt_mumbai_expo_2026',
    name: 'Mumbai Grand Expo & Concert 2026',
    venue: 'Jio World Convention Centre, Mumbai',
    dateTime: 'Today, 18:00 - 23:30 IST (Rush Hour Active)',
    capacity: 10000,
    currentCrowd: 8420,
    occupancyPercent: 84,
    crowdStatus: 'BUSY',
    assignedAdminId: 'admin_hrutika',
    assignedAdminName: 'Hrutika Chitnis',
    gates: [
      {
        id: 'gate_1',
        name: 'Gate 1 (East Concourse)',
        number: 1,
        status: 'OPEN',
        currentCrowd: 2150,
        capacity: 2500,
        flowRate: 65,
        zoneId: 'zone_a',
        direction: 'ENTRY',
        lastActionTime: '18:15',
      },
      {
        id: 'gate_2',
        name: 'Gate 2 (Main Plaza)',
        number: 2,
        status: 'OPEN',
        currentCrowd: 1240,
        capacity: 1300,
        flowRate: 84,
        zoneId: 'zone_b',
        direction: 'ENTRY',
        lastActionTime: '18:30',
      },
      {
        id: 'gate_3',
        name: 'Gate 3 (VIP & Auxiliary)',
        number: 3,
        status: 'CLOSED',
        currentCrowd: 0,
        capacity: 1500,
        flowRate: 0,
        zoneId: 'zone_b',
        direction: 'ENTRY',
        lastActionTime: '17:00',
      },
      {
        id: 'gate_4',
        name: 'Gate 4 (North Wing)',
        number: 4,
        status: 'OPEN',
        currentCrowd: 2850,
        capacity: 3200,
        flowRate: 72,
        zoneId: 'zone_c',
        direction: 'BIDIRECTIONAL',
        lastActionTime: '18:00',
      },
      {
        id: 'gate_5',
        name: 'Gate 5 (South Transit)',
        number: 5,
        status: 'OPEN',
        currentCrowd: 2180,
        capacity: 2500,
        flowRate: -45,
        zoneId: 'zone_d',
        direction: 'EXIT',
        lastActionTime: '18:10',
      },
    ],
    zones: [
      {
        id: 'zone_a',
        code: 'Zone A',
        name: 'East Concourse & Registration',
        crowdCount: 2150,
        capacity: 2500,
        density: 86,
        status: 'BUSY',
        x: 60,
        y: 80,
        width: 180,
        height: 160,
      },
      {
        id: 'zone_b',
        code: 'Zone B',
        name: 'Main Stage & Performance Arena',
        crowdCount: 3120,
        capacity: 3400,
        density: 92,
        status: 'WARNING',
        x: 270,
        y: 80,
        width: 250,
        height: 200,
      },
      {
        id: 'zone_c',
        code: 'Zone C',
        name: 'North Exhibition Wing',
        crowdCount: 1650,
        capacity: 2500,
        density: 66,
        status: 'NORMAL',
        x: 550,
        y: 80,
        width: 200,
        height: 160,
      },
      {
        id: 'zone_d',
        code: 'Zone D',
        name: 'South Food & Transit Plaza',
        crowdCount: 1500,
        capacity: 2000,
        density: 75,
        status: 'NORMAL',
        x: 200,
        y: 310,
        width: 420,
        height: 130,
      },
    ],
    queues: [
      {
        id: 'queue_gate_2',
        name: 'Gate 2 Main Ingress Queue',
        gateId: 'gate_2',
        length: 340,
        waitMinutes: 8.5,
        status: 'CRITICAL',
      },
      {
        id: 'queue_gate_1',
        name: 'Gate 1 East Verification Queue',
        gateId: 'gate_1',
        length: 140,
        waitMinutes: 3.2,
        status: 'BUSY',
      },
      {
        id: 'queue_gate_4',
        name: 'Gate 4 North Direct Queue',
        gateId: 'gate_4',
        length: 75,
        waitMinutes: 1.5,
        status: 'NORMAL',
      },
    ],
    cameras: [
      {
        id: 'cam_01',
        code: 'CAM-01',
        name: 'Gate 2 Overhead Optical Flow',
        zoneId: 'zone_b',
        isOnline: true,
        fps: 29.8,
        lastTelemetryTime: 'Just now',
        detectedCount: 412,
        x: 280,
        y: 90,
        fovAngle: 60,
        fovDirection: 135,
        opticalStatus: 'FLOW_BOTTLENECK',
      },
      {
        id: 'cam_02',
        code: 'CAM-02',
        name: 'Main Stage Arena Center',
        zoneId: 'zone_b',
        isOnline: true,
        fps: 30.0,
        lastTelemetryTime: 'Just now',
        detectedCount: 1840,
        x: 390,
        y: 180,
        fovAngle: 90,
        fovDirection: 90,
        opticalStatus: 'HIGH_DENSITY',
      },
      {
        id: 'cam_03',
        code: 'CAM-03',
        name: 'East Concourse Inflow',
        zoneId: 'zone_a',
        isOnline: true,
        fps: 29.9,
        lastTelemetryTime: '1s ago',
        detectedCount: 680,
        x: 150,
        y: 140,
        fovAngle: 75,
        fovDirection: 45,
        opticalStatus: 'CLEAR',
      },
      {
        id: 'cam_04',
        code: 'CAM-04',
        name: 'North Exhibition Corridor',
        zoneId: 'zone_c',
        isOnline: true,
        fps: 30.0,
        lastTelemetryTime: '2s ago',
        detectedCount: 390,
        x: 640,
        y: 150,
        fovAngle: 80,
        fovDirection: 220,
        opticalStatus: 'CLEAR',
      },
      {
        id: 'cam_05',
        code: 'CAM-05',
        name: 'South Food Court Wide',
        zoneId: 'zone_d',
        isOnline: true,
        fps: 29.5,
        lastTelemetryTime: '1s ago',
        detectedCount: 520,
        x: 410,
        y: 360,
        fovAngle: 85,
        fovDirection: 270,
        opticalStatus: 'CLEAR',
      },
      {
        id: 'cam_06',
        code: 'CAM-06',
        name: 'Gate 3 Standby Monitor',
        zoneId: 'zone_b',
        isOnline: true,
        fps: 30.0,
        lastTelemetryTime: '3s ago',
        detectedCount: 12,
        x: 490,
        y: 90,
        fovAngle: 60,
        fovDirection: 90,
        opticalStatus: 'CLEAR',
      },
    ],
    routes: [
      {
        id: 'route_a_b',
        name: 'Concourse to Arena Main Axis',
        fromZoneId: 'zone_a',
        toZoneId: 'zone_b',
        status: 'CONGESTED',
        flowRate: 110,
        points: [{ x: 230, y: 160 }, { x: 280, y: 160 }],
      },
      {
        id: 'route_b_c',
        name: 'Arena to North Bypass',
        fromZoneId: 'zone_b',
        toZoneId: 'zone_c',
        status: 'CLEAR',
        flowRate: 40,
        points: [{ x: 510, y: 160 }, { x: 560, y: 160 }],
      },
      {
        id: 'route_b_d',
        name: 'Arena to South Exit Promenade',
        fromZoneId: 'zone_b',
        toZoneId: 'zone_d',
        status: 'CLEAR',
        flowRate: 65,
        points: [{ x: 390, y: 270 }, { x: 390, y: 320 }],
      },
    ],
    facilities: [
      {
        id: 'fac_med_1',
        name: 'First Aid Post A',
        type: 'MEDICAL',
        location: 'Zone A - East',
        x: 100,
        y: 200,
        status: 'DISPATCHED',
      },
      {
        id: 'fac_med_2',
        name: 'First Aid Post B',
        type: 'MEDICAL',
        location: 'Zone B - Arena North',
        x: 300,
        y: 240,
        status: 'OPERATIONAL',
      },
      {
        id: 'fac_sec_1',
        name: 'Rapid Response Security Unit',
        type: 'SECURITY',
        location: 'Gate 2 Buffer',
        x: 290,
        y: 110,
        status: 'OPERATIONAL',
      },
      {
        id: 'fac_exit_1',
        name: 'Emergency Exit North-West',
        type: 'EXIT',
        location: 'Zone C Outer',
        x: 730,
        y: 100,
        status: 'OPERATIONAL',
      },
    ],
    alerts: [
      {
        id: 'alert_01',
        priority: 'CRITICAL',
        category: 'CONGESTION',
        title: 'Gate 2 congestion predicted',
        description: 'Current crowd: 1,240 | Gate capacity: 1,300 | Predicted overload: 4 minutes',
        details: 'High ingress rate (+84/min) detected via CAM-01 optical flow. Gate capacity threshold will be reached rapidly.',
        predictedOverloadMinutes: 4,
        currentValue: 1240,
        thresholdValue: 1300,
        recommendation: 'Open Gate 3 to distribute inflow and absorb 420+ attendees/min.',
        actionType: 'OPEN_GATE',
        actionLabel: 'OPEN GATE 3',
        actionPayload: { gateId: 'gate_3' },
        hasSimulation: true,
        simulationPayload: {
          actionTitle: 'What if Gate 3 Opens?',
          targetGateOrRoute: 'Gate 3',
          currentCrowdPrimary: 1240,
          predictedCrowdPrimary: 820,
          targetAbsorbCrowd: 420,
          congestionBefore: 'Critical (95% Capacity)',
          congestionAfter: 'Normal (63% Capacity)',
          queueReductionMin: 6.1,
          details: 'Opening Gate 3 immediately halves queue length on Gate 2 and stabilizes ingress flow within 3 minutes.',
          actionPayload: { action: 'OPEN_GATE', targetId: 'gate_3' },
        },
        acknowledged: false,
        resolved: false,
        createdAt: '18:42 IST',
      },
      {
        id: 'alert_02',
        priority: 'WARNING',
        category: 'DENSITY',
        title: 'Zone B predicted to reach high density',
        description: 'Zone B predicted to reach high density in approximately 8 minutes.',
        details: 'Optical crowd density is at 92%. Inflow exceeds outflow by +35 people/min.',
        predictedOverloadMinutes: 8,
        currentValue: 92,
        thresholdValue: 90,
        recommendation: 'Redirect attendees toward Zone C via North Corridor bypass.',
        actionType: 'REDIRECT_ROUTE',
        actionLabel: 'VIEW ROUTE',
        actionPayload: { routeId: 'route_b_c' },
        hasSimulation: true,
        simulationPayload: {
          actionTitle: 'What if Crowd is Redirected to Zone C?',
          targetGateOrRoute: 'Route B->C Bypass',
          currentCrowdPrimary: 3120,
          predictedCrowdPrimary: 2600,
          targetAbsorbCrowd: 520,
          congestionBefore: 'High Density (92%)',
          congestionAfter: 'Balanced Density (76%)',
          queueReductionMin: 4.0,
          details: 'Dynamic digital signage and steward guidance will shift secondary flow to underutilized Zone C exhibition concourse.',
          actionPayload: { action: 'REDIRECT_ROUTE', targetId: 'route_b_c' },
        },
        acknowledged: false,
        resolved: false,
        createdAt: '18:38 IST',
      },
      {
        id: 'alert_03',
        priority: 'CRITICAL',
        category: 'INCIDENT',
        title: 'Medical assistance requested',
        description: 'Zone A heat exhaustion reported near registration desks.',
        details: 'First aid unit A requested by steward badge #409.',
        recommendation: 'Dispatch Medical Staff Alpha to Zone A immediately.',
        actionType: 'DISPATCH_STAFF',
        actionLabel: 'DISPATCH STAFF',
        actionPayload: { incidentId: 'inc_01' },
        hasSimulation: false,
        acknowledged: false,
        resolved: false,
        createdAt: '18:44 IST',
      },
    ],
    incidents: [
      {
        id: 'inc_01',
        title: 'Medical assistance requested - Zone A',
        type: 'MEDICAL',
        zoneId: 'zone_a',
        location: 'Zone A, near East Info Counter',
        reportedAt: '18:44 IST',
        status: 'REPORTED',
        priority: 'CRITICAL',
        notes: 'Attendee experiencing dizziness and heat fatigue.',
      },
      {
        id: 'inc_02',
        title: 'Scanner throughput delay at Gate 1',
        type: 'EQUIPMENT',
        zoneId: 'zone_a',
        location: 'Gate 1, Turnstiles 3 & 4',
        reportedAt: '18:22 IST',
        status: 'DISPATCHED',
        priority: 'MEDIUM',
        assignedStaff: 'Tech Steward Ravi K.',
        notes: 'Backup RFID handheld terminals deployed.',
      },
    ],
    analytics: {
      peakCrowd: 8750,
      peakTime: '18:30 IST',
      totalEntries: 14820,
      totalExits: 6400,
      avgWaitMinutes: 5.2,
      aiAccuracyPercent: 96.4,
      aiRecommendationsGenerated: 24,
      aiActionsExecuted: 19,
      hourlyCrowd: [
        { time: '14:00', crowd: 1800, predicted: 1750 },
        { time: '15:00', crowd: 3200, predicted: 3100 },
        { time: '16:00', crowd: 5100, predicted: 5050 },
        { time: '17:00', crowd: 7200, predicted: 7300 },
        { time: '18:00', crowd: 8420, predicted: 8400 },
        { time: '19:00', crowd: 8750, predicted: 8800 },
        { time: '20:00 (Proj)', crowd: 9100, predicted: 9100 },
      ],
      gateFlows: [
        { gate: 'Gate 1', entries: 4200, exits: 300 },
        { gate: 'Gate 2', entries: 5600, exits: 150 },
        { gate: 'Gate 3', entries: 420, exits: 0 },
        { gate: 'Gate 4', entries: 3800, exits: 2200 },
        { gate: 'Gate 5', entries: 800, exits: 3750 },
      ],
      queueTrends: [
        { time: '17:00', avgWait: 2.1 },
        { time: '17:30', avgWait: 3.8 },
        { time: '18:00', avgWait: 6.4 },
        { time: '18:30', avgWait: 8.5 },
        { time: '18:45', avgWait: 7.2 },
      ],
    },
  },
  'evt_bengaluru_summit_2026': {
    id: 'evt_bengaluru_summit_2026',
    name: 'Bengaluru Tech & AI Summit',
    venue: 'BIEC Exhibition Centre, Bengaluru',
    dateTime: 'Tomorrow, 09:00 - 18:00 IST',
    capacity: 15000,
    currentCrowd: 4850,
    occupancyPercent: 32,
    crowdStatus: 'NORMAL',
    assignedAdminId: 'admin_raj',
    assignedAdminName: 'Rajesh Varma',
    gates: [
      {
        id: 'gate_b1',
        name: 'Main Gate A',
        number: 1,
        status: 'OPEN',
        currentCrowd: 1200,
        capacity: 4000,
        flowRate: 25,
        zoneId: 'zone_b1',
        direction: 'ENTRY',
      },
      {
        id: 'gate_b2',
        name: 'Hall 2 Entry',
        number: 2,
        status: 'OPEN',
        currentCrowd: 1800,
        capacity: 4000,
        flowRate: 30,
        zoneId: 'zone_b2',
        direction: 'BIDIRECTIONAL',
      },
    ],
    zones: [
      {
        id: 'zone_b1',
        code: 'Hall 1',
        name: 'Keynote & AI Expo',
        crowdCount: 2200,
        capacity: 6000,
        density: 37,
        status: 'NORMAL',
        x: 100,
        y: 100,
        width: 300,
        height: 200,
      },
      {
        id: 'zone_b2',
        code: 'Hall 2',
        name: 'Startup Pavilions',
        crowdCount: 2650,
        capacity: 6000,
        density: 44,
        status: 'NORMAL',
        x: 450,
        y: 100,
        width: 300,
        height: 200,
      },
    ],
    queues: [
      {
        id: 'q_b1',
        name: 'Badge Scanning Line',
        gateId: 'gate_b1',
        length: 40,
        waitMinutes: 1.0,
        status: 'NORMAL',
      },
    ],
    cameras: [
      {
        id: 'cam_b1',
        code: 'CAM-01',
        name: 'Hall 1 Main Optical Tracker',
        zoneId: 'zone_b1',
        isOnline: true,
        fps: 30.0,
        lastTelemetryTime: 'Just now',
        detectedCount: 420,
        x: 200,
        y: 120,
        fovAngle: 80,
        fovDirection: 90,
        opticalStatus: 'CLEAR',
      },
    ],
    routes: [],
    facilities: [
      {
        id: 'fac_b1',
        name: 'Emergency Medical Bay',
        type: 'MEDICAL',
        location: 'Hall 1 Lobby',
        x: 120,
        y: 150,
        status: 'OPERATIONAL',
      },
    ],
    alerts: [],
    incidents: [],
    analytics: {
      peakCrowd: 5200,
      peakTime: '11:30 IST',
      totalEntries: 6200,
      totalExits: 1350,
      avgWaitMinutes: 1.2,
      aiAccuracyPercent: 97.1,
      aiRecommendationsGenerated: 5,
      aiActionsExecuted: 4,
      hourlyCrowd: [],
      gateFlows: [],
      queueTrends: [],
    },
  },
};

// Audit Trail Storage
const auditLogs: AuditRecord[] = [
  {
    id: 'aud_01',
    admin_id: 'admin_hrutika',
    admin_name: 'Hrutika Chitnis',
    event_id: 'evt_mumbai_expo_2026',
    action: 'DISPATCH_STAFF',
    target: 'inc_02',
    source: 'ui',
    timestamp: '18:24 IST',
    result: 'success',
    details: 'Dispatched Tech Steward Ravi K. to Gate 1',
  },
  {
    id: 'aud_02',
    admin_id: 'admin_hrutika',
    admin_name: 'Hrutika Chitnis',
    event_id: 'evt_mumbai_expo_2026',
    action: 'ACKNOWLEDGE_ALERT',
    target: 'alert_02',
    source: 'ui',
    timestamp: '18:40 IST',
    result: 'success',
    details: 'Acknowledged Zone B density warning',
  },
];

// Active Session state (default: Event Admin locked to 'evt_mumbai_expo_2026')
let currentSession: {
  userId: string;
  name: string;
  email: string;
  role: 'EVENT_ADMIN' | 'SUPER_ADMIN';
  assignedEventId?: string;
  assignedEventName?: string;
} = {
  userId: 'admin_hrutika',
  name: 'Hrutika Chitnis',
  email: 'hrutikac2026@gmail.com',
  role: 'EVENT_ADMIN',
  assignedEventId: 'evt_mumbai_expo_2026',
  assignedEventName: 'Mumbai Grand Expo & Concert 2026',
};

// Background live simulation tick to make crowd numbers and telemetry feel dynamic
setInterval(() => {
  const event = initialEvents['evt_mumbai_expo_2026'];
  if (!event) return;

  // Simulate small real-time crowd dynamics
  const gate2 = event.gates.find(g => g.id === 'gate_2');
  const gate3 = event.gates.find(g => g.id === 'gate_3');
  const zoneB = event.zones.find(z => z.id === 'zone_b');
  const queue2 = event.queues.find(q => q.id === 'queue_gate_2');

  if (gate3 && gate3.status === 'OPEN') {
    // If Gate 3 is open, congestion relaxes
    if (gate2 && gate2.currentCrowd > 800) {
      gate2.currentCrowd = Math.max(750, gate2.currentCrowd - 8);
      gate2.flowRate = Math.max(45, gate2.flowRate - 2);
    }
    if (gate3.currentCrowd < 500) {
      gate3.currentCrowd += 12;
      gate3.flowRate = 55;
    }
    if (queue2 && queue2.length > 80) {
      queue2.length = Math.max(65, queue2.length - 15);
      queue2.waitMinutes = +(queue2.length / 45).toFixed(1);
      queue2.status = queue2.length > 200 ? 'CRITICAL' : queue2.length > 100 ? 'BUSY' : 'NORMAL';
    }
    if (zoneB && zoneB.density > 78) {
      zoneB.density = Math.max(74, zoneB.density - 1);
      zoneB.status = 'BUSY';
    }
  } else {
    // Standard rush hour flow
    const jitter = Math.floor(Math.random() * 5) - 2;
    if (gate2) {
      gate2.currentCrowd = Math.min(1280, Math.max(1220, gate2.currentCrowd + jitter));
    }
  }

  // Update total current crowd
  const sumCrowd = event.gates.reduce((acc, g) => acc + g.currentCrowd, 0);
  event.currentCrowd = Math.max(8350, Math.min(9500, sumCrowd + 800));
  event.occupancyPercent = Math.round((event.currentCrowd / event.capacity) * 100);
  event.crowdStatus = event.occupancyPercent >= 90 ? 'CRITICAL' : event.occupancyPercent >= 75 ? 'BUSY' : 'NORMAL';
}, 4000);

// ================= API ROUTES =================

// 1. Current Auth & Session
app.get('/api/auth/me', (req, res) => {
  res.json(currentSession);
});

// Role Switcher for Evaluators / Super Admin Demo
app.post('/api/auth/switch-role', (req, res) => {
  const { role, assignedEventId } = req.body;
  if (role === 'SUPER_ADMIN') {
    currentSession = {
      userId: 'superadmin_main',
      name: 'Central Operations Director',
      email: 'superadmin@eventflow.ai',
      role: 'SUPER_ADMIN',
      assignedEventId: undefined,
      assignedEventName: undefined,
    };
  } else {
    const targetEventId = assignedEventId || 'evt_mumbai_expo_2026';
    const evt = initialEvents[targetEventId];
    currentSession = {
      userId: 'admin_hrutika',
      name: 'Hrutika Chitnis',
      email: 'hrutikac2026@gmail.com',
      role: 'EVENT_ADMIN',
      assignedEventId: targetEventId,
      assignedEventName: evt ? evt.name : 'Mumbai Grand Expo & Concert 2026',
    };
  }
  res.json({ success: true, session: currentSession });
});

// 2. Events List (Strict Data Isolation)
app.get('/api/events', (req, res) => {
  // If Event Admin: ONLY return their assigned event!
  if (currentSession.role === 'EVENT_ADMIN') {
    const assignedId = currentSession.assignedEventId;
    if (!assignedId || !initialEvents[assignedId]) {
      return res.status(403).json({ error: 'No event assigned to this Event Admin.' });
    }
    return res.json([initialEvents[assignedId]]);
  }

  // If Super Admin: return all events
  res.json(Object.values(initialEvents));
});

// 3. Create Event (Super Admin Only)
app.post('/api/events', (req, res) => {
  if (currentSession.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Permission Denied: Only Super Admin can create events.' });
  }

  const { name, venue, dateTime, capacity, assignedAdminId, assignedAdminName } = req.body;
  if (!name || !venue || !capacity) {
    return res.status(400).json({ error: 'Missing required fields: name, venue, capacity' });
  }

  const newId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const cap = Number(capacity);

  const newEvent: EventData = {
    id: newId,
    name,
    venue,
    dateTime: dateTime || 'Upcoming Event',
    capacity: cap,
    currentCrowd: 0,
    occupancyPercent: 0,
    crowdStatus: 'NORMAL',
    assignedAdminId: assignedAdminId || 'admin_assigned',
    assignedAdminName: assignedAdminName || 'Assigned Event Admin',
    gates: [
      {
        id: `gate_${newId}_1`,
        name: 'Gate 1 (Main Entrance)',
        number: 1,
        status: 'OPEN',
        currentCrowd: 0,
        capacity: Math.round(cap * 0.4),
        flowRate: 0,
        zoneId: `zone_${newId}_a`,
        direction: 'ENTRY',
      },
      {
        id: `gate_${newId}_2`,
        name: 'Gate 2 (Secondary Entrance)',
        number: 2,
        status: 'CLOSED',
        currentCrowd: 0,
        capacity: Math.round(cap * 0.3),
        flowRate: 0,
        zoneId: `zone_${newId}_b`,
        direction: 'ENTRY',
      },
      {
        id: `gate_${newId}_3`,
        name: 'Gate 3 (Exit Plaza)',
        number: 3,
        status: 'OPEN',
        currentCrowd: 0,
        capacity: Math.round(cap * 0.3),
        flowRate: 0,
        zoneId: `zone_${newId}_b`,
        direction: 'EXIT',
      },
    ],
    zones: [
      {
        id: `zone_${newId}_a`,
        code: 'Zone A',
        name: 'Grand Concourse',
        crowdCount: 0,
        capacity: Math.round(cap * 0.5),
        density: 0,
        status: 'NORMAL',
        x: 80,
        y: 100,
        width: 280,
        height: 180,
      },
      {
        id: `zone_${newId}_b`,
        code: 'Zone B',
        name: 'Main Arena / Hall',
        crowdCount: 0,
        capacity: Math.round(cap * 0.5),
        density: 0,
        status: 'NORMAL',
        x: 420,
        y: 100,
        width: 300,
        height: 180,
      },
    ],
    queues: [
      {
        id: `queue_${newId}_1`,
        name: 'Gate 1 Security Verification',
        gateId: `gate_${newId}_1`,
        length: 0,
        waitMinutes: 0,
        status: 'NORMAL',
      },
    ],
    cameras: [
      {
        id: `cam_${newId}_1`,
        code: 'CAM-01',
        name: 'Gate 1 Optical Flow Sensor',
        zoneId: `zone_${newId}_a`,
        isOnline: true,
        fps: 30.0,
        lastTelemetryTime: 'Online',
        detectedCount: 0,
        x: 100,
        y: 120,
        fovAngle: 75,
        fovDirection: 90,
        opticalStatus: 'CLEAR',
      },
      {
        id: `cam_${newId}_2`,
        code: 'CAM-02',
        name: 'Main Arena Center Lens',
        zoneId: `zone_${newId}_b`,
        isOnline: true,
        fps: 30.0,
        lastTelemetryTime: 'Online',
        detectedCount: 0,
        x: 480,
        y: 120,
        fovAngle: 85,
        fovDirection: 90,
        opticalStatus: 'CLEAR',
      },
    ],
    routes: [],
    facilities: [
      {
        id: `fac_${newId}_1`,
        name: 'First Aid Post 1',
        type: 'MEDICAL',
        location: 'Zone A East',
        x: 90,
        y: 140,
        status: 'OPERATIONAL',
      },
      {
        id: `fac_${newId}_2`,
        name: 'Security Command Unit',
        type: 'SECURITY',
        location: 'Main Gate Concourse',
        x: 120,
        y: 220,
        status: 'OPERATIONAL',
      },
    ],
    alerts: [],
    incidents: [],
    analytics: {
      peakCrowd: 0,
      peakTime: '--:--',
      totalEntries: 0,
      totalExits: 0,
      avgWaitMinutes: 0,
      aiAccuracyPercent: 98.0,
      aiRecommendationsGenerated: 0,
      aiActionsExecuted: 0,
      hourlyCrowd: [],
      gateFlows: [],
      queueTrends: [],
    },
  };

  initialEvents[newId] = newEvent;

  auditLogs.unshift({
    id: `aud_${Date.now()}`,
    admin_id: currentSession.userId,
    admin_name: currentSession.name,
    event_id: newId,
    action: 'CREATE_EVENT',
    target: newId,
    source: 'ui',
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST',
    result: 'success',
    details: `Created new event: ${name} (Capacity: ${cap})`,
  });

  res.status(201).json(newEvent);
});

// 4. Get Event Details with Access Verification
app.get('/api/events/:id', (req, res) => {
  const eventId = req.params.id;

  // Strict Event Admin Isolation:
  if (currentSession.role === 'EVENT_ADMIN' && currentSession.assignedEventId !== eventId) {
    return res.status(403).json({
      error: `Access Denied: You are only authorized to operate your assigned event (${currentSession.assignedEventId}).`,
    });
  }

  const event = initialEvents[eventId];
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }

  res.json(event);
});

// 5. Gate Control Action (Open / Close) with Authorization & Audit
app.post('/api/events/:id/gates/:gateId/toggle', (req, res) => {
  const eventId = req.params.id;
  const gateId = req.params.gateId;
  const { status, source = 'ui' } = req.body;

  // Strict isolation check
  if (currentSession.role === 'EVENT_ADMIN' && currentSession.assignedEventId !== eventId) {
    return res.status(403).json({ error: 'Unauthorized: Cannot operate gates of an unassigned event.' });
  }

  const event = initialEvents[eventId];
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const gate = event.gates.find(g => g.id === gateId);
  if (!gate) return res.status(404).json({ error: 'Gate not found' });

  const targetStatus = status ? status : gate.status === 'OPEN' ? 'CLOSED' : 'OPEN';
  gate.status = targetStatus;
  gate.lastActionTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' IST';

  if (targetStatus === 'OPEN') {
    gate.flowRate = 50;
    // Resolve any critical alerts about opening this gate
    event.alerts.forEach(a => {
      if (a.actionPayload?.gateId === gateId) {
        a.resolved = true;
      }
    });
    event.analytics.aiActionsExecuted += 1;
  } else {
    gate.flowRate = 0;
  }

  const logRecord: AuditRecord = {
    id: `aud_${Date.now()}`,
    admin_id: currentSession.userId,
    admin_name: currentSession.name,
    event_id: eventId,
    action: targetStatus === 'OPEN' ? 'OPEN_GATE' : 'CLOSE_GATE',
    target: gate.id,
    source: (source as any) || 'ui',
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST',
    result: 'success',
    details: `${gate.name} set to ${targetStatus}`,
  };
  auditLogs.unshift(logRecord);

  res.json({ success: true, gate, auditRecord: logRecord, event });
});

// 6. Route Redirection Action
app.post('/api/events/:id/routes/:routeId/redirect', (req, res) => {
  const eventId = req.params.id;
  const routeId = req.params.routeId;
  const { status = 'REDIRECTED', source = 'ui' } = req.body;

  if (currentSession.role === 'EVENT_ADMIN' && currentSession.assignedEventId !== eventId) {
    return res.status(403).json({ error: 'Unauthorized: Cannot modify routes of an unassigned event.' });
  }

  const event = initialEvents[eventId];
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const route = event.routes.find(r => r.id === routeId);
  if (!route) return res.status(404).json({ error: 'Route not found' });

  route.status = status;

  // Resolve related alert
  event.alerts.forEach(a => {
    if (a.actionPayload?.routeId === routeId) {
      a.resolved = true;
    }
  });

  const logRecord: AuditRecord = {
    id: `aud_${Date.now()}`,
    admin_id: currentSession.userId,
    admin_name: currentSession.name,
    event_id: eventId,
    action: 'REDIRECT_ROUTE',
    target: route.id,
    source: (source as any) || 'ui',
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST',
    result: 'success',
    details: `${route.name} route status changed to ${status}`,
  };
  auditLogs.unshift(logRecord);

  res.json({ success: true, route, auditRecord: logRecord, event });
});

// 7. Alert Actions (Acknowledge / Dismiss / Resolve)
app.post('/api/events/:id/alerts/:alertId/action', (req, res) => {
  const eventId = req.params.id;
  const alertId = req.params.alertId;
  const { action = 'ACKNOWLEDGE' } = req.body;

  if (currentSession.role === 'EVENT_ADMIN' && currentSession.assignedEventId !== eventId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const event = initialEvents[eventId];
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const alert = event.alerts.find(a => a.id === alertId);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });

  if (action === 'DISMISS' || action === 'RESOLVE') {
    alert.resolved = true;
  } else {
    alert.acknowledged = true;
  }

  auditLogs.unshift({
    id: `aud_${Date.now()}`,
    admin_id: currentSession.userId,
    admin_name: currentSession.name,
    event_id: eventId,
    action: action === 'RESOLVE' ? 'RESOLVE_ALERT' : 'DISMISS_ALERT',
    target: alertId,
    source: 'ui',
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST',
    result: 'success',
    details: `${alert.title} - ${action}`,
  });

  res.json({ success: true, alert, event });
});

// 8. Incidents: Create, Dispatch Staff, Resolve
app.post('/api/events/:id/incidents', (req, res) => {
  const eventId = req.params.id;
  const { title, zoneId, priority = 'HIGH', location, action, incidentId, staffName } = req.body;

  if (currentSession.role === 'EVENT_ADMIN' && currentSession.assignedEventId !== eventId) {
    return res.status(403).json({ error: 'Unauthorized.' });
  }

  const event = initialEvents[eventId];
  if (!event) return res.status(404).json({ error: 'Event not found' });

  if (action === 'DISPATCH_STAFF' && incidentId) {
    const inc = event.incidents.find(i => i.id === incidentId);
    if (inc) {
      inc.status = 'DISPATCHED';
      inc.assignedStaff = staffName || 'Rapid Response Unit Delta';
    }
    // Also resolve related alert
    event.alerts.forEach(a => {
      if (a.actionPayload?.incidentId === incidentId) a.resolved = true;
    });

    const record: AuditRecord = {
      id: `aud_${Date.now()}`,
      admin_id: currentSession.userId,
      admin_name: currentSession.name,
      event_id: eventId,
      action: 'DISPATCH_STAFF',
      target: incidentId,
      source: req.body.source || 'ui',
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST',
      result: 'success',
      details: `Staff dispatched to ${inc?.title}`,
    };
    auditLogs.unshift(record);

    return res.json({ success: true, incident: inc, auditRecord: record, event });
  }

  if (action === 'RESOLVE' && incidentId) {
    const inc = event.incidents.find(i => i.id === incidentId);
    if (inc) inc.status = 'RESOLVED';
    return res.json({ success: true, incident: inc, event });
  }

  // Create new incident
  const newIncident: IncidentItem = {
    id: `inc_${Date.now()}`,
    title: title || 'Incident Report',
    type: 'SECURITY',
    zoneId: zoneId || 'zone_b',
    location: location || 'Zone B Venue floor',
    reportedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' IST',
    status: 'REPORTED',
    priority: priority,
    notes: req.body.notes || 'Created via Event Admin console',
  };

  event.incidents.unshift(newIncident);

  auditLogs.unshift({
    id: `aud_${Date.now()}`,
    admin_id: currentSession.userId,
    admin_name: currentSession.name,
    event_id: eventId,
    action: 'CREATE_INCIDENT',
    target: newIncident.id,
    source: req.body.source || 'ui',
    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST',
    result: 'success',
    details: newIncident.title,
  });

  res.status(201).json({ success: true, incident: newIncident, event });
});

// 9. What-If Simulation Endpoint (Does NOT modify real state)
app.post('/api/events/:id/simulate', (req, res) => {
  const eventId = req.params.id;
  const { action, targetId } = req.body;

  const event = initialEvents[eventId];
  if (!event) return res.status(404).json({ error: 'Event not found' });

  if (action === 'OPEN_GATE' || targetId === 'gate_3') {
    const gate2 = event.gates.find(g => g.id === 'gate_2');
    const curCrowd = gate2 ? gate2.currentCrowd : 1240;
    const predictedGate2 = Math.round(curCrowd * 0.66);
    const predictedGate3 = curCrowd - predictedGate2;

    return res.json({
      title: 'WHAT IF GATE 3 OPENS?',
      actionTitle: 'Open Gate 3 Auxiliary Ingress',
      targetGateOrRoute: 'Gate 3',
      currentGate2Crowd: curCrowd,
      predictedGate2Crowd: predictedGate2,
      predictedGate3Crowd: predictedGate3,
      expectedCongestion: 'Reduced from Critical to Normal',
      estimatedAbsorptionRate: '420 attendees/min',
      queueWaitTimeReduction: '8.5 min -> 2.4 min (-72%)',
      summary: 'Opening Gate 3 relieves bottleneck pressure on Gate 2 without spilling over into transit lanes.',
      actionPayload: { action: 'OPEN_GATE', targetId: 'gate_3' },
    });
  }

  if (action === 'REDIRECT_ROUTE') {
    return res.json({
      title: 'WHAT IF ATTENDEES ARE REDIRECTED TO ZONE C?',
      actionTitle: 'Activate North Corridor Bypass',
      targetGateOrRoute: 'Route B->C',
      currentZoneBDensity: '92% (Warning)',
      predictedZoneBDensity: '74% (Optimal)',
      divertedFlow: '~350 attendees over next 10 mins',
      expectedCongestion: 'Reduced to balanced state',
      queueWaitTimeReduction: 'Signage & staff diversion active',
      summary: 'Distributes Arena surge into unoccupied exhibition concourses smoothly.',
      actionPayload: { action: 'REDIRECT_ROUTE', targetId: 'route_b_c' },
    });
  }

  res.json({
    title: 'WHAT-IF SIMULATION CALCULATION',
    actionTitle: 'Simulated Operational Adjustment',
    targetGateOrRoute: targetId || 'General Venue Flow',
    expectedCongestion: 'Predicted reduction of 28% in local queue wait times.',
    summary: 'Simulation verifies safe crowd dispersion with minimal spillover.',
    actionPayload: { action, targetId },
  });
});

// 10. ACTION-BASED VOICE ASSISTANT Endpoint
// Supports natural speech command parsing, safety checks, execution, and voice audio feedback
app.post('/api/events/:id/voice-command', async (req, res) => {
  const eventId = req.params.id;
  const { command, confirmed = false } = req.body;

  if (!command || typeof command !== 'string') {
    return res.status(400).json({ error: 'Command text is required' });
  }

  // Strict Event Admin Authorization Check:
  // Must determine assigned eventId from the authenticated session
  if (currentSession.role === 'EVENT_ADMIN' && currentSession.assignedEventId !== eventId) {
    return res.status(403).json({
      error: 'Permission Denied: You cannot execute voice commands on an unassigned event.',
    });
  }

  const event = initialEvents[eventId];
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const rawCmd = command.trim();
  const lowerCmd = rawCmd.toLowerCase();

  // 1. Safety Check for High-Impact Emergency Actions:
  // "Start emergency evacuation", "Lockdown all gates"
  const isEmergencyEvac = lowerCmd.includes('evacuat') || lowerCmd.includes('emergency evacuation');
  const isLockdown = lowerCmd.includes('lockdown') || lowerCmd.includes('close all gates');

  if ((isEmergencyEvac || isLockdown) && !confirmed) {
    return res.json({
      status: 'NEEDS_CONFIRMATION',
      requiresConfirmation: true,
      action: isEmergencyEvac ? 'EMERGENCY_EVACUATION' : 'LOCKDOWN_ALL_GATES',
      message: isEmergencyEvac
        ? 'Emergency evacuation affects the entire event. Please confirm to proceed.'
        : 'Lockdown will immediately close and bar all gates. Please confirm to proceed.',
      voiceResponse: isEmergencyEvac
        ? 'Emergency evacuation affects the entire event. Confirm.'
        : 'Lockdown affects all gates. Confirm.',
      command: rawCmd,
    });
  }

  // Handle Confirmed High-Impact Action
  if ((isEmergencyEvac || isLockdown) && confirmed) {
    if (isEmergencyEvac) {
      event.gates.forEach(g => {
        g.status = 'OPEN';
        g.direction = 'EXIT';
        g.flowRate = -120;
      });
      event.crowdStatus = 'CRITICAL';
      auditLogs.unshift({
        id: `aud_${Date.now()}`,
        admin_id: currentSession.userId,
        admin_name: currentSession.name,
        event_id: eventId,
        action: 'EMERGENCY_EVACUATION',
        target: 'ALL_GATES',
        source: 'voice',
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST',
        result: 'success',
        details: 'Emergency evacuation triggered by voice command',
      });
      return res.json({
        status: 'EXECUTED',
        action: 'EMERGENCY_EVACUATION',
        voiceResponse: 'Emergency evacuation initialized. All gates switched to emergency exit mode.',
        event,
      });
    }
  }

  // 2. Parse operational intent (Rule-based fast path + Gemini optional intelligence)
  let parsedAction: string = 'UNKNOWN';
  let targetGateNum: number | null = null;
  let targetZoneCode: string | null = null;
  let voiceResponse = '';

  // Gate matching: e.g. "open gate 3", "open gate three", "close gate 2"
  const gateMatch = lowerCmd.match(/gate\s*(\d+|one|two|three|four|five)/i);
  if (gateMatch) {
    const wordToNum: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
    const rawVal = gateMatch[1].toLowerCase();
    targetGateNum = wordToNum[rawVal] || parseInt(rawVal, 10);
  }

  // Zone matching: e.g. "zone a", "zone b"
  const zoneMatch = lowerCmd.match(/zone\s*([a-d])/i);
  if (zoneMatch) {
    targetZoneCode = zoneMatch[1].toUpperCase();
  }

  if (lowerCmd.includes('open') && targetGateNum) {
    parsedAction = 'OPEN_GATE';
    const gate = event.gates.find(g => g.number === targetGateNum);
    if (gate) {
      gate.status = 'OPEN';
      gate.flowRate = 60;
      gate.lastActionTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' IST';

      // Resolve matching alert
      event.alerts.forEach(a => {
        if (a.actionPayload?.gateId === gate.id) a.resolved = true;
      });
      event.analytics.aiActionsExecuted += 1;

      auditLogs.unshift({
        id: `aud_${Date.now()}`,
        admin_id: currentSession.userId,
        admin_name: currentSession.name,
        event_id: eventId,
        action: 'OPEN_GATE',
        target: gate.id,
        source: 'voice',
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST',
        result: 'success',
        details: `Voice command: Opened Gate ${targetGateNum}`,
      });

      voiceResponse = `Gate ${targetGateNum} is now open. Flow absorption active.`;
      return res.json({
        status: 'EXECUTED',
        action: parsedAction,
        target: gate.id,
        voiceResponse,
        event,
      });
    } else {
      return res.json({
        status: 'ERROR',
        voiceResponse: `Gate ${targetGateNum} was not found in ${event.name}.`,
        event,
      });
    }
  }

  if (lowerCmd.includes('close') && targetGateNum) {
    parsedAction = 'CLOSE_GATE';
    const gate = event.gates.find(g => g.number === targetGateNum);
    if (gate) {
      gate.status = 'CLOSED';
      gate.flowRate = 0;
      gate.lastActionTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' IST';

      auditLogs.unshift({
        id: `aud_${Date.now()}`,
        admin_id: currentSession.userId,
        admin_name: currentSession.name,
        event_id: eventId,
        action: 'CLOSE_GATE',
        target: gate.id,
        source: 'voice',
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST',
        result: 'success',
        details: `Voice command: Closed Gate ${targetGateNum}`,
      });

      voiceResponse = `Gate ${targetGateNum} has been closed.`;
      return res.json({
        status: 'EXECUTED',
        action: parsedAction,
        target: gate.id,
        voiceResponse,
        event,
      });
    }
  }

  // Information Queries
  if (lowerCmd.includes('crowd') || lowerCmd.includes('occupancy')) {
    voiceResponse = `Current crowd is ${event.currentCrowd.toLocaleString()} attendees, at ${event.occupancyPercent}% occupancy. Status is ${event.crowdStatus}.`;
    return res.json({ status: 'INFO', voiceResponse, event });
  }

  if (lowerCmd.includes('overcrowded') || lowerCmd.includes('congested gate') || lowerCmd.includes('which gate')) {
    const congestedGate = event.gates.find(g => g.currentCrowd >= g.capacity * 0.9);
    if (congestedGate) {
      voiceResponse = `${congestedGate.name} is operating near capacity with ${congestedGate.currentCrowd} attendees. AI recommends opening Gate 3.`;
    } else {
      voiceResponse = 'All open gates are currently operating within nominal flow limits.';
    }
    return res.json({ status: 'INFO', voiceResponse, event });
  }

  if (lowerCmd.includes('show') && targetZoneCode) {
    const zone = event.zones.find(z => z.code.includes(targetZoneCode!));
    voiceResponse = `Zone ${targetZoneCode} currently has ${zone?.crowdCount.toLocaleString()} attendees at ${zone?.density}% density. Status is ${zone?.status}.`;
    return res.json({
      status: 'NAVIGATE',
      action: 'SHOW_ZONE',
      target: zone?.id,
      voiceResponse,
      event,
    });
  }

  if (lowerCmd.includes('simulation') || lowerCmd.includes('simulate')) {
    voiceResponse = 'Opening What-If simulation for Gate 3 load absorption.';
    return res.json({
      status: 'OPEN_SIMULATION',
      action: 'SIMULATE_GATE_3',
      voiceResponse,
      event,
    });
  }

  if (lowerCmd.includes('redirect') && (lowerCmd.includes('zone a') || lowerCmd.includes('zone c') || lowerCmd.includes('zone b'))) {
    const route = event.routes.find(r => r.id === 'route_b_c');
    if (route) route.status = 'REDIRECTED';

    auditLogs.unshift({
      id: `aud_${Date.now()}`,
      admin_id: currentSession.userId,
      admin_name: currentSession.name,
      event_id: eventId,
      action: 'REDIRECT_FLOW',
      target: 'route_b_c',
      source: 'voice',
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }) + ' IST',
      result: 'success',
      details: 'Voice command: Redirected attendees toward Zone C',
    });

    voiceResponse = 'Crowd redirection active. Dynamic signage and stewards directing flow to Zone C.';
    return res.json({
      status: 'EXECUTED',
      action: 'REDIRECT_FLOW',
      target: 'route_b_c',
      voiceResponse,
      event,
    });
  }

  if (lowerCmd.includes('dispatch staff') || lowerCmd.includes('dispatch') || lowerCmd.includes('medical')) {
    const inc = event.incidents.find(i => i.status === 'REPORTED');
    if (inc) {
      inc.status = 'DISPATCHED';
      inc.assignedStaff = 'Rapid Response Unit 1';
      voiceResponse = `Staff dispatched to ${inc.title}.`;
    } else {
      voiceResponse = 'Rapid response staff deployed to specified location.';
    }
    return res.json({ status: 'EXECUTED', action: 'DISPATCH_STAFF', voiceResponse, event });
  }

  if (lowerCmd.includes('create incident') || lowerCmd.includes('report incident')) {
    const newInc: IncidentItem = {
      id: `inc_${Date.now()}`,
      title: `Incident reported in Zone ${targetZoneCode || 'B'}`,
      type: 'SECURITY',
      zoneId: targetZoneCode ? `zone_${targetZoneCode.toLowerCase()}` : 'zone_b',
      location: `Zone ${targetZoneCode || 'B'} Main Floor`,
      reportedAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' IST',
      status: 'REPORTED',
      priority: 'HIGH',
      notes: `Voice reported: "${rawCmd}"`,
    };
    event.incidents.unshift(newInc);

    voiceResponse = `Incident created for Zone ${targetZoneCode || 'B'}. Priority marked High.`;
    return res.json({ status: 'EXECUTED', action: 'CREATE_INCIDENT', voiceResponse, event });
  }

  if (lowerCmd.includes('alert') || lowerCmd.includes('active alerts')) {
    const count = event.alerts.filter(a => !a.resolved).length;
    voiceResponse = `There are ${count} active alerts requiring attention in ${event.name}.`;
    return res.json({ status: 'INFO', voiceResponse, event });
  }

  if (lowerCmd.includes('recommend') || lowerCmd.includes('ai recommendation')) {
    const activeAlert = event.alerts.find(a => !a.resolved && a.recommendation);
    if (activeAlert) {
      voiceResponse = `AI recommends: ${activeAlert.recommendation}`;
    } else {
      voiceResponse = 'All venue zones are operating smoothly with no immediate recommendations.';
    }
    return res.json({ status: 'INFO', voiceResponse, event });
  }

  // 3. Fallback: Gemini GenAI intelligent semantic interpretation if available
  const ai = getGeminiClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are the AI Event Operations Assistant for "${event.name}". 
Current event stats:
Crowd: ${event.currentCrowd} / ${event.capacity} (${event.occupancyPercent}%)
Gates: ${event.gates.map(g => `${g.name}: ${g.status} (${g.currentCrowd}/${g.capacity})`).join(', ')}
Active alerts: ${event.alerts.filter(a => !a.resolved).map(a => a.title).join('; ')}

User said: "${rawCmd}"

Respond in 1-2 concise, professional spoken sentences suitable for text-to-speech feedback for an Event Admin during live operations.`,
      });
      voiceResponse = response.text?.trim() || `Processed command: "${rawCmd}". System state normal.`;
      return res.json({ status: 'INFO', voiceResponse, event });
    } catch (err) {
      console.warn('Gemini query error:', err);
    }
  }

  // Default response
  voiceResponse = `Command acknowledged: "${rawCmd}". Operations status is normal.`;
  res.json({ status: 'INFO', voiceResponse, event });
});

// 11. Audit Logs Endpoint
app.get('/api/events/:id/audit-logs', (req, res) => {
  const eventId = req.params.id;
  const filtered = auditLogs.filter(l => l.event_id === eventId);
  res.json(filtered);
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`EventFlow AI Admin Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
