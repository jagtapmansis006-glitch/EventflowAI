import { Router, Response } from 'express';
import crypto from 'crypto';
import { db, Event, User, EventAdminAssignment, hashPassword, EventStatus } from '../db';
import { authMiddleware, requireSuperAdmin, checkAccountRoleLimits, AuthenticatedRequest } from '../auth';
import { recordAuditLog } from '../audit';
import { realtimeManager } from '../realtime';

const router = Router();

// Protect all routes under /super-admin with Super Admin authorization
router.use(authMiddleware);
router.use(requireSuperAdmin);

// GET /api/v1/super-admin/dashboard
router.get('/dashboard', (req: AuthenticatedRequest, res: Response) => {
  const events = (db.get('events') as any[]) || [];
  const users = (db.get('users') as any[]) || [];
  const alerts = (db.get('alerts') as any[]) || [];
  const incidents = (db.get('incidents') as any[]) || [];
  const telemetry = (db.get('crowdTelemetry') as any[]) || [];
  const gates = (db.get('gates') as any[]) || [];

  const totalEvents = events.length;
  const liveEvents = events.filter((e: any) => e.status === 'LIVE').length;
  const upcomingEvents = events.filter((e: any) => e.status === 'UPCOMING').length;
  const completedEvents = events.filter((e: any) => e.status === 'COMPLETED').length;
  const totalEventAdmins = users.filter((u: any) => u.role === 'EVENT_ADMIN').length;
  const totalSuperAdmins = users.filter((u: any) => u.role === 'SUPER_ADMIN').length;

  const activeCriticalAlerts = alerts.filter((a: any) => a.status === 'ACTIVE' && a.severity === 'CRITICAL').length;
  const activeIncidents = incidents.filter((i: any) => i.status !== 'RESOLVED').length;

  const eventSummaries = events.map((evt: any) => {
    const evtAlerts = alerts.filter((a: any) => a.eventId === evt.id && a.status === 'ACTIVE');
    const evtIncidents = incidents.filter((i: any) => i.eventId === evt.id && i.status !== 'RESOLVED');
    const evtTelemetry = telemetry.filter((t: any) => t.eventId === evt.id);
    const latestTelem = evtTelemetry.length > 0 ? evtTelemetry[evtTelemetry.length - 1] : null;
    const evtGates = gates.filter((g: any) => g.eventId === evt.id);

    return {
      id: evt.id,
      name: evt.name,
      eventType: evt.eventType,
      venueName: evt.venueName,
      venueAddress: evt.venueAddress,
      city: evt.city,
      startDateTime: evt.startDateTime,
      endDateTime: evt.endDateTime,
      status: evt.status,
      crowdDensityLevel: latestTelem ? latestTelem.densityLevel : 'LOW',
      currentPeopleCount: latestTelem ? latestTelem.peopleCount : evtGates.reduce((s: number, g: any) => s + (g.currentCount || 0), 0),
      netFlow: latestTelem ? latestTelem.netFlow : 0,
      avgSpeedMps: latestTelem?.avgSpeedMps !== undefined ? latestTelem.avgSpeedMps : 1.10,
      autonomousMode: evt.autonomousMode ?? true,
      activeAlertsCount: evtAlerts.length,
      criticalAlertsCount: evtAlerts.filter((a: any) => a.severity === 'CRITICAL').length,
      activeIncidentsCount: evtIncidents.length,
      gatesCount: evtGates.length
    };
  });

  return res.json({
    metrics: {
      totalEvents,
      liveEvents,
      upcomingEvents,
      completedEvents,
      totalEventAdmins,
      totalSuperAdmins,
      activeCriticalAlerts,
      activeIncidents,
      maxSuperAdmins: 5,
      maxEventAdmins: 40
    },
    eventSummaries
  });
});

// GET /api/v1/super-admin/events
router.get('/events', (req: AuthenticatedRequest, res: Response) => {
  const events = (db.get('events') as any[]) || [];
  const alerts = (db.get('alerts') as any[]) || [];
  const incidents = (db.get('incidents') as any[]) || [];
  const assignments = (db.get('eventAdminAssignments') as any[]) || [];
  const users = (db.get('users') as any[]) || [];

  const detailedEvents = events.map((evt: any) => {
    const assignedAdmins = assignments
      .filter((a: any) => a.eventId === evt.id)
      .map((a: any) => {
        const u = users.find((usr: any) => usr.id === a.userId);
        return u ? { id: u.id, fullName: u.fullName, email: u.email } : null;
      })
      .filter(Boolean);

    return {
      ...evt,
      activeAlertsCount: alerts.filter((a: any) => a.eventId === evt.id && a.status === 'ACTIVE').length,
      activeIncidentsCount: incidents.filter((i: any) => i.eventId === evt.id && i.status !== 'RESOLVED').length,
      assignedAdmins
    };
  });

  return res.json({ events: detailedEvents });
});

