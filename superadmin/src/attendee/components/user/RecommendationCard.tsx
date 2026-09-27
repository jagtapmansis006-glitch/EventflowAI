import { Link } from '@/lib/navigation';
import type { Recommendation } from '@/lib/types';
import { DISPLAY_FONT, cn } from '@/lib/utils';
import { ArrowRightIcon } from './icons';

const KIND_LABEL: Record<Recommendation['kind'], string> = {
  food: 'Food',
  restroom: 'Restrooms',
  route: 'Route',
  exit: 'Gates',
  service: 'Service',
};

export default function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const href = recommendation.zoneId ? `/user/map?zone=${recommendation.zoneId}` : '/user/map';

  return (
    <Link
      href={href}
      className="flex h-full min-h-[136px] touch-manipulation flex-col justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-colors active:bg-slate-50"
    >
      <div>
        <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-blue-700">
          {KIND_LABEL[recommendation.kind]}
        </span>
        <p className={cn(DISPLAY_FONT, 'mt-3 text-lg font-bold leading-snug text-slate-900')}>
          {recommendation.title}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{recommendation.detail}</p>
      </div>
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600">
        Show route
        <ArrowRightIcon className="h-4 w-4" />
      </span>
    </Link>
  );
}
