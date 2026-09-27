import type { CSSProperties, ReactNode } from 'react';
import AttendeeNav from '@/components/user/AttendeeNav';

const shellVars = {
  '--nav-h': 'calc(4rem + env(safe-area-inset-bottom))',
  '--font-display': '"Bricolage Grotesque", system-ui, sans-serif',
  '--font-body': '"Figtree", system-ui, sans-serif',
} as CSSProperties;

export default function AttendeeLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={shellVars}
      className="min-h-[100dvh] bg-slate-900 font-sans text-slate-900 antialiased [-webkit-tap-highlight-color:transparent]"
    >
      {/* On desktop the app sits in a phone-width column on a dark backdrop. */}
      <div className="relative mx-auto min-h-[100dvh] w-full max-w-md overflow-x-clip bg-slate-50 pb-[var(--nav-h)] shadow-2xl shadow-black/40">
        {children}
      </div>
      <AttendeeNav />
    </div>
  );
}
