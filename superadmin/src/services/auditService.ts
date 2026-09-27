import { apiClient } from '../api/client';
import { AuditLog } from '../types';

export const auditService = {
  getAuditLogs: async (params: { eventId?: string; action?: string; limit?: number } = {}): Promise<AuditLog[]> => {
    const q = new URLSearchParams();
    if (params.eventId) q.append('eventId', params.eventId);
    if (params.action) q.append('action', params.action);
    if (params.limit) q.append('limit', String(params.limit));

    const res = await apiClient<{ auditLogs: AuditLog[] }>(`/api/v1/super-admin/audit-logs?${q.toString()}`);
    return res.auditLogs;
  }
};
