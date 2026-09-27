// Fallback array ensures it never defaults to an empty string or wrong origin
const BASE_FALLBACKS = [
  '',
  import.meta.env.VITE_API_BASE_URL,
  'http://localhost:3001/api/v1',
  'http://127.0.0.1:3001/api/v1',
  'http://localhost:3001',
  'http://127.0.0.1:3001'
].filter(val => typeof val === 'string') as string[];

export interface ApiError {
  message: string;
  status: number;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('eventflow_auth_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let lastError: any = null;

  // Try each base URL sequentially until one succeeds
  for (const baseUrl of BASE_FALLBACKS) {
    const cleanBase = baseUrl.replace(/\/$/, '');
    
    // Prevent double /api/v1 prefixes if endpoint already includes it
    const targetUrl = (cleanBase.endsWith('/api/v1') && cleanEndpoint.startsWith('/api/v1'))
      ? `${cleanBase.replace('/api/v1', '')}${cleanEndpoint}`
      : `${cleanBase}${cleanEndpoint}`;

    try {
      const response = await fetch(targetUrl, {
        ...options,
        headers
      });

      if (response.status === 401) {
        if (!endpoint.includes('/auth/login')) {
          localStorage.removeItem('eventflow_auth_token');
          localStorage.removeItem('eventflow_user');
          window.dispatchEvent(new CustomEvent('eventflow_auth_unauthorized'));
        }
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = data?.error || data?.message || `Request failed with status ${response.status}`;
        const error: ApiError = { message: errorMsg, status: response.status };
        throw error;
      }

      return data as T;
    } catch (err: any) {
      // If it's an HTTP error returned from server (like 400, 401, 404), throw immediately
      if (err?.status && err.status > 0) {
        throw err;
      }
      // Otherwise record network error and try next URL fallback
      lastError = err;
    }
  }

  // If all fallback endpoints failed to connect
  throw {
    message: lastError?.message || 'Cannot reach backend server. Please verify backend is running on http://localhost:3001.',
    status: 0
  } as ApiError;
}

apiClient.get = <T>(endpoint: string, options?: RequestInit): Promise<T> =>
  apiClient<T>(endpoint, { ...options, method: 'GET' });

apiClient.post = <T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> =>
  apiClient<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

apiClient.put = <T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> =>
  apiClient<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

apiClient.patch = <T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> =>
  apiClient<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

apiClient.delete = <T>(endpoint: string, options?: RequestInit): Promise<T> =>
  apiClient<T>(endpoint, { ...options, method: 'DELETE' });