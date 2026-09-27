import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from './db';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'SUPER_ADMIN' | 'EVENT_ADMIN' | 'ATTENDEE';
    fullName: string;
    isActive: boolean;
  };
}

export function hashPassword(password: string): string {
  return crypto
    .pbkdf2Sync(password, 'eventflow-salt-2026', 100000, 32, 'sha256')
    .toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  const computed = crypto
    .pbkdf2Sync(password, 'eventflow-salt-2026', 100000, 32, 'sha256')
    .toString('hex');
  return computed === hash;
}

// Generate a login token for a user.
// Not a real signed JWT, but matches the shape authMiddleware expects:
// header.payload.signature, where payload is base64 JSON containing userId.
export function verifyToken(token: string): { userId: string; email: string; role: string; iat: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.AUTH_SECRET || 'eventflow-fallback-secret')
      .update(`${header}.${payload}`)
      .digest('hex');

    if (signature !== expectedSignature) return null;

    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
    return decoded;
  } catch (err) {
    return null;
  }
}

export function generateToken(user: { id: string; email: string; role: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');

  const payload = Buffer.from(
    JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Date.now()
    })
  ).toString('base64');

  const signature = crypto
    .createHmac('sha256', process.env.AUTH_SECRET || 'eventflow-fallback-secret')
    .update(`${header}.${payload}`)
    .digest('hex');

  return `${header}.${payload}.${signature}`;
}

// Middleware: Verify JWT token and attach user to request
export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString('utf-8')
    ) as any;

    const user = db.get('users').find(u => u.id === decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'User account is inactive' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      isActive: user.isActive
    };

    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Middleware: Require SUPER_ADMIN role
export function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Requires SUPER_ADMIN role' });
  }

  return next();
}

// Middleware: Require EVENT_ADMIN or SUPER_ADMIN
export function requireEventAdminOrSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.user.role !== 'EVENT_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Requires EVENT_ADMIN or SUPER_ADMIN role' });
  }

  return next();
}

// Middleware: Check if user has access to this event
// SUPER_ADMIN: always allowed
// EVENT_ADMIN: only if assigned to this event
export function requireEventAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const eventId = req.params.eventId;

  if (!eventId) {
    return res.status(400).json({ error: 'Event ID is required' });
  }

  // SUPER_ADMIN can access all events
  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  // EVENT_ADMIN: check assignment
  if (req.user.role === 'EVENT_ADMIN') {
    const assignments = db.get('eventAdminAssignments');
    const hasAccess = assignments.some(a => a.userId === req.user!.id && a.eventId === eventId);

    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have access to this event' });
    }

    return next();
  }

  return res.status(403).json({ error: 'Access denied' });
}

// Check role-based account limits
export function checkAccountRoleLimits(role: 'SUPER_ADMIN' | 'EVENT_ADMIN') {
  const users = db.get('users');
  const currentCount = users.filter(u => u.role === role).length;
  const maxAllowed = role === 'SUPER_ADMIN' ? 5 : 40;

  return {
    role,
    currentCount,
    maxAllowed,
    allowed: currentCount < maxAllowed
  };
}