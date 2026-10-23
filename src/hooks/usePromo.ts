import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { DateWindow } from '../content/types';
import { activeEntries, readPromoPreview } from '../lib/promo';
import { useNow } from './useNow';

/** Entries whose date window is open now, honoring the promo_* preview params. Rechecked every minute. */
export function useActiveEntries<T extends DateWindow>(entries: T[] | undefined): T[] {
  const { search } = useLocation();
  const now = useNow(60_000);
  const preview = useMemo(() => readPromoPreview(search), [search]);
  return activeEntries(entries, now, preview);
}
