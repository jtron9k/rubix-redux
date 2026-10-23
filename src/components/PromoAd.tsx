import type { PageContent, PromoAd as PromoAdItem, SiteContent } from '../content/types';
import { useActiveEntries } from '../hooks/usePromo';
import { CtaButton } from './CtaButton';
import { Img } from './Img';
import { Inline } from './Markdown';

interface Props {
  ads: PromoAdItem[] | undefined;
  page: PageContent;
  site: SiteContent;
}

/** Every active promo ad, stacked. */
export function PromoAd({ ads, page, site }: Props) {
  const active = useActiveEntries(ads);
  if (!active.length) return null;
  return (
    <div className="space-y-6 bg-white px-4 py-10 sm:px-6">
      {active.map((ad, i) => (
        <aside key={`${ad.heading}-${i}`} className="mx-auto grid max-w-6xl items-center overflow-hidden rounded-3xl bg-accent-50 ring-1 ring-accent-200 md:grid-cols-[2fr_3fr]">
          {ad.image && <Img image={ad.image} width={600} sizes="(min-width: 768px) 40vw, 100vw" className="aspect-[4/3] h-full w-full object-cover" />}
          <div className={`p-8 md:p-10 ${ad.image ? '' : 'md:col-span-2'}`}>
            <h2 className="font-display text-2xl font-bold text-ink-900 md:text-3xl">
              <Inline>{ad.heading}</Inline>
            </h2>
            <p className="mt-3 text-ink-700">
              <Inline>{ad.body}</Inline>
            </p>
            <CtaButton cta={ad.cta} site={site} page={page} location={`promo_ad_${i + 1}`} className="mt-6" />
          </div>
        </aside>
      ))}
    </div>
  );
}
