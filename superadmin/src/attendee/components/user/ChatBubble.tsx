import { Link } from '@/lib/navigation';
import type { ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { NavigationIcon } from './icons';

/**
 * One chat message. Assistant answers list what they were grounded in and, when
 * the answer points at a zone, offer a 48px shortcut to it on the map.
 */
export default function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const sources = message.sources ?? [];
  const zoneSource = sources.find((source) => source.kind === 'zone' && source.id);

  return (
    <li className={cn('flex flex-col gap-2', isUser ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] whitespace-pre-line rounded-3xl px-4 py-3 text-[15px] leading-relaxed',
          isUser ? 'rounded-br-lg bg-blue-600 text-white' : 'rounded-bl-lg bg-white text-slate-900 ring-1 ring-slate-200',
        )}
      >
        {message.content}
      </div>

      {!isUser && sources.length > 0 && (
        <p className="max-w-[85%] px-1 text-xs leading-relaxed text-slate-500">
          Based on {sources.map((source) => source.label).join(', ')}
        </p>
      )}

      {!isUser && zoneSource?.id && (
        <Link
          href={`/user/map?zone=${zoneSource.id}`}
          className="inline-flex min-h-[48px] touch-manipulation items-center gap-2 rounded-full bg-sky-100 px-5 text-sm font-semibold text-blue-700 transition-colors active:bg-sky-200"
        >
          <NavigationIcon className="h-4 w-4" />
          Show on map
        </Link>
      )}
    </li>
  );
}
