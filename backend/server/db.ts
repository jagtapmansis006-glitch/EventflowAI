import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { mirrorToFirestore } from './firebase';

// ============================================================
// USERS
// ============================================================

export type Role = 'SUPER_ADMIN' | 'EVENT_ADMIN' | 'ATTENDEE';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: Role;
  isActive: boolean;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

// ============================================================
// EVENTS
// ============================================================

export type EventStatus =
  | 'DRAFT'
  | 'UPCOMING'
  | 'LIVE'
  | 'COMPLETED'
  | 'CANCELLED';

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
  autonomousMode?: boolean;
  mapImageUrl?: string;
  venueMapPath?: string;
  venueMapData?: any;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventAdminAssignment {
  id: string;
  eventId: string;
  userId: string;
  assignedBy: string;
  createdAt: string;
}

// ============================================================
// VENUE
// ============================================================

export interface Venue {
  id: string;
  eventId: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  mapData?: any;
  createdAt: string;
  updatedAt: string;
}

export type LocationType =
  | 'GATE'
  | 'ZONE'
  | 'STAGE'
  | 'FACILITY'
  | 'EXIT'
  | 'EMERGENCY_EXIT'
  | 'QUEUE'
  | 'RESTRICTED_AREA'
  | 'OTHER';

export interface VenueLocation {
  id: string;
  eventId: string;
  venueId: string;
  name: string;
  locationType: LocationType;
  description: string;
  latitude: number;
  longitude: number;
  capacity: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// GATES
// ============================================================

export type GateStatus =
  | 'OPEN'
  | 'CLOSED'
  | 'RESTRICTED'
  | 'FULL'
  | 'EMERGENCY_ONLY';

export interface Gate {
  id: string;
  eventId: string;
  venueId: string;
  zoneId?: string;
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

// ============================================================
// CROWD ZONES
// ============================================================

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
  boundaryGeoJson?: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// CAMERAS
// ============================================================

export type CameraSourceType =
  | 'WEBCAM'
  | 'VIDEO_FILE'
  | 'RTSP'
  | 'HTTP_STREAM'
  | 'IP_CAMERA'
  | 'CCTV';

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

// ============================================================
// TELEMETRY
// ============================================================

export type DensityLevel =
  | 'LOW'
  | 'MODERATE'
  | 'BUSY'
  | 'CRITICAL';

export interface CrowdTelemetry {
  id: string;
  eventId: string;
  cameraId: string;
  zoneId: string;
  timestamp: string;
  peopleCount: number;
  avgSpeedMps?: number;
  inflow: number;
  outflow: number;
  netFlow: number;
  occupancyPercent: number;
  densityLevel: DensityLevel;
  queueLength: number;
  averageDwellTime: number;
  createdAt: string;
}

// ============================================================
// PREDICTIONS
// ============================================================

export type PredictionType =
  | 'CROWD_COUNT'
  | 'OCCUPANCY'
  | 'INFLOW'
  | 'OUTFLOW'
  | 'QUEUE'
  | 'RISK';

export type RiskLevel =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

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

// ============================================================
// RECOMMENDATIONS
// ============================================================

export type RecommendationType =
  | 'OPEN_GATE'
  | 'REDIRECT_ROUTE'
  | 'REDIRECT_ATTENDEES'
  | 'NOTIFY_ADMIN'
  | 'DISPATCH_STAFF'
  | 'DEPLOY_STAFF'
  | 'MONITOR_ZONE'
  | 'PREPARE_ALTERNATE_ROUTE';

export type RecommendationPriority =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export type RecommendationStatus =
  | 'ACTIVE'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTED'
  | 'RESOLVED'
  | 'EXPIRED';

export interface Recommendation {
  id: string;
  eventId: string;
  zoneId: string;

  recommendationType: RecommendationType;
  priority: RecommendationPriority;

  title: string;
  description: string;

  basedOnPredictionId: string | null;
  suggestedGateId: string | null;

  status: RecommendationStatus;

  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;

