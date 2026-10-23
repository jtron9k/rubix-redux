import { Scissors } from 'lucide-react';
import type { Coupon, PageContent, SiteContent } from '../content/types';
import { useActiveEntries } from '../hooks/usePromo';
import { Countdown } from './Countdown';
import { CtaButton } from './CtaButton';
import { Inline } from './Markdown';
import { Section, SectionHeading } from './Section';

interface Props {
  coupons: Coupon[] | undefined;
  page: PageContent;
  site: SiteContent;
  heading?: string;
}

/** Date-gated coupon cards, each with a countdown when it has an expiry. */
export function CouponGrid({ coupons, page, site, heading = 'Current offers' }: Props) {
  const active = useActiveEntries(coupons);
  return (
    <Section id="offers" tone="tint">
      <SectionHeading title={heading} />
      {active.length === 0 ? (
        <p className="text-center text-ink-600">There are no offers running right now. Call us for current pricing.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {active.map((c, i) => (
            <article key={`${c.title}-${i}`} className="relative flex flex-col rounded-2xl border-2 border-dashed border-brand-300 bg-white p-6">
              <Scissors className="absolute -top-3 left-6 h-6 w-6 bg-brand-50 px-1 text-brand-500" aria-hidden />
              <p className="font-display text-4xl font-bold text-brand-700">{c.value}</p>
              <h3 className="mt-2 text-lg font-semibold text-ink-900">{c.title}</h3>
              <p className="mt-2 flex-1 text-ink-600">
                <Inline>{c.body}</Inline>
              </p>
              {c.code && (
                <p className="mt-4 text-sm text-ink-600">
                  Mention code <span className="rounded bg-ink-100 px-2 py-0.5 font-mono font-semibold text-ink-900">{c.code}</span>
                </p>
              )}
              {c.expiresAt && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">Ends in</p>
                  <Countdown until={c.expiresAt} />
                </div>
              )}
              <CtaButton cta={page.hero.primaryCta} site={site} page={page} location={`coupon_${i + 1}`} className="mt-6 w-full" />
              {c.finePrint && <p className="mt-3 text-xs text-ink-500">{c.finePrint}</p>}
            </article>
          ))}
        </div>
      )}
    </Section>
  );
}
