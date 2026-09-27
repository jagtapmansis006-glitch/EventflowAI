export const API_BASE = 'http://localhost:3001';
export const TOKEN_KEY = 'eventflow_auth_token';
export const USER_KEY = 'eventflow_user';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  return res;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.reload();
}