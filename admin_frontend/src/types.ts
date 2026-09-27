export type Role = 'SUPER_ADMIN' | 'EVENT_ADMIN';

export interface UserSession {
  userId: string;
  name: string;
  email: string;
  role: Role;
  assignedEventId?: string;
  assignedEventName?: string;
}

export interface Gate {
  id: string;
  name: string;
  number: number;
  status: 'OPEN' | 'CLOSED';
  currentCrowd: number;
  capacity: number;
  flowRate: number; // attendees/min (+inflow / -outflow)
  zoneId: string;
  direction: 'ENTRY' | 'EXIT' | 'BIDIRECTIONAL';
  lastActionTime?: string;
}

export interface Zone {
  id: string;
  code: string;
  name: string;
  crowdCount: number;
  capacity: number;
  density: number; // percentage 0 - 100
  status: 'NORMAL' | 'BUSY' | 'WARNING' | 'CRITICAL';
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export interface QueueItem {
  id: string;
  name: string;
  gateId: string;
  length: number; // count of people
  waitMinutes: number;
  status: 'NORMAL' | 'BUSY' | 'CRITICAL';
}

export interface Camera {
  id: string;
  code: string;
  name: string;
  zoneId: string;
  isOnline: boolean;
  fps: number;
  lastTelemetryTime: string;
  detectedCount: number;
  x: number;
  y: number;
  fovAngle: number; // degrees
  fovDirection: number; // degrees (0 = right, 90 = down, etc.)
  opticalStatus: 'CLEAR' | 'HIGH_DENSITY' | 'FLOW_BOTTLENECK';
}

export interface RouteItem {
  id: string;
  name: string;
  fromZoneId: string;
  toZoneId: string;
  status: 'CLEAR' | 'CONGESTED' | 'REDIRECTED' | 'BLOCKED';
  flowRate: number; // attendees/min
  points: { x: number; y: number }[];
}

export interface Facility {
  id: string;
  name: string;
  type: 'MEDICAL' | 'SECURITY' | 'EXIT' | 'INFO' | 'RESTROOM';
  location: string;
  x: number;
  y: number;
  status: 'OPERATIONAL' | 'BUSY' | 'DISPATCHED';
}

export interface AlertCard {
  id: string;
  priority: 'CRITICAL' | 'WARNING' | 'INFO';
  category: 'CONGESTION' | 'DENSITY' | 'INCIDENT' | 'SYSTEM' | 'SECURITY';
  title: string;
  description: string;
  details?: string;
  predictedOverloadMinutes?: number;
  currentValue?: number;
  thresholdValue?: number;
  recommendation?: string;
  actionType: 'OPEN_GATE' | 'CLOSE_GATE' | 'REDIRECT_ROUTE' | 'DISPATCH_STAFF' | 'RESOLVE' | 'CUSTOM';
  actionLabel?: string;
  actionPayload?: any;
  hasSimulation?: boolean;
  simulationPayload?: any;
  acknowledged: boolean;
  resolved: boolean;
  createdAt: string;
}

export interface IncidentItem {
  id: string;
  title: string;
  type: 'MEDICAL' | 'SECURITY' | 'OVERCROWD' | 'EQUIPMENT' | 'LOST_CHILD';
  zoneId: string;
  location: string;
  reportedAt: string;
  status: 'REPORTED' | 'DISPATCHED' | 'ON_SCENE' | 'RESOLVED';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  assignedStaff?: string;
  notes?: string;
}

export interface WhatIfSimulation {
  actionTitle: string;
  targetGateOrRoute: string;
  currentCrowdPrimary: number;
  predictedCrowdPrimary: number;
  targetAbsorbCrowd: number;
  congestionBefore: string;
  congestionAfter: string;
  queueReductionMin: number;
  details: string;
  actionPayload: {
    action: string;
    targetId: string;
    value?: any;
  };
}

export interface AuditRecord {
  id: string;
  admin_id: string;
  admin_name: string;
  event_id: string;
  action: string;
  target: string;
  source: 'ui' | 'voice' | 'ai_apply';
  timestamp: string;
  result: 'success' | 'failed' | 'denied';
  details?: string;
}

export interface EventData {
  id: string;
  name: string;
  venue: string;
  dateTime: string;
  capacity: number;
  currentCrowd: number;
  occupancyPercent: number;
  crowdStatus: 'NORMAL' | 'BUSY' | 'WARNING' | 'CRITICAL';
  assignedAdminId: string;
  assignedAdminName: string;
  assignedAdminEmail?: string;
  gates: Gate[];
  zones: Zone[];
  queues: QueueItem[];
  cameras: Camera[];
  routes: RouteItem[];
  facilities: Facility[];
  alerts: AlertCard[];
  incidents: IncidentItem[];
  analytics: {
    peakCrowd: number;
    peakTime: string;
    totalEntries: number;
    totalExits: number;
    avgWaitMinutes: number;
    aiAccuracyPercent: number;
    aiRecommendationsGenerated: number;
    aiActionsExecuted: number;
    hourlyCrowd: { time: string; crowd: number; predicted: number }[];
    gateFlows: { gate: string; entries: number; exits: number }[];
    queueTrends: { time: string; avgWait: number }[];
  };
}
