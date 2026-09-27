import { useState, useEffect } from 'react';

export function usePathname(): string {
  const getHashPath = () => {
    const hash = window.location.hash.replace(/^#/, '');
    return hash || '/user/home';
  };

  const [path, setPath] = useState<string>(getHashPath());

  useEffect(() => {
    const handleHash = () => setPath(getHashPath());
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  return path;
}

export function useSearchParams(): URLSearchParams {
  const query = window.location.search || '';
  return new URLSearchParams(query);
}

export function redirect(url: string): void {
  window.location.hash = url;
}
