import { apiClient } from '../api/client';
import { User } from '../types';

export const authService = {
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const res = await apiClient<{ token: string; user: User }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('eventflow_auth_token', res.token);
    localStorage.setItem('eventflow_user', JSON.stringify(res.user));
    return res;
  },

  getCurrentUser: async (): Promise<User> => {
    const res = await apiClient<{ user: User }>('/api/v1/auth/me');
    localStorage.setItem('eventflow_user', JSON.stringify(res.user));
    return res.user;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient('/api/v1/auth/logout', { method: 'POST' });
    } catch (_) {}
    localStorage.removeItem('eventflow_auth_token');
    localStorage.removeItem('eventflow_user');
  },

  getStoredUser: (): User | null => {
    try {
      const raw = localStorage.getItem('eventflow_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  getToken: (): string | null => {
    return localStorage.getItem('eventflow_auth_token');
  }
};
