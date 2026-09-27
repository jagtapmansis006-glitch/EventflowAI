import React, { useState, useEffect } from 'react';

/** Tracks current path (supports both hash routing and HTML5 pathname seamlessly in Vite) */
export function usePathname(): string {
  const getPath = () => {
    const hash = window.location.hash.replace(/^#/, '');
    if (hash && hash.startsWith('/')) {
      const qIdx = hash.indexOf('?');
      return qIdx !== -1 ? hash.substring(0, qIdx) : hash;
    }
    const path = window.location.pathname;
    if (path && path !== '/') return path;
    return '/user/home';
  };

  const [pathname, setPathname] = useState<string>(getPath());

  useEffect(() => {
    const updatePath = () => setPathname(getPath());
    window.addEventListener('popstate', updatePath);
    window.addEventListener('hashchange', updatePath);
    return () => {
      window.removeEventListener('popstate', updatePath);
      window.removeEventListener('hashchange', updatePath);
    };
  }, []);

  return pathname;
}

/** Tracks search parameters */
export function useSearchParams(): URLSearchParams {
  const getParams = () => {
    const hash = window.location.hash;
    const queryIdx = hash.indexOf('?');
    if (queryIdx !== -1) {
      return new URLSearchParams(hash.substring(queryIdx));
    }
    return new URLSearchParams(window.location.search);
  };

  const [params, setParams] = useState<URLSearchParams>(getParams());

  useEffect(() => {
    const updateParams = () => setParams(getParams());
    window.addEventListener('popstate', updateParams);
    window.addEventListener('hashchange', updateParams);
    return () => {
      window.removeEventListener('popstate', updateParams);
      window.removeEventListener('hashchange', updateParams);
    };
  }, []);

  return params;
}

/** Standard Vite/React route navigation */
export function navigate(href: string) {
  if (href.startsWith('/')) {
    window.location.hash = href;
    window.dispatchEvent(new Event('hashchange'));
    window.dispatchEvent(new PopStateEvent('popstate'));
  } else {
    window.location.href = href;
  }
}

export function redirect(url: string) {
  navigate(url);
}

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

export function Link({ href, children, onClick, className, ...props }: LinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
    if (!href.startsWith('http') && !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      navigate(href);
    }
  };

  return (
    <a href={href.startsWith('/') ? `#${href}` : href} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
}

export default Link;
