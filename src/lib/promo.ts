// Date gates for coupons, announcements and promo ads. Pure: `now` is always an argument.
//
// Dates may be 'YYYY-MM-DD' (local time; a date-only expiresAt lasts through the end of that day)
// or a full ISO datetime. Preview params:
//   ?promo_preview=1          show every entry regardless of dates
//   ?promo_start=YYYYMMDD     show entries active at any point from this day...
//   ?promo_end=YYYYMMDD       ...through this day (either side may be omitted)

import type { DateWindow } from '../content/types';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const COMPACT = /^(\d{4})(\d{2})(\d{2})$/;

export function parseDate(value: string | undefined | null, endOfDay = false): Date | null {
  if (!value || !String(value).trim()) return null;
  const s = String(value).trim();
  const m = DATE_ONLY.exec(s) ?? COMPACT.exec(s);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
    const date = endOfDay ? new Date(y, mo, d, 23, 59, 59, 999) : new Date(y, mo, d);
    return date.getMonth() === mo ? date : null;
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t);
}

export interface PromoPreview {
  all: boolean;
  start: Date | null;
  end: Date | null;
}

export function readPromoPreview(search: string): PromoPreview {
  const p = new URLSearchParams(search);
  return {
    all: p.get('promo_preview') === '1',
    start: parseDate(p.get('promo_start')),
    end: parseDate(p.get('promo_end'), true),
  };
}

export function isWindowActive(win: DateWindow, now: Date, preview?: PromoPreview): boolean {
  if (preview?.all) return true;
  const starts = parseDate(win.startsAt);
  const expires = parseDate(win.expiresAt, true);
  if (preview && (preview.start || preview.end)) {
    // Overlap between the entry's window and the previewed range.
    const from = preview.start ?? new Date(-8.64e15);
    const to = preview.end ?? new Date(8.64e15);
    return (!starts || starts <= to) && (!expires || expires >= from);
  }
  return (!starts || starts <= now) && (!expires || expires > now);
}

export function activeEntries<T extends DateWindow>(entries: T[] | undefined, now: Date, preview?: PromoPreview): T[] {
  return (entries ?? []).filter((e) => isWindowActive(e, now, preview));
}

/** Time left until a deadline, or null once it has passed. */
export function timeLeft(deadline: Date | null, now: Date) {
  if (!deadline) return null;
  const ms = deadline.getTime() - now.getTime();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

/**
 * Where an expired campaign page should send visitors: its group home, or '/' for a group home itself.
 * Null when the campaign is still running, has no end date, or the target page doesn't exist.
 */
export function campaignRedirect(
  slug: string,
  campaignEndsAt: string | undefined,
  now: Date,
  hasPage: (path: string) => boolean,
): string | null {
  const ends = parseDate(campaignEndsAt, true);
  if (!ends || ends > now) return null;
  if (slug === '/') return null;
  const seg = slug.split('/').filter(Boolean)[0];
  const target = `/${seg}` === slug ? '/' : `/${seg}`;
  if (!hasPage(target)) return null;
  return target;
}
