import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { realtimeManager } from '../realtime';
import { verifyToken } from '../auth';

const router = Router();

// GET /api/v1/realtime/stream
router.get('/stream', (req: Request, res: Response) => {
  const token = (req.query.token as string) || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
  const eventId = req.query.eventId as string;

  let role = 'ATTENDEE';
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      role = payload.role;
    }
  }

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const clientId = `client_${crypto.randomUUID().slice(0, 8)}`;
  realtimeManager.addClient(clientId, res, role, eventId);

  // Heartbeat ping every 25 seconds
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
});

export default router;
