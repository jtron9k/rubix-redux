import { Quote } from 'lucide-react';
import type { ReviewsContent } from '../content/types';
import { RatingStars } from './RatingStars';
import { Section, SectionHeading } from './Section';

export function Reviews({ content, tone = 'white' }: { content: ReviewsContent; tone?: 'white' | 'tint' }) {
  if (!content?.items?.length) return null;
  return (
    <Section id="reviews" tone={tone}>
      <SectionHeading title={content.heading} />
      {content.ratingLabel && <RatingStars label={content.ratingLabel} className="-mt-6 mb-10 justify-center" />}
      <div className="grid gap-6 md:grid-cols-3">
        {content.items.map((r) => (
          <figure key={`${r.name}-${r.quote.slice(0, 20)}`} className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-ink-100">
            <Quote className="h-7 w-7 text-brand-300" aria-hidden />
            <blockquote className="mt-3 flex-1 text-ink-700">“{r.quote}”</blockquote>
            <figcaption className="mt-5 flex items-center justify-between gap-2">
              <span>
                <span className="block font-semibold text-ink-900">{r.name}</span>
                {r.location && <span className="text-sm text-ink-500">{r.location}</span>}
              </span>
              <RatingStars rating={r.rating} />
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
