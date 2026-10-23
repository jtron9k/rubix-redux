import { Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CtaLink, PageContent, SiteContent } from '../content/types';
import { pushEvent } from '../lib/analytics';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useReviewCounter } from '../hooks/reviewCounter';
import { scrollToQuote } from '../lib/scroll';
import { PhoneLink } from './PhoneLink';

type Variant = 'primary' | 'secondary' | 'light';

const STYLES: Record<Variant, string> = {
  primary: 'bg-black text-white hover:bg-zinc-800 focus-visible:outline-black',
  secondary: 'bg-white text-ink-900 ring-1 ring-inset ring-ink-300 hover:bg-ink-50 focus-visible:outline-ink-900',
  light: 'bg-white text-ink-900 hover:bg-brand-50 focus-visible:outline-white',
};

interface Props {
  cta: CtaLink | undefined;
  site: SiteContent;
  page: PageContent;
  location: string;
  variant?: Variant;
  className?: string;
}

/**
 * A call to action. Blank href calls the site phone; '#quote' scrolls to the lead form
 * (falling back to a call when the page has no form); anything else is a link.
 */
export function CtaButton({ cta, site, page, location, variant = 'primary', className = '' }: Props) {
  const counter = useReviewCounter();
  const reduced = useReducedMotion();
  if (!cta?.label) return null;
  const base = `relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-6 py-3.5 text-base font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${STYLES[variant]} ${className}`;
  // The shine rides the review counter switch.
  const shine =
    variant === 'primary' && counter.enabled && !reduced ? (
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shine bg-gradient-to-r from-transparent via-white/25 to-transparent" />
    ) : null;
  const href = cta.href?.trim() ?? '';
  const track = () => pushEvent('cta_click', { cta_label: cta.label, cta_location: location, cta_href: href, page_path: window.location.pathname, page_group: site.groupSlug });

  if (!href || (href === '#quote' && !page.form)) {
    return (
      <PhoneLink site={site} location={location} className={base}>
        {shine}
        <Phone className="h-5 w-5" aria-hidden />
        {cta.label}
      </PhoneLink>
    );
  }
  if (href === '#quote') {
    return (
      <a
        href="#quote"
        className={base}
        onClick={(e) => {
          track();
          if (scrollToQuote()) e.preventDefault();
        }}
      >
        {shine}
        {cta.label}
      </a>
    );
  }
  if (href.startsWith('/')) {
    return (
      <Link to={href} className={base} onClick={track}>
        {shine}
        {cta.label}
      </Link>
    );
  }
  return (
    <a href={href} className={base} onClick={track} rel="noopener">
      {shine}
      {cta.label}
    </a>
  );
}
