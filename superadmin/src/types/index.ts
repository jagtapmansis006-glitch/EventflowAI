export type Role = 'SUPER_ADMIN' | 'EVENT_ADMIN' | 'ATTENDEE';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  assignedEventIds?: string[];
}

export type EventStatus = 'DRAFT' | 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

export interface Event {
  id: string;
  name: string;
  description: string;
  eventType: string;
  venueName: string;
  venueAddress: string;
  city: string;
  startDateTime: string;
  endDateTime: string;
  status: EventStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  activeAlertsCount?: number;
  activeIncidentsCount?: number;
  assignedAdmins?: { id: string; fullName: string; email: string }[];
  autonomousMode?: boolean;
}

export interface VenueLocation {
  id: string;
  eventId: string;
  venueId: string;
  name: string;
  locationType: string;
  description: string;
  latitude: number;
  longitude: number;
  capacity: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export type GateStatus = 'OPEN' | 'CLOSED' | 'RESTRICTED' | 'FULL' | 'EMERGENCY_ONLY';

export interface Gate {
  id: string;
  eventId: string;
  venueId: string;
  name: string;
  gateCode: string;
  gateType: string;
  status: GateStatus;
  capacity: number;
  currentCount: number;
  latitude: number;
  longitude: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CrowdZone {
  id: string;
  eventId: string;
  venueId: string;
  name: string;
  description: string;
  capacity: number;
  warningThreshold: number;
  criticalThreshold: number;
  latitude: number;
  longitude: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CameraSourceType = 'WEBCAM' | 'VIDEO_FILE' | 'RTSP' | 'HTTP_STREAM' | 'IP_CAMERA' | 'CCTV';

export interface Camera {
  id: string;
  eventId: string;
  venueId: string;
  zoneId: string;
  name: string;
  cameraCode: string;
  sourceType: CameraSourceType;
  sourceUrl: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED';
  isActive: boolean;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

export type DensityLevel = 'LOW' | 'MODERATE' | 'BUSY' | 'CRITICAL';

export interface CrowdTelemetry {
  id: string;
  eventId: string;
  cameraId: string;
  zoneId: string;
  timestamp: string;
  peopleCount: number;
  inflow: number;
  outflow: number;
  netFlow: number;
  avgSpeedMps?: number;
  occupancyPercent: number;
  densityLevel: DensityLevel;
  queueLength: number;
  averageDwellTime: number;
  createdAt: string;
}

export type PredictionType = 'CROWD_COUNT' | 'OCCUPANCY' | 'INFLOW' | 'OUTFLOW' | 'QUEUE' | 'RISK';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface MLPrediction {
  id: string;
  eventId: string;
  zoneId: string;
  predictionType: PredictionType;
  predictionTime: string;
  forecastFor: string;
  predictedPeopleCount: number;
  predictedOccupancyPercent: number;
  predictedInflow: number;
  predictedOutflow: number;
  riskLevel: RiskLevel;
  confidence: number;
  modelName: string;
  modelVersion: string;
  inputWindow: string;
  createdAt: string;
}

export type ScenarioType = 'GATE_CLOSURE' | 'GATE_OPENING' | 'ROUTE_CHANGE' | 'CROWD_SURGE' | 'CAPACITY_CHANGE' | 'STAFF_REALLOCATION' | 'CUSTOM';
export type SimulationStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface Simulation {
  id: string;
  eventId: string;
  createdBy: string;
  name: string;
  description: string;
  scenarioType: ScenarioType;
  inputParameters: Record<string, any>;
  status: SimulationStatus;
  results: Record<string, any> | null;
  createdAt: string;
  completedAt: string | null;
}

export type QueueStatus = 'NORMAL' | 'BUSY' | 'CRITICAL' | 'CLOSED';

export interface Queue {
  id: string;
  eventId: string;
  zoneId: string;
  name: string;
  capacity: number;
  currentLength: number;
  averageWaitTime: number;
  status: QueueStatus;
  createdAt: string;
  updatedAt: string;
}

export type RouteType = 'NORMAL' | 'EMERGENCY' | 'ACCESSIBLE' | 'STAFF' | 'RESTRICTED';

export interface Route {
  id: string;
  eventId: string;
  name: string;
  routeType: RouteType;
  sourceLocationId: string;
  destinationLocationId: string;
  distance: number;
  estimatedTime: number;
  capacity: number;
  status: 'OPEN' | 'CONGESTED' | 'BLOCKED';
  isAccessible: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export type FacilityType = 'TOILET' | 'MEDICAL' | 'FOOD' | 'WATER' | 'HELP_DESK' | 'PARKING' | 'REST_AREA' | 'SECURITY' | 'OTHER';

export interface Facility {
  id: string;
  eventId: string;
  venueId: string;
  name: string;
  facilityType: FacilityType;
  description: string;
  latitude: number;
  longitude: number;
  isPublic: boolean;
  status: 'OPERATIONAL' | 'LIMITED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
}

export type AlertType = 'CROWD_DENSITY' | 'CROWD_SURGE' | 'QUEUE' | 'GATE' | 'ROUTE' | 'SECURITY' | 'MEDICAL' | 'WEATHER' | 'SYSTEM' | 'OTHER';
export type AlertSeverity = 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';

export interface Alert {
  id: string;
  eventId: string;
  zoneId: string | null;
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  publicMessage: string;
  internalMessage: string;
  status: AlertStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export type IncidentType = 'MEDICAL' | 'SECURITY' | 'FIRE' | 'CROWD' | 'LOST_PERSON' | 'INFRASTRUCTURE' | 'OTHER';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'REPORTED' | 'INVESTIGATING' | 'DISPATCHED' | 'RESOLVED';

export interface Incident {
  id: string;
  eventId: string;
  zoneId: string | null;
  reportedBy: string;
  incidentType: IncidentType;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  location: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  eventId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface SuperAdminDashboardMetrics {
  totalEvents: number;
  liveEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  totalEventAdmins: number;
  totalSuperAdmins: number;
  activeCriticalAlerts: number;
  activeIncidents: number;
  maxSuperAdmins: number;
  maxEventAdmins: number;
  activeEventsCount?: number;
}

export interface EventSummary {
  id: string;
  name: string;
  eventType: string;
  venueName: string;
  venueAddress: string;
  city: string;
  startDateTime: string;
  endDateTime: string;
  status: EventStatus;
  crowdDensityLevel: DensityLevel;
  currentPeopleCount: number;
  netFlow: number;
  activeAlertsCount: number;
  criticalAlertsCount: number;
  activeIncidentsCount: number;
  gatesCount: number;
  avgSpeedMps?: number;
  autonomousMode?: boolean;
  activeZonesCount?: number;
}

export interface EventDashboardData {
  event: Event;
  currentCrowdStatus: {
    densityLevel: DensityLevel;
    currentPeopleCount: number;
    currentInflow: number;
    currentOutflow: number;
    netFlow: number;
    occupancyPercent: number;
    lastTelemetryTimestamp: string | null;
  };
  activeAlerts: Alert[];
  criticalAlerts: Alert[];
  activeIncidents: Incident[];
  gateStatuses: Gate[];
  zoneStatuses: CrowdZone[];
  queueStatuses: Queue[];
  latestPredictions: MLPrediction[];
  cameraStatuses: Camera[];
  recentTelemetry: CrowdTelemetry[];
}

export interface PublicGateRecommendation {
  name: string;
  status: GateStatus;
  waitMinutes: number;
  recommendation: 'RECOMMENDED' | 'MODERATE' | 'BUSY' | 'CLOSED';
}

export interface PublicEventDetails {
  id: string;
  name: string;
  venueName: string;
  city: string;
  status: EventStatus;
  crowdStatus: {
    densityLevel: DensityLevel;
    inflowStatus: string;
  };
  gateStatuses: PublicGateRecommendation[];
  publicAlerts: {
    id: string;
    title: string;
    publicMessage: string;
    severity: string;
    createdAt: string;
  }[];
}