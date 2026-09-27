import { apiClient } from '../client';

export interface SuperAdminUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface SuperAdminsResponse {
  superAdmins: SuperAdminUser[];
  count: number;
  maxLimit: number;
  canCreateMore: boolean;
}

export const adminService = {
  // Fetch list of all Super Administrators
  async getSuperAdmins(): Promise<SuperAdminsResponse> {
    return apiClient<SuperAdminsResponse>('/api/v1/super-admin/super-admins');
  },

  // Create a new Super Administrator (Max 5 limit enforced by backend)
  async createSuperAdmin(payload: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
  }) {
    return apiClient('/api/v1/super-admin/super-admins', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Toggle SuperAdmin active/inactive status
  async toggleSuperAdminStatus(adminId: string, isActive: boolean) {
    return apiClient(`/api/v1/super-admin/super-admins/${adminId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
  },

  // Fetch Event Status & AutoOps Autopilot State
  async getEventAutonomousState(eventId: string) {
    return apiClient(`/api/v1/admin/events/${eventId}`);
  },

  // Toggle Autonomous Execution Mode
  async toggleAutonomousMode(eventId: string, autonomousMode: boolean) {
    return apiClient(`/api/v1/admin/events/${eventId}/auto-execute`, {
      method: 'PATCH',
      body: JSON.stringify({ autonomousMode }),
    });
  },

  // Get Active Recommendations & Rerouting Protocols
  async getRecommendations(eventId: string) {
    return apiClient(`/api/v1/admin/events/${eventId}/recommendations`);
  }
};