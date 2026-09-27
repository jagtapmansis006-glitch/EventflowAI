import { Router, Response } from 'express';
import { db, verifyPassword } from '../db';
import { generateToken, authMiddleware, AuthenticatedRequest } from '../auth';
import { recordAuditLog } from '../audit';

const router = Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const users = db.get('users');
  const user = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Invalid credentials or inactive account.' });
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  // Update last login
  user.lastLoginAt = new Date().toISOString();
  db.save();

  recordAuditLog({
    userId: user.id,
    action: 'USER_LOGIN',
    resourceType: 'USER',
    resourceId: user.id,
    metadata: { email: user.email, role: user.role }
  });

  const token = generateToken(user);
  const { passwordHash, ...safeUser } = user;

  // If Event Admin, fetch assigned event IDs
  const assignments = db.get('eventAdminAssignments').filter(a => a.userId === user.id);
  const assignedEventIds = assignments.map(a => a.eventId);

  return res.json({
    token,
    user: {
      ...safeUser,
      assignedEventIds
    }
  });
});

router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { passwordHash, ...safeUser } = (user as any);

  const assignments = db.get('eventAdminAssignments').filter(a => a.userId === user.id);
  const assignedEventIds = assignments.map(a => a.eventId);

  return res.json({
    user: {
      ...safeUser,
      assignedEventIds
    }
  });
});

router.post('/logout', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  recordAuditLog({
    userId: user.id,
    action: 'USER_LOGOUT',
    resourceType: 'USER',
    resourceId: user.id
  });
  return res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;
