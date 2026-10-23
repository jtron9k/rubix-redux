import type { LayoutProps } from '../layouts/types';
import { LeadForm } from './LeadForm';
import { Section } from './Section';

/** The #quote section with the page's lead form, or nothing when the page has no form. */
export function QuoteSection({ page, site, experiment, tone = 'tint' }: LayoutProps & { tone?: 'white' | 'tint' }) {
  if (!page.form?.fields?.length) return null;
  return (
    <Section id="quote" tone={tone} className="scroll-mt-16">
      <LeadForm form={page.form} site={site} {...experiment} className="mx-auto max-w-xl" />
    </Section>
  );
}