  // Legacy fields kept optional so older db.json records
  // do not break the application.
  type?: RecommendationType;
  reason?: string;
  suggestedAction?: string;
  riskLevel?: RiskLevel;
  confidence?: number;
}

// ============================================================
// SIMULATIONS
// ============================================================

export type ScenarioType =
  | 'GATE_CLOSURE'
  | 'GATE_OPENING'
  | 'ROUTE_CHANGE'
  | 'CROWD_SURGE'
  | 'CAPACITY_CHANGE'
  | 'STAFF_REALLOCATION'
  | 'CUSTOM';

export type SimulationStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED';

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

// ============================================================
// QUEUES
// ============================================================

export type QueueStatus =
  | 'NORMAL'
  | 'BUSY'
  | 'CRITICAL'
  | 'CLOSED';

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

// ============================================================
// ROUTES
// ============================================================

export type RouteType =
  | 'NORMAL'
  | 'EMERGENCY'
  | 'ACCESSIBLE'
  | 'STAFF'
  | 'RESTRICTED';

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
  pathGeoJson?: any;
  isAccessible: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// FACILITIES
// ============================================================

export type FacilityType =
  | 'TOILET'
  | 'MEDICAL'
  | 'FOOD'
  | 'WATER'
  | 'HELP_DESK'
  | 'PARKING'
  | 'REST_AREA'
  | 'SECURITY'
  | 'OTHER';

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

// ============================================================
// ALERTS
// ============================================================

export type AlertType =
  | 'CROWD_DENSITY'
  | 'CROWD_SURGE'
  | 'QUEUE'
  | 'GATE'
  | 'ROUTE'
  | 'SECURITY'
  | 'MEDICAL'
  | 'WEATHER'
  | 'SYSTEM'
  | 'OTHER';

export type AlertSeverity =
  | 'INFO'
  | 'WARNING'
  | 'HIGH'
  | 'CRITICAL';

export type AlertStatus =
  | 'ACTIVE'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'DISMISSED';

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

// ============================================================
// INCIDENTS
// ============================================================

export type IncidentType =
  | 'MEDICAL'
  | 'SECURITY'
  | 'FIRE'
  | 'CROWD'
  | 'LOST_PERSON'
  | 'INFRASTRUCTURE'
  | 'OTHER';

export type IncidentSeverity =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export type IncidentStatus =
  | 'REPORTED'
  | 'INVESTIGATING'
  | 'DISPATCHED'
  | 'RESOLVED';

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
  assignedStaff?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

// ============================================================
// ASSISTANT
// ============================================================

export interface AssistantConversation {
  id: string;
  eventId: string;
  userId?: string;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantMessage {
  id: string;
  conversationId: string;
  sender: 'USER' | 'ASSISTANT';
  message: string;
  createdAt: string;
}

// ============================================================
// AUDIT
// ============================================================

export interface AuditLog {
  id: string;
  userId: string;
  eventId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export type ActivityLog = AuditLog;

export interface DatabaseSchema {
  users: User[];
  events: Event[];
  eventAdminAssignments: EventAdminAssignment[];
  venues: Venue[];
  venueLocations: VenueLocation[];
  gates: Gate[];
  crowdZones: CrowdZone[];
  cameras: Camera[];
  crowdTelemetry: CrowdTelemetry[];
  mlPredictions: MLPrediction[];
  recommendations: Recommendation[];
  simulations: Simulation[];
  queues: Queue[];
  routes: Route[];
  facilities: Facility[];
  alerts: Alert[];
  incidents: Incident[];
  assistantConversations: AssistantConversation[];
  assistantMessages: AssistantMessage[];
  auditLogs: AuditLog[];
  activityLogs?: AuditLog[];
}

// ============================================================
// DATABASE
// ============================================================

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function hashPassword(password: string): string {
  const salt = 'eventflow_static_salt_2026';
  return crypto
    .scryptSync(password, salt, 64)
    .toString('hex');
}

export function verifyPassword(
  password: string,
  hash: string
): boolean {
  return hashPassword(password) === hash;
}

class Database {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(
          DB_FILE,
          'utf-8'
        );

        const parsed = JSON.parse(raw);

