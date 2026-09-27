import { useEffect, useState } from 'react';

/** Tracks window.location.pathname, updating on back/forward navigation. */
export function usePathname(): string {
  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return pathname;
}

/** Tracks window.location.search as a URLSearchParams, updating on back/forward navigation. */
export function useSearchParams(): URLSearchParams {
  const [search, setSearch] = useState(() => window.location.search);

  useEffect(() => {
    const onPopState = () => setSearch(window.location.search);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return new URLSearchParams(search);
}

/** Pushes a new URL (path and/or query string) and notifies usePathname()/useSearchParams() listeners. */
export function navigate(href: string) {
  window.history.pushState({}, '', href);
  window.dispatchEvent(new PopStateEvent('popstate'));
}