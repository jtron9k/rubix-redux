import { useNow } from '../hooks/useNow';
import { parseDate, timeLeft } from '../lib/promo';

interface Props {
  /** ISO date or datetime. A date-only value lasts through the end of that day. */
  until: string | undefined;
  className?: string;
  tone?: 'dark' | 'light';
}

const UNITS = [
  ['days', 'Days'],
  ['hours', 'Hrs'],
  ['minutes', 'Min'],
  ['seconds', 'Sec'],
] as const;

export function Countdown({ until, className = '', tone = 'dark' }: Props) {
  const now = useNow(1000);
  const left = timeLeft(parseDate(until, true), now);
  if (!left) return null;
  const light = tone === 'light';
  return (
    <div className={`flex gap-2 ${className}`} role="timer" aria-label={`${left.days} days ${left.hours} hours ${left.minutes} minutes left`}>
      {UNITS.map(([key, label]) => (
        <div key={key} className={`min-w-14 rounded-lg px-2 py-1.5 text-center ${light ? 'bg-white/15 text-white' : 'bg-ink-900 text-white'}`}>
          <span className="block font-display text-xl font-bold tabular-nums leading-none">{String(left[key]).padStart(2, '0')}</span>
          <span className={`text-[10px] uppercase tracking-wider ${light ? 'text-white/75' : 'text-ink-300'}`}>{label}</span>
        </div>
      ))}
    </div>
  );
}
