import { createContext, useContext } from 'react';

export interface ReviewCounterState {
  /** Count to display right now. */
  current: number;
  target: number;
  /** 0 to 1, drives the star fill. */
  progress: number;
  enabled: boolean;
}

export const ReviewCounterContext = createContext<ReviewCounterState>({ current: 0, target: 0, progress: 1, enabled: false });

export function useReviewCounter(): ReviewCounterState {
  return useContext(ReviewCounterContext);
}

/**
 * Replace {{reviewCount}} in a label. Returns null when the label needs a count
 * but the counter is off, so callers drop the label instead of printing a blank.
 */
export function fillReviewLabel(label: string | undefined, state: ReviewCounterState): string | null {
  if (!label) return null;
  if (!/\{\{\s*reviewCount\s*\}\}/.test(label)) return label;
  if (!state.enabled) return null;
  return label.replace(/\{\{\s*reviewCount\s*\}\}/g, state.current.toLocaleString('en-US'));
}
