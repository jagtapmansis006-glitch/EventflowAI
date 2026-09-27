import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './server/routes/authRoutes';
import superAdminRoutes from './server/routes/superAdminRoutes';
import adminRoutes from './server/routes/adminRoutes';
import publicRoutes from './server/routes/publicRoutes';
import internalRoutes from './server/routes/internalRoutes';
import realtimeRoutes from './server/routes/realtimeRoutes';
import { db } from './server/db';
import { realtimeManager } from './server/realtime';
import { runPredictionForZone } from './server/predictionEngine';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3001;

  // CORS configuration allowing all development origins and required headers
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-cv-key']
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Static files for uploaded venue maps and media
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      application: 'EventFlow AI',
      timestamp: new Date().toISOString()
    });
  });

  // REST API Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/super-admin', superAdminRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/public', publicRoutes);
  app.use('/api/v1/internal', internalRoutes);
  app.use('/api/v1/realtime', realtimeRoutes);
  app.use('/api/v1/telemetry/ingest', (req, res, next) => {
    req.url = '/telemetry';
    internalRoutes(req, res, next);
  });
  app.use('/api/v1/telemetry', internalRoutes);

  // Attendee Portal Route Aliases
  app.get('/api/telemetry/zones', (req, res, next) => {
    req.url = '/events/default/telemetry';
    publicRoutes(req, res, next);
  });
  app.get('/api/attendee/ticket', (req, res, next) => {
    req.url = '/events/default/ticket';
    publicRoutes(req, res, next);
  });
  app.get('/api/recommendations', (req, res, next) => {
    req.url = '/events/default/recommendations';
    publicRoutes(req, res, next);
  });
  app.get('/api/alerts', (req, res, next) => {
    req.url = '/events/default/alerts';
    publicRoutes(req, res, next);
  });
  app.get('/api/venue/map', (req, res, next) => {
    req.url = '/events/default/map';
    publicRoutes(req, res, next);
  });
  app.get('/api/navigation/route', (req, res, next) => {
    req.url = '/events/default/navigation';
    publicRoutes(req, res, next);
  });
  app.get('/api/gates', (req, res, next) => {
    req.url = '/events/default/gates';
    publicRoutes(req, res, next);
  });
  app.post('/api/assistant/chat', (req, res, next) => {
    req.url = '/assistant/chat';
    publicRoutes(req, res, next);
  });

  // Background 30-second Telemetry & Inflow/Outflow Engine for LIVE events
  setInterval(() => {
    try {
      const liveEvents = db.get('events').filter(e => e.status === 'LIVE');
      for (const event of liveEvents) {
        const zones = db.get('crowdZones').filter(z => z.eventId === event.id && z.isActive);
        const cameras = db.get('cameras').filter(c => c.eventId === event.id && c.isActive);

        for (const zone of zones) {
          const zoneCam = cameras.find(c => c.zoneId === zone.id) || cameras[0];
          if (!zoneCam) continue;

          // Compute realistic 30-second step flow
          const telemetryList = db.get('crowdTelemetry').filter(t => t.eventId === event.id && t.zoneId === zone.id);
          const lastTelem = telemetryList[telemetryList.length - 1];

          const currentCount = lastTelem ? lastTelem.peopleCount : Math.round(zone.capacity * 0.45);
          const baseRate = Math.floor(Math.random() * 15) + 30; // 30 - 45 people / 30s
          const inflow = baseRate + Math.floor(Math.random() * 8);
          const outflow = Math.max(10, Math.floor(baseRate * 0.7) + Math.floor(Math.random() * 6));
          const netFlow = inflow - outflow;

          const newPeopleCount = Math.max(100, Math.min(zone.capacity * 1.05, currentCount + netFlow));
          const occPercent = Math.min(100, Math.round((newPeopleCount / zone.capacity) * 100));

          let densityLevel: 'LOW' | 'MODERATE' | 'BUSY' | 'CRITICAL' = 'LOW';
          if (newPeopleCount >= zone.criticalThreshold || occPercent >= 90) {
            densityLevel = 'CRITICAL';
          } else if (newPeopleCount >= zone.warningThreshold || occPercent >= 75) {
            densityLevel = 'BUSY';
          } else if (occPercent >= 45) {
            densityLevel = 'MODERATE';
          }

          const windowTimestamp = new Date().toISOString();
          const telemItem = {
            id: `telem_${Date.now()}_${zone.id.slice(-4)}`,
            eventId: event.id,
            cameraId: zoneCam.id,
            zoneId: zone.id,
            timestamp: windowTimestamp,
            peopleCount: Math.round(newPeopleCount),
            avgSpeedMps: Number((0.8 + Math.random() * 0.6).toFixed(2)),
            inflow,
            outflow,
            netFlow,
            occupancyPercent: occPercent,
            densityLevel,
            queueLength: Math.max(10, Math.round((occPercent / 100) * 150) + Math.floor(Math.random() * 10)),
            averageDwellTime: 220 + Math.floor(Math.random() * 30),
            createdAt: windowTimestamp
          };

          db.get('crowdTelemetry').push(telemItem);
          if (db.get('crowdTelemetry').length > 500) {
            db.get('crowdTelemetry').shift();
          }

          // Update camera
          zoneCam.lastSeenAt = windowTimestamp;
          zoneCam.status = 'ONLINE';

          realtimeManager.broadcast('crowd_status_updated', {
            eventId: event.id,
            telemetry: telemItem,
            zoneName: zone.name,
            cameraName: zoneCam.name
          });

          // Periodically update predictions
          if (Math.random() < 0.3) {
            runPredictionForZone(event.id, zone.id);
          }
        }
      }
      db.save();
    } catch (err) {
      console.error('Error in background telemetry aggregation loop:', err);
    }
  }, 30000);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, watch: { ignored: ['**/uploads/**', '**/data/**', '**/*.png', '**/*.mp4'] } },
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
    console.log(`🚀 EventFlow AI Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal error starting EventFlow AI server:', err);
});