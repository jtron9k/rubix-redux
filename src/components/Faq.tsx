import { ChevronDown } from 'lucide-react';
import type { FaqItem } from '../content/types';
import { Prose } from './Markdown';
import { Section, SectionHeading } from './Section';

export function Faq({ items, heading = 'Frequently asked questions' }: { items: FaqItem[] | undefined; heading?: string }) {
  if (!items?.length) return null;
  return (
    <Section id="faq">
      <SectionHeading title={heading} />
      <div className="mx-auto max-w-3xl divide-y divide-ink-100 rounded-2xl ring-1 ring-ink-100">
        {items.map((f) => (
          <details key={f.question} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-900">
              {f.question}
              <ChevronDown className="h-5 w-5 shrink-0 text-ink-400 transition group-open:rotate-180" aria-hidden />
            </summary>
            <Prose className="mt-3 text-ink-600">{f.answer}</Prose>
          </details>
        ))}
      </div>
    </Section>
  );
}
