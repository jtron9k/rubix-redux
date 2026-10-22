import { type ReactNode, useEffect, useState } from 'react';
import { prefersReducedMotion } from './useReducedMotion';
import { ReviewCounterContext } from './reviewCounter';

interface Props {
  target: number;
  rampMs: number;
  children: ReactNode;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Counts up to `target`. Mount with key={pathname} so each page restarts the count. */
export function ReviewCounterProvider({ target, rampMs, children }: Props) {
  const enabled = target > 0;
  // Settled from the start under reduced motion, in a hidden tab, or with no ramp.
  const [progress, setProgress] = useState(() =>
    !enabled || rampMs <= 0 || prefersReducedMotion() || (typeof document !== 'undefined' && document.hidden) ? 1 : 0,
  );

  useEffect(() => {
    if (progress >= 1) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / rampMs);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Run once per mount; the provider is keyed by pathname.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eased = easeOut(progress);
  const value = { current: Math.round(target * eased), target, progress: enabled ? eased : 1, enabled };
  return <ReviewCounterContext.Provider value={value}>{children}</ReviewCounterContext.Provider>;
}
