import { apiClient } from '../api/client';
import { User } from '../types';

export interface AdminsResponse {
  admins: (User & { assignedEvents: { id: string; name: string; status: string }[] })[];
  count: number;
  maxLimit: number;
  canCreateMore: boolean;
}

export interface SuperAdminsResponse {
  superAdmins: User[];
  count: number;
  maxLimit: number;
  canCreateMore: boolean;
}

export const adminService = {
  getEventAdmins: async (): Promise<AdminsResponse> => {
    return apiClient<AdminsResponse>('/api/v1/super-admin/admins');
  },

  createEventAdmin: async (data: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    assignedEventIds?: string[];
  }): Promise<User> => {
    const res = await apiClient<{ admin: User }>('/api/v1/super-admin/admins', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.admin;
  },

  updateEventAdmin: async (id: string, data: Partial<User & { password?: string }>): Promise<User> => {
    const res = await apiClient<{ admin: User }>(`/api/v1/super-admin/admins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.admin;
  },

  toggleEventAdminStatus: async (id: string, isActive: boolean): Promise<User> => {
    const res = await apiClient<{ admin: User }>(`/api/v1/super-admin/admins/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive })
    });
    return res.admin;
  },

  assignEventToAdmin: async (adminId: string, eventId: string): Promise<any> => {
    return apiClient(`/api/v1/super-admin/admins/${adminId}/assign-event`, {
      method: 'POST',
      body: JSON.stringify({ eventId })
    });
  },

  removeEventFromAdmin: async (adminId: string, eventId: string): Promise<any> => {
    return apiClient(`/api/v1/super-admin/admins/${adminId}/events/${eventId}`, {
      method: 'DELETE'
    });
  },

  getSuperAdmins: async (): Promise<SuperAdminsResponse> => {
    return apiClient<SuperAdminsResponse>('/api/v1/super-admin/super-admins');
  },

  createSuperAdmin: async (data: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
  }): Promise<User> => {
    const res = await apiClient<{ superAdmin: User }>('/api/v1/super-admin/super-admins', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.superAdmin;
  }
};
