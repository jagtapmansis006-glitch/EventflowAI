import { apiClient } from '../api/client';
import { Alert, AlertStatus } from '../types';

export const alertService = {
  getEventAlerts: async (eventId: string): Promise<Alert[]> => {
    const res = await apiClient<{ alerts: Alert[] }>(`/api/v1/admin/events/${eventId}/alerts`);
    return res.alerts;
  },

  createAlert: async (eventId: string, data: Partial<Alert>): Promise<Alert> => {
    const res = await apiClient<{ alert: Alert }>(`/api/v1/admin/events/${eventId}/alerts`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.alert;
  },

  updateAlertStatus: async (eventId: string, alertId: string, status: AlertStatus): Promise<Alert> => {
    const res = await apiClient<{ alert: Alert }>(`/api/v1/admin/events/${eventId}/alerts/${alertId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    return res.alert;
  }
};
