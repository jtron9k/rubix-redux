import { Check } from 'lucide-react';
import type { OfferContent } from '../content/types';
import { Inline } from './Markdown';
import { Section, SectionHeading } from './Section';

/** A value stack: what's included, each with an optional value, and a total line. */
export function OfferStack({ offer }: { offer: OfferContent | undefined }) {
  if (!offer?.items?.length) return null;
  return (
    <Section id="offer">
      <SectionHeading title={offer.heading} />
      <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-ink-100">
        <ul className="divide-y divide-ink-100">
          {offer.items.map((item) => (
            <li key={item.title} className="flex items-start gap-4 p-5 md:p-6">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
                <Check className="h-4 w-4" aria-hidden />
              </span>
              <div className="flex-1">
                <p className="font-semibold text-ink-900">{item.title}</p>
                {item.body && (
                  <p className="mt-1 text-ink-600">
                    <Inline>{item.body}</Inline>
                  </p>
                )}
              </div>
              {item.value && <span className="shrink-0 font-semibold text-brand-700">{item.value}</span>}
            </li>
          ))}
        </ul>
        {offer.totalLabel && (
          <p className="bg-ink-900 px-6 py-4 text-center font-display text-lg font-bold text-white">
            <Inline>{offer.totalLabel}</Inline>
          </p>
        )}
      </div>
    </Section>
  );
}
