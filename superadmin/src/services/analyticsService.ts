import { apiClient } from '../api/client';
import { SuperAdminDashboardMetrics, EventSummary } from '../types';

export const analyticsService = {
  getSuperAdminDashboard: async (): Promise<{
    metrics: SuperAdminDashboardMetrics;
    eventSummaries: EventSummary[];
  }> => {
    return apiClient('/api/v1/super-admin/dashboard');
  },

  getEventAnalytics: async (eventId: string): Promise<any> => {
    return apiClient(`/api/v1/admin/events/${eventId}/analytics`);
  },

  getSystemStatus: async (): Promise<any> => {
    return apiClient('/api/v1/super-admin/system-status');
  }
};
