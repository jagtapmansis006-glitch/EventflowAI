import { apiClient } from '../api/client';
import { Event, EventDashboardData, EventStatus } from '../types';

export const eventService = {
  getAllEvents: async (): Promise<Event[]> => {
    const res = await apiClient<{ events: Event[] }>('/api/v1/super-admin/events');
    return res.events;
  },

  getEventById: async (id: string): Promise<{ event: Event; assignedAdmins: any[] }> => {
    return apiClient<{ event: Event; assignedAdmins: any[] }>(`/api/v1/super-admin/events/${id}`);
  },

  createEvent: async (data: Partial<Event>): Promise<Event> => {
    const res = await apiClient<{ event: Event }>('/api/v1/super-admin/events', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.event;
  },

  updateEvent: async (id: string, data: Partial<Event>): Promise<Event> => {
    const res = await apiClient<{ event: Event }>(`/api/v1/super-admin/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.event;
  },

  updateEventStatus: async (id: string, status: EventStatus): Promise<Event> => {
    const res = await apiClient<{ event: Event }>(`/api/v1/super-admin/events/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    return res.event;
  },

  getEventDashboard: async (eventId: string): Promise<EventDashboardData> => {
    return apiClient<EventDashboardData>(`/api/v1/admin/events/${eventId}/dashboard`);
  }
};
