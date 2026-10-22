import { Star } from 'lucide-react';
import { fillReviewLabel, useReviewCounter } from '../hooks/reviewCounter';

interface Props {
  label?: string;
  rating?: number;
  className?: string;
  tone?: 'dark' | 'light';
}

/** Five stars that fill with the review counter, plus an optional {{reviewCount}} label. */
export function RatingStars({ label, rating = 5, className = '', tone = 'dark' }: Props) {
  const counter = useReviewCounter();
  const text = fillReviewLabel(label, counter);
  const fill = (rating / 5) * counter.progress * 100;
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      <div className="relative inline-flex" role="img" aria-label={`Rated ${rating} out of 5`}>
        <div className="flex text-ink-300">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className="h-5 w-5" fill="currentColor" strokeWidth={0} aria-hidden />
          ))}
        </div>
        <div className="absolute inset-0 flex overflow-hidden text-accent-500" style={{ width: `${fill}%` }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} className="h-5 w-5 shrink-0" fill="currentColor" strokeWidth={0} aria-hidden />
          ))}
        </div>
      </div>
      {text && <span className={`text-sm font-medium tabular-nums ${tone === 'light' ? 'text-white/90' : 'text-ink-700'}`}>{text}</span>}
    </div>
  );
}
