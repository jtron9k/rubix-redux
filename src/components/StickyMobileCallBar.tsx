import { ClipboardList, Phone } from 'lucide-react';
import type { SiteContent } from '../content/types';
import { pushEvent } from '../lib/analytics';
import { scrollToQuote } from '../lib/scroll';
import { PhoneLink } from './PhoneLink';

interface Props {
  site: SiteContent;
  /** 'form' scrolls to #quote instead of dialing (lead-form layout). */
  mode?: 'call' | 'form';
  formLabel?: string;
}

/** Fixed to the bottom on mobile only. The page wrapper adds pb-20 so it never covers content. */
export function StickyMobileCallBar({ site, mode = 'call', formLabel = 'Get a free quote' }: Props) {
  const cls = 'flex w-full items-center justify-center gap-2 rounded-full bg-black py-3.5 text-base font-semibold text-white active:bg-zinc-800';
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-200 bg-white/95 p-3 backdrop-blur md:hidden">
      {mode === 'form' ? (
        <div className="flex gap-2">
          <a
            href="#quote"
            className={cls}
            onClick={(e) => {
              pushEvent('cta_click', { cta_label: formLabel, cta_location: 'sticky_bar', cta_href: '#quote', page_path: window.location.pathname, page_group: site.groupSlug });
              if (scrollToQuote()) e.preventDefault();
            }}
          >
            <ClipboardList className="h-5 w-5" aria-hidden />
            {formLabel}
          </a>
          <PhoneLink site={site} location="sticky_bar" className="grid aspect-square h-[52px] shrink-0 place-items-center rounded-full bg-brand-600 text-white">
            <Phone className="h-5 w-5" aria-label={`Call ${site.phone}`} />
          </PhoneLink>
        </div>
      ) : (
        <PhoneLink site={site} location="sticky_bar" className={cls}>
          <Phone className="h-5 w-5" aria-hidden />
          Call {site.phone}
        </PhoneLink>
      )}
    </div>
  );
}
