/**
 * Minimal fetch client shared by every attendee endpoint.
 *
 * Point it at a backend with env vars (see `.env.example`):
 *   NEXT_PUBLIC_API_BASE_URL   "" (default) → same-origin Next.js route handlers
 *                              "http://localhost:8000" → a FastAPI server
 *   NEXT_PUBLIC_API_TIMEOUT_MS request timeout, default 4000
 *   NEXT_PUBLIC_FORCE_MOCK     "true" → skip the network entirely (offline demos)
 */

const getEnvVar = (key: string, defaultValue = ''): string => {
  try {
    const metaEnv = (import.meta as any)?.env;
    if (metaEnv && metaEnv[key] !== undefined) {
      return metaEnv[key] as string;
    }
  } catch {}
  return defaultValue;
};

export const API_BASE_URL = (getEnvVar('NEXT_PUBLIC_API_BASE_URL', '')).replace(/\/$/, '');
export const FORCE_MOCK = getEnvVar('NEXT_PUBLIC_FORCE_MOCK', 'false') === 'true';

const parsedTimeout = Number(getEnvVar('NEXT_PUBLIC_API_TIMEOUT_MS', '4000'));
export const DEFAULT_TIMEOUT_MS = Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 4000;

export class ApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type QueryValue = string | number | boolean | undefined;

export interface ApiFetchOptions extends Omit<RequestInit, 'body' | 'headers'> {
  /** Serialised as JSON. */
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, QueryValue>;
  timeoutMs?: number;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const base = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return base;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

/**
 * Fetches JSON. Every failure mode (offline, timeout, non-2xx, non-JSON body)
 * surfaces as an `ApiError`, which the data hooks treat as "use demo data".
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  if (FORCE_MOCK) throw new ApiError('Mock mode is enabled');

  const { body, headers, query, timeoutMs = DEFAULT_TIMEOUT_MS, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('eventflow_auth_token') || localStorage.getItem('eventflow_token'))
      : null;

    const response = await fetch(buildUrl(path, query), {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new ApiError(`Request failed with status ${response.status}`, response.status);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Request timed out');
    }
    throw new ApiError(error instanceof Error ? error.message : 'Network error');
  } finally {
    clearTimeout(timer);
  }
}
