'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * loading → first request still in flight (show a skeleton, not demo numbers)
 * live    → data came from the backend
 * demo    → backend unreachable or returned junk; showing fallback data
 */
export type DataStatus = 'loading' | 'live' | 'demo';

interface CacheEntry<T> {
  data: T;
  status: 'live' | 'demo';
  updatedAt: number;
}

// Module-level so every component using the same key shares one request and
// tab switches render instantly from the last known data.
const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<CacheEntry<unknown>>>();

export interface ApiResourceOptions<T> {
  /** Deterministic snapshot used for the first render and as the offline default. */
  fallback: T;
  /** Optional generator for offline data that changes over time (looks live in demos). */
  demo?: () => T;
  /** Poll interval in ms. Polling pauses while the tab is hidden. */
  intervalMs?: number;
  enabled?: boolean;
}

export interface ApiResource<T> {
  data: T;
  status: DataStatus;
  /** Epoch ms of the last completed request, or null before the first one. */
  lastUpdated: number | null;
  refresh: () => Promise<void>;
}

function requestShared<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: ApiResourceOptions<T>,
): Promise<CacheEntry<T>> {
  const pending = inflight.get(key) as Promise<CacheEntry<T>> | undefined;
  if (pending) return pending;

  const promise = (async (): Promise<CacheEntry<T>> => {
    try {
      const entry: CacheEntry<T> = { data: await fetcher(), status: 'live', updatedAt: Date.now() };
      cache.set(key, entry);
      return entry;
    } catch {
      // A blip after a successful load keeps the last live data on screen.
      const previous = cache.get(key) as CacheEntry<T> | undefined;
      if (previous?.status === 'live') return previous;

      const entry: CacheEntry<T> = {
        data: options.demo ? options.demo() : options.fallback,
        status: 'demo',
        updatedAt: Date.now(),
      };
      cache.set(key, entry);
      return entry;
    }
  })().finally(() => {
    inflight.delete(key);
  });

  inflight.set(key, promise);
  return promise;
}

export function useApiResource<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: ApiResourceOptions<T>,
): ApiResource<T> {
  const { intervalMs, enabled = true } = options;

  const [state, setState] = useState<{ data: T; status: DataStatus; updatedAt: number | null }>(() => {
    const hit = cache.get(key) as CacheEntry<T> | undefined;
    return hit
      ? { data: hit.data, status: hit.status, updatedAt: hit.updatedAt }
      : { data: options.fallback, status: 'loading', updatedAt: null };
  });

  // Keep the latest callbacks in refs so callers can pass inline functions
  // without restarting the polling effect on every render.
  const fetcherRef = useRef(fetcher);
  const optionsRef = useRef(options);
  const mountedRef = useRef(true);

  useEffect(() => {
    fetcherRef.current = fetcher;
    optionsRef.current = options;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const entry = await requestShared<T>(key, () => fetcherRef.current(), optionsRef.current);
    if (mountedRef.current) {
      setState({ data: entry.data, status: entry.status, updatedAt: entry.updatedAt });
    }
  }, [key]);

  useEffect(() => {
    if (!enabled) return undefined;

    void refresh();
    if (!intervalMs) return undefined;

    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, intervalMs);
    const onVisibilityChange = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, intervalMs, refresh]);

  return { data: state.data, status: state.status, lastUpdated: state.updatedAt, refresh };
}
