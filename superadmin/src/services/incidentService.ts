import { apiClient } from '../api/client';
import { Incident, IncidentStatus } from '../types';

export const incidentService = {
  getEventIncidents: async (eventId: string): Promise<Incident[]> => {
    const res = await apiClient<{ incidents: Incident[] }>(`/api/v1/admin/events/${eventId}/incidents`);
    return res.incidents;
  },

  createIncident: async (eventId: string, data: Partial<Incident>): Promise<Incident> => {
    const res = await apiClient<{ incident: Incident }>(`/api/v1/admin/events/${eventId}/incidents`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.incident;
  },

  updateIncidentStatus: async (eventId: string, incidentId: string, status: IncidentStatus): Promise<Incident> => {
    const res = await apiClient<{ incident: Incident }>(`/api/v1/admin/events/${eventId}/incidents/${incidentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    return res.incident;
  }
};
