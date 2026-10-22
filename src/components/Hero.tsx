import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PageContent, SiteContent } from '../content/types';
import { CtaButton } from './CtaButton';
import { Img } from './Img';
import { Inline } from './Markdown';
import { RatingStars } from './RatingStars';

interface Props {
  page: PageContent;
  site: SiteContent;
  compact?: boolean;
  /** Replaces the image column, e.g. the lead form. */
  aside?: ReactNode;
}

export function Hero({ page, site, compact = false, aside }: Props) {
  const { hero } = page;
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white px-4 sm:px-6">
      <div className={`mx-auto grid max-w-6xl items-center gap-10 ${compact ? 'py-12 md:py-16' : 'py-14 md:py-24'} ${aside || hero.image ? 'md:grid-cols-2' : ''}`}>
        <div>
          {hero.eyebrow && <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-700">{hero.eyebrow}</p>}
          <h1 className={`font-display font-bold tracking-tight text-ink-900 ${compact ? 'text-3xl md:text-5xl' : 'text-4xl md:text-6xl'}`}>
            <Inline>{hero.headline}</Inline>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-600 md:text-xl">
            <Inline>{hero.subheadline}</Inline>
          </p>
          {hero.ratingLabel && <RatingStars label={hero.ratingLabel} className="mt-6" />}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CtaButton cta={hero.primaryCta} site={site} page={page} location="hero" />
            <CtaButton cta={hero.secondaryCta} site={site} page={page} location="hero_secondary" variant="secondary" />
          </div>
          {hero.bullets && hero.bullets.length > 0 && (
            <ul className="mt-8 grid gap-2 text-ink-700 sm:grid-cols-2">
              {hero.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                  <span>
                    <Inline>{b}</Inline>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {aside ?? (hero.image && <Img image={hero.image} width={800} sizes="(min-width: 768px) 50vw, 100vw" priority className="aspect-[16/10] w-full rounded-3xl object-cover shadow-xl" />)}
      </div>
    </section>
  );
}