        return {
          users: parsed.users || [],
          events: parsed.events || [],
          eventAdminAssignments:
            parsed.eventAdminAssignments || [],
          venues: parsed.venues || [],
          venueLocations:
            parsed.venueLocations || [],
          gates: parsed.gates || [],
          crowdZones:
            parsed.crowdZones || [],
          cameras:
            parsed.cameras || [],
          crowdTelemetry:
            parsed.crowdTelemetry || [],
          mlPredictions:
            parsed.mlPredictions || [],
          recommendations:
            parsed.recommendations || [],
          simulations:
            parsed.simulations || [],
          queues:
            parsed.queues || [],
          routes:
            parsed.routes || [],
          facilities:
            parsed.facilities || [],
          alerts:
            parsed.alerts || [],
          incidents:
            parsed.incidents || [],
          assistantConversations:
            parsed.assistantConversations || [],
          assistantMessages:
            parsed.assistantMessages || [],
          auditLogs:
            parsed.auditLogs || []
        };
      } catch (e) {
        console.error(
          'Failed to parse database file, re-initializing seed data',
          e
        );
      }
    }

    const initial =
      this.generateSeedData();

    this.saveImmediate(initial);

    return initial;
  }

  private saveImmediate(
    dataToSave: DatabaseSchema
  ) {
    try {
      fs.writeFileSync(
        DB_FILE,
        JSON.stringify(
          dataToSave,
          null,
          2
        ),
        'utf-8'
      );
    } catch (err) {
      console.error(
        'Error writing database to disk:',
        err
      );
    }

    mirrorToFirestore(
      dataToSave as unknown as Record<string, any[]>
    ).catch(err => {
      console.error(
        '[Firestore Mirror] Unexpected error:',
        err
      );
    });
  }

  private trimHighVolumeCollections() {
    const MAX_TELEMETRY = 500;
    const MAX_PREDICTIONS = 300;

    if (this.data.crowdTelemetry.length > MAX_TELEMETRY) {
      this.data.crowdTelemetry.splice(0, this.data.crowdTelemetry.length - MAX_TELEMETRY);
    }
    if (this.data.mlPredictions.length > MAX_PREDICTIONS) {
      this.data.mlPredictions.splice(0, this.data.mlPredictions.length - MAX_PREDICTIONS);
    }
  }

