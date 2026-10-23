import { describe, expect, it } from 'vitest';
import { activeEntries, campaignRedirect, isWindowActive, parseDate, readPromoPreview, timeLeft } from './promo';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

describe('parseDate', () => {
  it('reads date-only values in local time, optionally at the end of the day', () => {
    expect(parseDate('2027-06-01')).toEqual(new Date(2027, 5, 1));
    expect(parseDate('2027-06-01', true)).toEqual(new Date(2027, 5, 1, 23, 59, 59, 999));
    expect(parseDate('20270601')).toEqual(new Date(2027, 5, 1));
  });
  it('reads ISO datetimes and rejects junk and impossible dates', () => {
    expect(parseDate('2027-06-01T10:00:00Z')?.toISOString()).toBe('2027-06-01T10:00:00.000Z');
    expect(parseDate('2027-02-31')).toBeNull();
    expect(parseDate('soon')).toBeNull();
    expect(parseDate('')).toBeNull();
  });
});

describe('isWindowActive', () => {
  const win = { startsAt: '2027-06-01', expiresAt: '2027-06-30' };
  it('is active from the start through the end of the expiry day', () => {
    expect(isWindowActive(win, at(2027, 5, 31))).toBe(false);
    expect(isWindowActive(win, at(2027, 6, 1, 0))).toBe(true);
    expect(isWindowActive(win, at(2027, 6, 30, 23))).toBe(true);
    expect(isWindowActive(win, at(2027, 7, 1, 0))).toBe(false);
  });
  it('treats missing bounds as open', () => {
    expect(isWindowActive({}, at(2000, 1, 1))).toBe(true);
    expect(isWindowActive({ expiresAt: '2027-01-01' }, at(2026, 1, 1))).toBe(true);
  });
  it('promo_preview=1 shows everything; a start/end range shows overlapping entries', () => {
    const now = at(2026, 1, 1);
    expect(isWindowActive(win, now, readPromoPreview('?promo_preview=1'))).toBe(true);
    expect(isWindowActive(win, now, readPromoPreview('?promo_start=20270615&promo_end=20270720'))).toBe(true);
    expect(isWindowActive(win, now, readPromoPreview('?promo_start=20270701'))).toBe(false);
    expect(isWindowActive(win, now, readPromoPreview('?promo_end=20270531'))).toBe(false);
  });
  it('activeEntries filters a list and tolerates undefined', () => {
    expect(activeEntries([win, { expiresAt: '2020-01-01' }], at(2027, 6, 10))).toEqual([win]);
    expect(activeEntries(undefined, at(2027, 6, 10))).toEqual([]);
  });
});

describe('timeLeft', () => {
  it('breaks the remaining time down and returns null once passed', () => {
    const now = new Date(2027, 0, 1);
    expect(timeLeft(new Date(2027, 0, 2, 3, 4, 5), now)).toEqual({ days: 1, hours: 3, minutes: 4, seconds: 5 });
    expect(timeLeft(now, now)).toBeNull();
    expect(timeLeft(null, now)).toBeNull();
  });
});

describe('campaignRedirect', () => {
  const has = (p: string) => ['/', '/austin'].includes(p);
  it('sends an ended campaign to its group home', () => {
    expect(campaignRedirect('/austin/summer', '2027-08-31', at(2027, 9, 1), has)).toBe('/austin');
  });
  it('stays while running, without an end date, at the root, or when the target is missing', () => {
    expect(campaignRedirect('/austin/summer', '2027-08-31', at(2027, 8, 31, 23), has)).toBeNull();
    expect(campaignRedirect('/austin/summer', undefined, at(2030, 1, 1), has)).toBeNull();
    expect(campaignRedirect('/denver/summer', '2020-01-01', at(2030, 1, 1), has)).toBeNull();
    expect(campaignRedirect('/', '2020-01-01', at(2030, 1, 1), has)).toBeNull();
  });
  it('a group home goes to /', () => {
    expect(campaignRedirect('/austin', '2020-01-01', at(2030, 1, 1), has)).toBe('/');
  });
});
