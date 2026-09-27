import type { ReactNode } from 'react';
import type { Trend } from '@/lib/types';

interface IconProps {
  className?: string;
}

function Svg({ children, className = 'h-6 w-6' }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-6h4v6" />
    </Svg>
  );
}

export function MapIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7 9 4Z" />
      <path d="M9 4v13M15 7v13" />
    </Svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </Svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 5h16v11H9l-5 4V5Z" />
      <path d="M9 10h6" />
    </Svg>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 12 20 4l-4 16-4.5-6.5L4 12Z" />
      <path d="m11.5 13.5 4-4" />
    </Svg>
  );
}

export function NavigationIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3 4 20l8-4 8 4-8-17Z" />
    </Svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14M14 7l5 5-5 5" />
    </Svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z" />
    </Svg>
  );
}

export function AlertTriangleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10v4M12 17.5v.01" />
    </Svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.5v.01" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function TrendIcon({ trend, className = 'h-4 w-4' }: IconProps & { trend: Trend }) {
  return (
    <Svg className={className}>
      {trend === 'rising' && <path d="M7 17 17 7M9 7h8v8" />}
      {trend === 'falling' && <path d="M7 7l10 10M17 9v8H9" />}
      {trend === 'steady' && <path d="M5 12h14M14 7l5 5-5 5" />}
    </Svg>
  );
}
