import { ArrowRight, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Announcement } from '../content/types';
import { useActiveEntries } from '../hooks/usePromo';
import { Inline } from './Markdown';

/** Shows only the first active announcement. */
export function AnnouncementBar({ announcements }: { announcements: Announcement[] | undefined }) {
  const [item] = useActiveEntries(announcements);
  if (!item) return null;
  const href = item.href?.trim();
  const label = item.linkLabel || 'Learn more';
  const cls = 'inline-flex items-center gap-1 font-semibold underline underline-offset-2';
  return (
    <div className="bg-accent-500 px-4 py-2.5 text-center text-sm text-ink-950 sm:px-6">
      <p className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Megaphone className="h-4 w-4 shrink-0" aria-hidden />
        <span>
          <Inline>{item.text}</Inline>
        </span>
        {href &&
          (href.startsWith('/') ? (
            <Link to={href} className={cls}>
              {label} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <a href={href} className={cls}>
              {label} <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          ))}
      </p>
    </div>
  );
}
