import { cn } from '@/lib/utils';

/** Placeholder block shown while the first request is in flight. */
export default function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none', className)}
    />
  );
}
