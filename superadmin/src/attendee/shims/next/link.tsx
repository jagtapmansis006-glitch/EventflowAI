import React from 'react';

export default function Link({ href, children, className, onClick, ...props }: any) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (onClick) onClick(e);
    window.location.hash = href;
    window.dispatchEvent(new Event('hashchange'));
  };

  return (
    <a href={`#${href}`} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
}
