import { Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SiteContent } from '../content/types';
import { Img } from './Img';
import { PhoneLink } from './PhoneLink';

export function Header({ site }: { site: SiteContent }) {
  const home = site.groupSlug ? `/${site.groupSlug}` : '/';
  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to={home} className="flex min-w-0 items-center gap-2">
          <Img image={site.logo} width={160} className="h-9 w-auto" priority />
          {site.groupName && <span className="hidden truncate text-sm font-medium text-ink-500 sm:inline">{site.groupName}</span>}
        </Link>
        <PhoneLink
          site={site}
          location="header"
          className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 md:text-base"
        >
          <Phone className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{site.phone}</span>
          <span className="sm:hidden">Call</span>
        </PhoneLink>
      </div>
    </header>
  );
}