// POST /api/v1/super-admin/events
router.post('/events', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { name, description, eventType, venueName, venueAddress, city, startDateTime, endDateTime, status, autonomousMode } = req.body;

  if (!name || !venueName || !startDateTime || !endDateTime) {
    return res.status(400).json({ error: 'Name, venue name, start date, and end date are required.' });
  }

  const newEventId = `event_${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  const newEvent: Event & { autonomousMode?: boolean } = {
    id: newEventId,
    name,
    description: description || '',
    eventType: eventType || 'CONFERENCE',
    venueName,
    venueAddress: venueAddress || '',
    city: city || '',
    startDateTime,
    endDateTime,
    status: (status as EventStatus) || 'UPCOMING',
    autonomousMode: autonomousMode !== undefined ? Boolean(autonomousMode) : true,
    createdBy: user.id,
    createdAt: now,
    updatedAt: now
  };

  (db.get('events') as any[]).unshift(newEvent);

  const venueId = `venue_${crypto.randomUUID().slice(0, 8)}`;
  (db.get('venues') as any[]).push({
    id: venueId,
    eventId: newEventId,
    name: venueName,
    description: `Main venue for ${name}`,
    latitude: 18.9894,
    longitude: 73.1175,
    createdAt: now,
    updatedAt: now
  });

  const zoneId = `zone_${crypto.randomUUID().slice(0, 8)}`;
  (db.get('crowdZones') as any[]).push({
    id: zoneId,
    eventId: newEventId,
    venueId,
    name: 'North Plaza Gate 1',
    description: 'Main ingress checkpoint',
    capacity: 5000,
    warningThreshold: 3800,
    criticalThreshold: 4600,
    latitude: 18.9894,
    longitude: 73.1175,
    isActive: true,
    createdAt: now,
    updatedAt: now
  });

  (db.get('gates') as any[]).push({
    id: `gate_${crypto.randomUUID().slice(0, 8)}`,
    eventId: newEventId,
    venueId,
    name: 'Main Gate A',
    gateCode: 'GATE-A',
    gateType: 'MAIN_ENTRANCE',
    status: 'OPEN',
    capacity: 2500,
    currentCount: 0,
    latitude: 18.9894,
    longitude: 73.1175,
    isPublic: true,
    createdAt: now,
    updatedAt: now
  });

  db.save();

  recordAuditLog({
    userId: user.id,
    eventId: newEventId,
    action: 'EVENT_CREATED',
    resourceType: 'EVENT',
    resourceId: newEventId,
    metadata: { name, venueName, status: newEvent.status }
  });

  realtimeManager.broadcast('event_status_changed', { eventId: newEventId, status: newEvent.status });

  return res.status(201).json({ event: newEvent });
});

// GET /api/v1/super-admin/events/:id
router.get('/events/:id', (req: AuthenticatedRequest, res: Response) => {
  const paramEventId = String(req.params.id || '');
  const evt = (db.get('events') as any[]).find((e: any) => e.id === paramEventId);
  if (!evt) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  const assignments = (db.get('eventAdminAssignments') as any[]).filter((a: any) => a.eventId === evt.id);
  const users = (db.get('users') as any[]) || [];
  const assignedAdmins = assignments.map((a: any) => users.find((u: any) => u.id === a.userId)).filter(Boolean);

  return res.json({ event: evt, assignedAdmins });
});

// PUT /api/v1/super-admin/events/:id
router.put('/events/:id', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const paramEventId = String(req.params.id || '');
  const evt = (db.get('events') as any[]).find((e: any) => e.id === paramEventId);
  if (!evt) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  const { name, description, eventType, venueName, venueAddress, city, startDateTime, endDateTime, status, autonomousMode } = req.body;
  if (name) evt.name = name;
  if (description !== undefined) evt.description = description;
  if (eventType) evt.eventType = eventType;
  if (venueName) evt.venueName = venueName;
  if (venueAddress !== undefined) evt.venueAddress = venueAddress;
  if (city !== undefined) evt.city = city;
  if (startDateTime) evt.startDateTime = startDateTime;
  if (endDateTime) evt.endDateTime = endDateTime;
  if (status) evt.status = status;
  if (autonomousMode !== undefined) evt.autonomousMode = Boolean(autonomousMode);

  evt.updatedAt = new Date().toISOString();
  db.save();

  recordAuditLog({
    userId: user.id,
    eventId: evt.id,
    action: 'EVENT_UPDATED',
    resourceType: 'EVENT',
    resourceId: evt.id,
    metadata: { name: evt.name, status: evt.status }
  });

  realtimeManager.broadcast('event_status_changed', { eventId: evt.id, status: evt.status }, evt.id);

  return res.json({ event: evt });
});

// PATCH /api/v1/super-admin/events/:id/status
router.patch('/events/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const paramEventId = String(req.params.id || '');
  const evt = (db.get('events') as any[]).find((e: any) => e.id === paramEventId);
  if (!evt) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  const { status } = req.body;
  if (!['DRAFT', 'UPCOMING', 'LIVE', 'COMPLETED', 'CANCELLED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid event status.' });
  }

  const oldStatus = evt.status;
  evt.status = status;
  evt.updatedAt = new Date().toISOString();
  db.save();

  recordAuditLog({
    userId: user.id,
    eventId: evt.id,
    action: 'EVENT_STATUS_CHANGED',
    resourceType: 'EVENT',
    resourceId: evt.id,
    metadata: { oldStatus, newStatus: status }
  });

  realtimeManager.broadcast('event_status_changed', { eventId: evt.id, status }, evt.id);

  return res.json({ event: evt });
});

// GET /api/v1/super-admin/admins
router.get('/admins', (req: AuthenticatedRequest, res: Response) => {
  const users = (db.get('users') as any[]).filter((u: any) => u.role === 'EVENT_ADMIN');
  const assignments = (db.get('eventAdminAssignments') as any[]) || [];
  const events = (db.get('events') as any[]) || [];

  const adminsWithDetails = users.map((u: any) => {
    const userAssignments = assignments.filter((a: any) => a.userId === u.id);
    const assignedEvents = userAssignments.map((a: any) => {
      const evt = events.find((e: any) => e.id === a.eventId);
      return evt ? { id: evt.id, name: evt.name, status: evt.status } : null;
    }).filter(Boolean);

    const { passwordHash, ...safeUser } = u;
    return {
      ...safeUser,
      assignedEvents
    };
  });

  const limitCheck = checkAccountRoleLimits('EVENT_ADMIN');

  return res.json({
    admins: adminsWithDetails,
    count: limitCheck.currentCount,
    maxLimit: limitCheck.maxAllowed,
    canCreateMore: limitCheck.allowed
  });
});

// POST /api/v1/super-admin/admins
router.post('/admins', (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { fullName, email, phone, password, assignedEventIds } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'Full name, email, and password are required.' });
  }

  const limit = checkAccountRoleLimits('EVENT_ADMIN');
  if (!limit.allowed) {
    return res.status(400).json({
      error: `Maximum Event Admin account limit reached (${limit.maxAllowed} accounts max). You cannot create more.`
    });
  }

  const users = db.get('users') as any[];
  if (users.some((u: any) => u.email.toLowerCase() === email.trim().toLowerCase())) {
    return res.status(400).json({ error: 'A user with this email address already exists.' });
  }

  const now = new Date().toISOString();
  const newAdminId = `user_ea_${crypto.randomUUID().slice(0, 8)}`;
  const newAdmin: User = {
    id: newAdminId,
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    phone: phone ? phone.trim() : '',
    role: 'EVENT_ADMIN',
    isActive: true,
    passwordHash: hashPassword(password),
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null
  };

  users.push(newAdmin);

  const initialEventId = Array.isArray(assignedEventIds) && assignedEventIds.length > 0 ? String(assignedEventIds[0]) : '';

  if (Array.isArray(assignedEventIds)) {
    const assignments = db.get('eventAdminAssignments') as any[];
    for (const eid of assignedEventIds) {
      assignments.push({
        id: `assign_${crypto.randomUUID().slice(0, 8)}`,
        eventId: eid,
        userId: newAdminId,
        assignedBy: currentUser.id,
        createdAt: now
      });
    }
  }

  db.save();

  recordAuditLog({
    userId: currentUser.id,
    eventId: initialEventId || 'global',
    action: 'EVENT_ADMIN_CREATED',
    resourceType: 'USER',
    resourceId: newAdminId,
    metadata: { email: newAdmin.email, fullName: newAdmin.fullName }
  });

  const { passwordHash, ...safeUser } = newAdmin;
  return res.status(201).json({ admin: safeUser });
});

// GET /api/v1/super-admin/admins/:id
router.get('/admins/:id', (req: AuthenticatedRequest, res: Response) => {
  const paramAdminId = String(req.params.id || '');
  const admin = (db.get('users') as any[]).find((u: any) => u.id === paramAdminId && u.role === 'EVENT_ADMIN');
  if (!admin) {
    return res.status(404).json({ error: 'Event admin not found.' });
  }

  const assignments = (db.get('eventAdminAssignments') as any[]).filter((a: any) => a.userId === admin.id);
  const events = (db.get('events') as any[]) || [];
  const assignedEvents = assignments.map((a: any) => events.find((e: any) => e.id === a.eventId)).filter(Boolean);

  const { passwordHash, ...safeUser } = admin;
  return res.json({ admin: safeUser, assignedEvents });
});

// PUT /api/v1/super-admin/admins/:id
router.put('/admins/:id', (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const paramAdminId = String(req.params.id || '');
  const admin = (db.get('users') as any[]).find((u: any) => u.id === paramAdminId && u.role === 'EVENT_ADMIN');
  if (!admin) {
    return res.status(404).json({ error: 'Event admin not found.' });
  }

  const { fullName, phone, password } = req.body;
  if (fullName) admin.fullName = fullName.trim();
  if (phone !== undefined) admin.phone = phone.trim();
  if (password) admin.passwordHash = hashPassword(password);

  admin.updatedAt = new Date().toISOString();
  db.save();

  recordAuditLog({
    userId: currentUser.id,
    eventId: 'global',
    action: 'EVENT_ADMIN_UPDATED',
    resourceType: 'USER',
    resourceId: admin.id,
    metadata: { email: admin.email }
  });

  const { passwordHash, ...safeUser } = admin;
  return res.json({ admin: safeUser });
});

// PATCH /api/v1/super-admin/admins/:id/status
router.patch('/admins/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const paramAdminId = String(req.params.id || '');
  const admin = (db.get('users') as any[]).find((u: any) => u.id === paramAdminId && u.role === 'EVENT_ADMIN');
  if (!admin) {
    return res.status(404).json({ error: 'Event admin not found.' });
  }

  const { isActive } = req.body;
  admin.isActive = Boolean(isActive);
  admin.updatedAt = new Date().toISOString();
  db.save();

  recordAuditLog({
    userId: currentUser.id,
    eventId: 'global',
    action: admin.isActive ? 'EVENT_ADMIN_ENABLED' : 'EVENT_ADMIN_DISABLED',
    resourceType: 'USER',
    resourceId: admin.id,
    metadata: { email: admin.email, isActive: admin.isActive }
  });

  const { passwordHash, ...safeUser } = admin;
  return res.json({ admin: safeUser });
});

// POST /api/v1/super-admin/admins/:id/assign-event
router.post('/admins/:id/assign-event', (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const paramAdminId = String(req.params.id || '');
  const admin = (db.get('users') as any[]).find((u: any) => u.id === paramAdminId && u.role === 'EVENT_ADMIN');
  if (!admin) {
    return res.status(404).json({ error: 'Event admin not found.' });
  }

  const { eventId } = req.body;
  const event = (db.get('events') as any[]).find((e: any) => e.id === eventId);
  if (!event) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  const assignments = db.get('eventAdminAssignments') as any[];
  const existing = assignments.find((a: any) => a.userId === admin.id && a.eventId === eventId);
  if (existing) {
    return res.status(400).json({ error: 'Admin is already assigned to this event.' });
  }

  const newAssignment: EventAdminAssignment = {
    id: `assign_${crypto.randomUUID().slice(0, 8)}`,
    eventId,
    userId: admin.id,
    assignedBy: currentUser.id,
    createdAt: new Date().toISOString()
  };

  assignments.push(newAssignment);
  db.save();

  recordAuditLog({
    userId: currentUser.id,
    eventId: String(eventId),
    action: 'ADMIN_ASSIGNED_TO_EVENT',
    resourceType: 'EVENT_ADMIN_ASSIGNMENT',
    resourceId: newAssignment.id,
    metadata: { adminEmail: admin.email, eventName: event.name }
  });

  return res.status(201).json({ assignment: newAssignment });
});

// DELETE /api/v1/super-admin/admins/:id/events/:eventId
router.delete('/admins/:id/events/:eventId', (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const adminId = String(req.params.id || '');
  const eventId = String(req.params.eventId || '');

  const assignments = db.get('eventAdminAssignments') as any[];
  const index = assignments.findIndex((a: any) => a.userId === adminId && a.eventId === eventId);
  if (index === -1) {
    return res.status(404).json({ error: 'Assignment not found.' });
  }

  const removed = assignments.splice(index, 1)[0];
  db.save();

  recordAuditLog({
    userId: currentUser.id,
    eventId: eventId,
    action: 'ADMIN_REMOVED_FROM_EVENT',
    resourceType: 'EVENT_ADMIN_ASSIGNMENT',
    resourceId: removed.id,
    metadata: { adminId, eventId }
  });

  return res.json({ success: true, message: 'Event assignment removed.' });
});

// Super Admin account management
router.get('/super-admins', (req: AuthenticatedRequest, res: Response) => {
  const users = (db.get('users') as any[]).filter((u: any) => u.role === 'SUPER_ADMIN');
  const safeUsers = users.map((u: any) => {
    const { passwordHash, ...safe } = u;
    return safe;
  });

  const limitCheck = checkAccountRoleLimits('SUPER_ADMIN');
  return res.json({
    superAdmins: safeUsers,
    count: limitCheck.currentCount,
    maxLimit: limitCheck.maxAllowed,
    canCreateMore: limitCheck.allowed
  });
});

router.post('/super-admins', (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { fullName, email, phone, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: 'Full name, email, and password are required.' });
  }

  const limit = checkAccountRoleLimits('SUPER_ADMIN');
  if (!limit.allowed) {
    return res.status(400).json({
      error: `Maximum Super Admin account limit reached (${limit.maxAllowed} accounts max). You cannot create more.`
    });
  }

  const users = db.get('users') as any[];
  if (users.some((u: any) => u.email.toLowerCase() === email.trim().toLowerCase())) {
    return res.status(400).json({ error: 'User with this email already exists.' });
  }

  const now = new Date().toISOString();
  const newSuperAdmin: User = {
    id: `user_sa_${crypto.randomUUID().slice(0, 8)}`,
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    phone: phone ? phone.trim() : '',
    role: 'SUPER_ADMIN',
    isActive: true,
    passwordHash: hashPassword(password),
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null
  };

  users.push(newSuperAdmin);
  db.save();

  recordAuditLog({
    userId: currentUser.id,
    eventId: 'global',
    action: 'SUPER_ADMIN_CREATED',
    resourceType: 'USER',
    resourceId: newSuperAdmin.id,
    metadata: { email: newSuperAdmin.email }
  });

  const { passwordHash, ...safeUser } = newSuperAdmin;
  return res.status(201).json({ superAdmin: safeUser });
});

// GET /api/v1/super-admin/audit-logs
router.get('/audit-logs', (req: AuthenticatedRequest, res: Response) => {
  const eventIdParam = typeof req.query.eventId === 'string' ? req.query.eventId : undefined;
  const actionParam = typeof req.query.action === 'string' ? req.query.action : undefined;
  const limit = Number(req.query.limit) || 100;

  let logs = (db.get('auditLogs') as any[]) || [];

  if (eventIdParam) {
    logs = logs.filter((l: any) => l.eventId === eventIdParam);
  }
  if (actionParam) {
    logs = logs.filter((l: any) => l.action.toLowerCase().includes(actionParam.toLowerCase()));
  }

  const users = (db.get('users') as any[]) || [];
  const enriched = logs.slice(0, limit).map((log: any) => {
    const user = users.find((u: any) => u.id === log.userId);
    return {
      ...log,
      userName: user ? user.fullName : 'System / External',
      userEmail: user ? user.email : ''
    };
  });

  return res.json({ auditLogs: enriched });
});

// GET /api/v1/super-admin/system-status
router.get('/system-status', (req: AuthenticatedRequest, res: Response) => {
  const cameras = (db.get('cameras') as any[]) || [];
  const onlineCameras = cameras.filter((c: any) => c.status === 'ONLINE').length;
  const realtimeClients = realtimeManager.getConnectedCount();

  return res.json({
    system: {
      status: 'HEALTHY',
      version: '1.0.0-production',
      serverTime: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      memoryUsage: process.memoryUsage(),
      realtimeActiveConnections: realtimeClients,
      cvIntegrationReady: true,
      telemetryAggregationIntervalSeconds: 30
    },
    cameras: {
      total: cameras.length,
      online: onlineCameras,
      offline: cameras.length - onlineCameras
    }
  });
});

export default router;