  public save() {
    this.trimHighVolumeCollections();

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveImmediate(this.data);
      this.saveTimeout = null;
    }, 100);
  }

  public get<K extends keyof DatabaseSchema>(
    collection: K
  ): DatabaseSchema[K] {
    if ((collection as string) === 'activityLogs') {
      return this.data.auditLogs as any;
    }
    return this.data[collection];
  }

  public raw(): DatabaseSchema {
    return this.data;
  }

  // ==========================================================
  // SEED DATA
  // ==========================================================

  private generateSeedData(): DatabaseSchema {
    const now =
      new Date().toISOString();

    const superAdminId =
      'user_super_admin_1';

    const eventAdmin1Id =
      'user_event_admin_1';

    const eventAdmin2Id =
      'user_event_admin_2';

    const defaultPasswordHash =
      hashPassword(
        'EventFlow@2026!'
      );

    const users: User[] = [
      {
        id: superAdminId,
        fullName:
          'Global Command Director',
        email:
          'superadmin@eventflow.ai',
        phone: '+1-555-0199',
        role: 'SUPER_ADMIN',
        isActive: true,
        passwordHash:
          defaultPasswordHash,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now
      },
      {
        id: eventAdmin1Id,
        fullName:
          'Marcus Vance (Apex Arena Ops)',
        email:
          'eventadmin@eventflow.ai',
        phone: '+1-555-0214',
        role: 'EVENT_ADMIN',
        isActive: true,
        passwordHash:
          defaultPasswordHash,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now
      },
      {
        id: eventAdmin2Id,
        fullName:
          'Elena Rostova (Metropolis Expo)',
        email:
          'elena@eventflow.ai',
        phone: '+1-555-0288',
        role: 'EVENT_ADMIN',
        isActive: true,
        passwordHash:
          defaultPasswordHash,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null
      },
      {
        id: 'user_attendee_1',
        fullName:
          'Aarav Mehta (VIP Attendee)',
        email:
          'attendee@eventflow.ai',
        phone: '+1-555-0300',
        role: 'ATTENDEE',
        isActive: true,
        passwordHash:
          defaultPasswordHash,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null
      }
    ];

    const event1Id =
      'event_apex_summit_2026';

    const event2Id =
      'event_metropolis_soundwave';

    const event3Id =
      'event_cybertech_con_2026';

    const events: Event[] = [
      {
        id: event1Id,
        name:
          'Apex World Stadium Championship 2026',
        description:
          'Major international sports and music festival with 45,000 attendee capacity across 4 main zones.',
        eventType:
          'SPORTS_FESTIVAL',
        venueName:
          'Apex Grand Arena',
        venueAddress:
          '100 Olympic Way',
        city:
          'San Francisco, CA',
        startDateTime:
          new Date(
            Date.now() -
              3600000 * 4
          ).toISOString(),
        endDateTime:
          new Date(
            Date.now() +
              3600000 * 8
          ).toISOString(),
        status: 'LIVE',
        createdBy:
          superAdminId,
        createdAt: now,
        updatedAt: now
      },
      {
        id: event2Id,
        name:
          'Metropolis Soundwave Expo',
        description:
          'Multi-stage electronic audio showcase with immersive laser stages and high-density flow corridors.',
        eventType:
          'MUSIC_EXPO',
        venueName:
          'Metropolis Convention Complex',
        venueAddress:
          '550 Harbor Boulevard',
        city:
          'Seattle, WA',
        startDateTime:
          new Date(
            Date.now() +
              3600000 * 24
          ).toISOString(),
        endDateTime:
          new Date(
            Date.now() +
              3600000 * 48
          ).toISOString(),
        status: 'UPCOMING',
        createdBy:
          superAdminId,
        createdAt: now,
        updatedAt: now
      },
      {
        id: event3Id,
        name:
          'Global AI & Robotics Summit 2026',
        description:
          'Enterprise tech keynote sessions, product pavilions, and regulated autonomous demonstration halls.',
        eventType:
          'CONFERENCE',
        venueName:
          'Silicon Expo Dome',
        venueAddress:
          '1200 Innovation Parkway',
        city:
          'San Jose, CA',
        startDateTime:
          new Date(
            Date.now() -
              3600000 * 72
          ).toISOString(),
        endDateTime:
          new Date(
            Date.now() -
              3600000 * 24
          ).toISOString(),
        status: 'COMPLETED',
        createdBy:
          superAdminId,
        createdAt: now,
        updatedAt: now
      }
    ];

    const eventAdminAssignments:
      EventAdminAssignment[] = [
        {
          id: 'assign_1',
          eventId: event1Id,
          userId: eventAdmin1Id,
          assignedBy:
            superAdminId,
          createdAt: now
        },
        {
          id: 'assign_2',
          eventId: event2Id,
          userId: eventAdmin2Id,
          assignedBy:
            superAdminId,
          createdAt: now
        }
      ];

    const venue1Id =
      'venue_apex_arena';

    const venues: Venue[] = [
      {
        id: venue1Id,
        eventId: event1Id,
        name:
          'Apex Grand Arena & Plaza',
        description:
          'Multi-tier stadium bowl and surrounding pedestrian concourse',
        latitude: 37.7749,
        longitude: -122.4194,
        mapData: {
          zonesCount: 4,
          gatesCount: 6
        },
        createdAt: now,
        updatedAt: now
      }
    ];

    const zone1Id =
      'zone_north_plaza';

    const zone2Id =
      'zone_main_bowl';

    const zone3Id =
      'zone_east_concourse';

    const zone4Id =
      'zone_vip_lounge';

    const crowdZones: CrowdZone[] = [
      {
        id: zone1Id,
        eventId: event1Id,
        venueId: venue1Id,
        name:
          'North Ingress Plaza',
        description:
          'Primary public check-in and security queuing area',
        capacity: 12000,
        warningThreshold: 8500,
        criticalThreshold: 10500,
        latitude: 37.7752,
        longitude: -122.419,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: zone2Id,
        eventId: event1Id,
        venueId: venue1Id,
        name:
          'Main Stadium Bowl',
        description:
          'Central pitch and general admission tiered seating',
        capacity: 25000,
        warningThreshold: 20000,
        criticalThreshold: 23500,
        latitude: 37.7749,
        longitude: -122.4194,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: zone3Id,
        eventId: event1Id,
        venueId: venue1Id,
        name:
          'East Concourse & Food Pavilion',
        description:
          'High-density circulation loop connecting Gates 3 & 4 with facilities',
        capacity: 6000,
        warningThreshold: 4500,
        criticalThreshold: 5400,
        latitude: 37.7745,
        longitude: -122.4185,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: zone4Id,
        eventId: event1Id,
        venueId: venue1Id,
        name:
          'VIP West Lounge',
        description:
          'Restricted partner and hospitality pavilion',
        capacity: 2000,
        warningThreshold: 1600,
        criticalThreshold: 1850,
        latitude: 37.7748,
        longitude: -122.4205,
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ];

    const gates: Gate[] = [
      {
        id: 'gate_1',
        eventId: event1Id,
        venueId: venue1Id,
        name:
          'Gate 1 (North Turnstiles)',
        gateCode:
          'G-NORTH-01',
        gateType:
          'MAIN_ENTRANCE',
        status: 'OPEN',
        capacity: 4500,
        currentCount: 3120,
        latitude: 37.7755,
        longitude: -122.4191,
        isPublic: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'gate_2',
        eventId: event1Id,
        venueId: venue1Id,
        name:
          'Gate 2 (North-West Accessible)',
        gateCode:
          'G-NW-ACC',
        gateType:
          'ACCESSIBLE_ENTRY',
        status: 'OPEN',
        capacity: 1500,
        currentCount: 410,
        latitude: 37.7753,
        longitude: -122.4198,
        isPublic: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'gate_3',
        eventId: event1Id,
        venueId: venue1Id,
        name:
          'Gate 3 (East Concourse)',
        gateCode:
          'G-EAST-03',
        gateType:
          'PEDESTRIAN_GATE',
        status: 'RESTRICTED',
        capacity: 3500,
        currentCount: 3200,
        latitude: 37.7746,
        longitude: -122.4182,
        isPublic: true,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'gate_4',
        eventId: event1Id,
        venueId: venue1Id,
        name:
          'Gate 4 (South Exit Portal)',
        gateCode:
          'G-SOUTH-04',
        gateType:
          'EGRESS_ONLY',
        status: 'OPEN',
        capacity: 5000,
        currentCount: 890,
        latitude: 37.7741,
        longitude: -122.4195,
        isPublic: true,
        createdAt: now,
        updatedAt: now
      }
    ];

    const venueLocations:
      VenueLocation[] = [
        {
          id: 'loc_gate1',
          eventId: event1Id,
          venueId: venue1Id,
          name:
            'North Gate 1 Area',
          locationType: 'GATE',
          description:
            'Main pedestrian entrance',
          latitude: 37.7755,
          longitude: -122.4191,
          capacity: 4500,
          isPublic: true,
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'loc_zone1',
          eventId: event1Id,
          venueId: venue1Id,
          name:
            'North Plaza Promenade',
          locationType: 'ZONE',
          description:
            'Large open-air assembly zone',
          latitude: 37.7752,
          longitude: -122.419,
          capacity: 12000,
          isPublic: true,
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'loc_med1',
          eventId: event1Id,
          venueId: venue1Id,
          name:
            'Emergency Medical Station Alpha',
          locationType:
            'FACILITY',
          description:
            'Fully equipped medical triage tent',
          latitude: 37.7747,
          longitude: -122.4188,
          capacity: 40,
          isPublic: true,
          createdAt: now,
          updatedAt: now
        }
      ];

    const cameras: Camera[] = [
      {
        id: 'cam_n_plaza_01',
        eventId: event1Id,
        venueId: venue1Id,
        zoneId: zone1Id,
        name:
          'North Plaza Overhead 01',
        cameraCode:
          'CAM-NP-01',
        sourceType: 'CCTV',
        sourceUrl:
          'rtsp://internal-cv.mesh.local/live/north_plaza_01',
        status: 'ONLINE',
        isActive: true,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'cam_n_gate_02',
        eventId: event1Id,
        venueId: venue1Id,
        zoneId: zone1Id,
        name:
          'Gate 1 Turnstile Line Sensor',
        cameraCode:
          'CAM-G1-VLINE',
        sourceType:
          'IP_CAMERA',
        sourceUrl:
          'rtsp://internal-cv.mesh.local/live/gate1_line',
        status: 'ONLINE',
        isActive: true,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'cam_east_conc_03',
        eventId: event1Id,
        venueId: venue1Id,
        zoneId: zone3Id,
        name:
          'East Concourse Flow Cam',
        cameraCode:
          'CAM-EC-03',
        sourceType:
          'HTTP_STREAM',
        sourceUrl:
          'http://internal-cv.mesh.local/stream/east_concourse',
        status: 'ONLINE',
        isActive: true,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'cam_bowl_pan_04',
        eventId: event1Id,
        venueId: venue1Id,
        zoneId: zone2Id,
        name:
          'Bowl Panoramic Telemetry',
        cameraCode:
          'CAM-BP-04',
        sourceType: 'CCTV',
        sourceUrl:
          'rtsp://internal-cv.mesh.local/live/bowl_pan',
        status: 'ONLINE',
        isActive: true,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now
      }
    ];

    const crowdTelemetry:
      CrowdTelemetry[] = [];

    const baseTime =
      Date.now();

    for (
      let i = 10;
      i >= 0;
      i--
    ) {
      const windowTimestamp =
        new Date(
          baseTime -
            i * 30000
        ).toISOString();

      const people =
        910 +
        (10 - i) * 6;

      const inflow =
        42 +
        Math.floor(
          Math.sin(i) * 8
        );

      const outflow =
        16 +
        Math.floor(
          Math.cos(i) * 4
        );

      const net =
        inflow - outflow;

      crowdTelemetry.push({
        id:
          `telem_np_${10 - i}`,
        eventId: event1Id,
        cameraId:
          'cam_n_plaza_01',
        zoneId: zone1Id,
        timestamp:
          windowTimestamp,
        peopleCount:
          people,
        inflow,
        outflow,
        netFlow: net,
        occupancyPercent:
          Math.round(
            (people / 12000) * 100
          ),
        densityLevel:
          people > 10500
            ? 'CRITICAL'
            : people > 8500
              ? 'BUSY'
              : 'MODERATE',
        queueLength:
          110 +
          (10 - i) * 4,
        averageDwellTime:
          240,
        createdAt:
          windowTimestamp
      });
    }

    const mlPredictions:
      MLPrediction[] = [
        {
          id:
            'pred_np_crowd_5m',
          eventId: event1Id,
          zoneId: zone1Id,
          predictionType:
            'CROWD_COUNT',
          predictionTime: now,
          forecastFor:
            new Date(
              Date.now() +
                300000
            ).toISOString(),
          predictedPeopleCount:
            1180,
          predictedOccupancyPercent:
            88,
          predictedInflow:
            56,
          predictedOutflow:
            18,
          riskLevel:
            'HIGH',
          confidence:
            0.91,
          modelName:
            'TimeStep-FlowEstimator-v1',
          modelVersion:
            '1.2.0',
          inputWindow:
            '10_MINUTES_HISTORICAL',
          createdAt: now
        },
        {
          id:
            'pred_ec_occupancy_10m',
          eventId: event1Id,
          zoneId: zone3Id,
          predictionType:
            'OCCUPANCY',
          predictionTime: now,
          forecastFor:
            new Date(
              Date.now() +
                600000
            ).toISOString(),
          predictedPeopleCount:
            4900,
          predictedOccupancyPercent:
            82,
          predictedInflow:
            38,
          predictedOutflow:
            22,
          riskLevel:
            'MEDIUM',
          confidence:
            0.88,
          modelName:
            'Concourse-Density-Predictor',
          modelVersion:
            '1.0.4',
          inputWindow:
            '15_MINUTES_HISTORICAL',
          createdAt: now
        }
      ];

    // IMPORTANT:
    // Recommendations start empty.
    // They are generated dynamically by recommendationEngine.ts.
    const recommendations:
      Recommendation[] = [];

    const simulations:
      Simulation[] = [
        {
          id:
            'sim_north_gate_surge',
          eventId: event1Id,
          createdBy:
            superAdminId,
          name:
            'Gate 1 Peak Arrival Surge Simulation',
          description:
            'Simulates 35% higher inflow at Gate 1 over a 20-minute window with turnstiles 1-4 active.',
          scenarioType:
            'CROWD_SURGE',
          inputParameters: {
            surgePercent: 35,
            affectedZoneId:
              zone1Id,
            durationMinutes: 20,
            weatherFactor: 1.0
          },
          status:
            'COMPLETED',
          results: {
            peakPeopleCount:
              10450,
            peakOccupancyPercent:
              87.1,
            bottleneckZone:
              'North Ingress Plaza',
            spilloverTimeToGate2:
              7.5,
            recommendation:
              'Open secondary Gate 2 accessible lanes to divert 300 persons/min.'
          },
          createdAt:
            new Date(
              Date.now() -
                3600000
            ).toISOString(),
          completedAt:
            new Date(
              Date.now() -
                3580000
            ).toISOString()
        }
      ];

    const queues:
      Queue[] = [
        {
          id:
            'queue_g1_main',
          eventId: event1Id,
          zoneId: zone1Id,
          name:
            'Gate 1 Turnstile Screening Line',
          capacity: 400,
          currentLength: 146,
          averageWaitTime:
            8.5,
          status:
            'BUSY',
          createdAt: now,
          updatedAt: now
        },
        {
          id:
            'queue_g2_acc',
          eventId: event1Id,
          zoneId: zone1Id,
          name:
            'Gate 2 Accessible Priority Lane',
          capacity: 100,
          currentLength: 12,
          averageWaitTime:
            2.0,
          status:
            'NORMAL',
          createdAt: now,
          updatedAt: now
        }
      ];

    const routes:
      Route[] = [
        {
          id:
            'route_n_to_bowl',
          eventId: event1Id,
          name:
            'North Plaza to Stadium Bowl Arterial',
          routeType:
            'NORMAL',
          sourceLocationId:
            'loc_zone1',
          destinationLocationId:
            'loc_gate1',
          distance: 180,
          estimatedTime:
            3.5,
          capacity: 3500,
          status:
            'OPEN',
          isAccessible: true,
          isPublic: true,
          createdAt: now,
          updatedAt: now
        },
        {
          id:
            'route_emerg_east',
          eventId: event1Id,
          name:
            'East Concourse Emergency Egress Lane',
          routeType:
            'EMERGENCY',
          sourceLocationId:
            'loc_zone1',
          destinationLocationId:
            'loc_med1',
          distance: 220,
          estimatedTime:
            2.5,
          capacity: 2000,
          status:
            'OPEN',
          isAccessible: true,
          isPublic: true,
          createdAt: now,
          updatedAt: now
        }
      ];

    const facilities:
      Facility[] = [
        {
          id:
            'fac_med_alpha',
          eventId: event1Id,
          venueId: venue1Id,
          name:
            'Medical Aid Post Alpha',
          facilityType:
            'MEDICAL',
          description:
            'First aid and paramedic emergency station',
          latitude: 37.7747,
          longitude: -122.4188,
          isPublic: true,
          status:
            'OPERATIONAL',
          createdAt: now,
          updatedAt: now
        },
        {
          id:
            'fac_water_01',
          eventId: event1Id,
          venueId: venue1Id,
          name:
            'Hydration Station North',
          facilityType:
            'WATER',
          description:
            'Complimentary filtered refill station',
          latitude: 37.7753,
          longitude: -122.4189,
          isPublic: true,
          status:
            'OPERATIONAL',
          createdAt: now,
          updatedAt: now
        },
        {
          id:
            'fac_rest_east',
          eventId: event1Id,
          venueId: venue1Id,
          name:
            'East Restrooms Block B',
          facilityType:
            'TOILET',
          description:
            'Accessible restrooms with baby changing units',
          latitude: 37.7746,
          longitude: -122.4184,
          isPublic: true,
          status:
            'OPERATIONAL',
          createdAt: now,
          updatedAt: now
        },
        {
          id:
            'fac_info_desk',
          eventId: event1Id,
          venueId: venue1Id,
          name:
            'Guest Services & Accessibility Desk',
          facilityType:
            'HELP_DESK',
          description:
            'Wheelchair loan, lost & found, and sensory quiet packs',
          latitude: 37.7754,
          longitude: -122.4193,
          isPublic: true,
          status:
            'OPERATIONAL',
          createdAt: now,
          updatedAt: now
        }
      ];

    const alerts:
      Alert[] = [
        {
          id:
            'alert_surge_01',
          eventId: event1Id,
          zoneId: zone1Id,
          alertType:
            'CROWD_DENSITY',
          severity:
            'HIGH',
          title:
            'High Density Ingress at North Plaza',
          publicMessage:
            'Heavy foot traffic at North Gate 1. Please consider using Gate 2 West for faster entry.',
          internalMessage:
            'North Ingress Plaza telemetry reached 88% occupancy. Dispatching 4 crowd marshals to turnstiles.',
          status:
            'ACTIVE',
          createdBy:
            superAdminId,
          createdAt:
            new Date(
              Date.now() -
                900000
            ).toISOString(),
          updatedAt:
            new Date(
              Date.now() -
                900000
            ).toISOString(),
          resolvedAt:
            null
        },
        {
          id:
            'alert_concourse_02',
          eventId: event1Id,
          zoneId: zone3Id,
          alertType:
            'QUEUE',
          severity:
            'WARNING',
          title:
            'Food Pavilion Bottleneck',
          publicMessage:
            'Concourse food stalls experiencing 12+ min queues.',
          internalMessage:
            'East concourse flow velocity dropped by 40%. Monitoring CCTV CAM-EC-03.',
          status:
            'ACKNOWLEDGED',
          createdBy:
            eventAdmin1Id,
          createdAt:
            new Date(
              Date.now() -
                1800000
            ).toISOString(),
          updatedAt:
            new Date(
              Date.now() -
                1200000
            ).toISOString(),
          resolvedAt:
            null
        }
      ];

    const incidents:
      Incident[] = [
        {
          id:
            'inc_med_01',
          eventId: event1Id,
          zoneId: zone1Id,
          reportedBy:
            eventAdmin1Id,
          incidentType:
            'MEDICAL',
          title:
            'Attendee Dehydration Support Required',
          description:
            'Individual reported faintness near Gate 1 turnstile corridor. Paramedic unit Alpha dispatched.',
          severity:
            'MEDIUM',
          status:
            'DISPATCHED',
          location:
            'North Gate 1 Corridor Lane 4',
          createdAt:
            new Date(
              Date.now() -
                720000
            ).toISOString(),
          updatedAt:
            new Date(
              Date.now() -
                400000
            ).toISOString(),
          resolvedAt:
            null
        }
      ];

    const auditLogs:
      AuditLog[] = [
        {
          id:
            'audit_01',
          userId:
            superAdminId,
          eventId:
            event1Id,
          action:
            'EVENT_INITIALIZED',
          resourceType:
            'EVENT',
          resourceId:
            event1Id,
          metadata: {
            status: 'LIVE',
            venue:
              'Apex Grand Arena'
          },
          createdAt:
            new Date(
              Date.now() -
                3600000 * 4
            ).toISOString()
        },
        {
          id:
            'audit_02',
          userId:
            superAdminId,
          eventId:
            event1Id,
          action:
            'ADMIN_ASSIGNED',
          resourceType:
            'EVENT_ADMIN_ASSIGNMENT',
          resourceId:
            'assign_1',
          metadata: {
            adminEmail:
              'eventadmin@eventflow.ai'
          },
          createdAt:
            new Date(
              Date.now() -
                3600000 * 3
            ).toISOString()
        },
        {
          id:
            'audit_03',
          userId:
            superAdminId,
          eventId:
            event1Id,
          action:
            'ALERT_CREATED',
          resourceType:
            'ALERT',
          resourceId:
            'alert_surge_01',
          metadata: {
            severity:
              'HIGH',
            zone:
              'North Ingress Plaza'
          },
          createdAt:
            new Date(
              Date.now() -
                900000
            ).toISOString()
        }
      ];

    return {
      users,
      events,
      eventAdminAssignments,
      venues,
      venueLocations,
      gates,
      crowdZones,
      cameras,
      crowdTelemetry,
      mlPredictions,
      recommendations: [],
      simulations,
      queues,
      routes,
      facilities,
      alerts,
      incidents,
      assistantConversations: [],
      assistantMessages: [],
      auditLogs
    };
  }
}

export const db =
  new Database();