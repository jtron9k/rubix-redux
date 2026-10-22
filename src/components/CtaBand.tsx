import type { CtaBandContent, PageContent, SiteContent } from '../content/types';
import { CtaButton } from './CtaButton';
import { Inline } from './Markdown';
import { PhoneLink } from './PhoneLink';

interface Props {
  content: CtaBandContent;
  page: PageContent;
  site: SiteContent;
  tone?: 'light' | 'dark';
  location: string;
}

export function CtaBand({ content, page, site, tone = 'light', location }: Props) {
  const dark = tone === 'dark';
  return (
    <section className={`px-4 py-14 sm:px-6 ${dark ? 'bg-ink-900 text-white' : 'bg-brand-600 text-white'}`}>
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold md:text-3xl">
            <Inline>{content.heading}</Inline>
          </h2>
          <p className="mt-2 text-white/85">
            <Inline>{content.body}</Inline>
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          <CtaButton cta={content.primaryCta} site={site} page={page} location={location} variant="light" />
          <PhoneLink site={site} location={`${location}_phone`} className="text-sm font-medium text-white/85 underline-offset-2 hover:underline">
            or call {site.phone}
          </PhoneLink>
        </div>
      </div>
    </section>
  );
}
