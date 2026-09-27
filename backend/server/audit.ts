import crypto from 'crypto';
import { db, AuditLog } from './db';

export function recordAuditLog(params: {
  userId: string;
  eventId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, any>;
}) {
  const auditLogs = db.get('auditLogs');
  const newLog: AuditLog = {
    id: `audit_${crypto.randomUUID()}`,
    userId: params.userId,
    eventId: params.eventId || null,
    action: params.action,
    resourceType: params.resourceType,
    resourceId: params.resourceId,
    metadata: params.metadata || {},
    createdAt: new Date().toISOString()
  };

  // Keep last 1000 audit logs to prevent unbounded memory growth
  auditLogs.unshift(newLog);
  if (auditLogs.length > 1000) {
    auditLogs.pop();
  }
  db.save();
  return newLog;
}
