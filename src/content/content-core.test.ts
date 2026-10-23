// Templates, group resolution and the review counter: the pure rules in shared/content-core.mjs.
import { describe, expect, it } from 'vitest';
import {
  applyTemplates,
  buildTokens,
  canRenderLayout,
  findStrayTokens,
  normalizeSlug,
  phoneDigits,
  resolveReviewCounter,
  resolveSite,
  slugToFileName,
  telHref,
} from '../../shared/content-core.mjs';
import { fillReviewLabel } from '../hooks/reviewCounter';
import type { BusinessSettings, PageGroup } from './types';

const settings = {
  businessName: 'Acme Care',
  phone: '(555) 010-0100',
  hoursText: 'Main hours',
  metaDefaults: { title: 'Acme', description: 'Main description' },
  reviewCounter: { target: 500, rampMs: 3000 },
} as unknown as BusinessSettings;

const groups: PageGroup[] = [
  { key: 'austin', name: 'Austin', regionName: 'Central Texas', stateAbbr: 'TX', phone: '(555) 010-0123', hoursText: '', metaDefaults: { title: 'Austin Acme' } },
];

describe('slugs', () => {
  it('normalizes case, slashes, query and hash', () => {
    expect(normalizeSlug('/Austin//Date-Night/?x=1#quote')).toBe('/austin/date-night');
    expect(normalizeSlug('')).toBe('/');
    expect(normalizeSlug('austin')).toBe('/austin');
  });
  it('maps slugs to the file names Decap writes', () => {
    expect(slugToFileName('/austin/date-night')).toBe('austin-date-night');
    expect(slugToFileName('/')).toBe('home');
  });
});

describe('resolveSite', () => {
  it('merges non-blank group overrides onto the settings', () => {
    const site = resolveSite(settings, groups, '/austin/date-night');
    expect(site.phone).toBe('(555) 010-0123');
    expect(site.hoursText).toBe('Main hours');
    expect(site.metaDefaults).toEqual({ title: 'Austin Acme', description: 'Main description' });
    expect(site.groupSlug).toBe('austin');
    expect(site.groupName).toBe('Austin');
  });
  it('falls back to the root site for unknown or empty segments', () => {
    for (const path of ['/', '/houston/x']) {
      const site = resolveSite(settings, groups, path);
      expect(site.group).toBeNull();
      expect(site.phone).toBe('(555) 010-0100');
      expect(site.groupSlug).toBe('');
    }
  });
});

describe('templates', () => {
  const tokens = buildTokens(resolveSite(settings, groups, '/austin'));
  it('substitutes known tokens deeply and leaves runtime and unknown tokens', () => {
    const out = applyTemplates(
      { h: '{{groupName}}, {{ stateAbbr }} · call {{phone}}', list: ['{{businessName}}'], n: 3, label: '{{reviewCount}} reviews', bad: '{{nope}}' },
      tokens,
    );
    expect(out).toEqual({ h: 'Austin, TX · call (555) 010-0123', list: ['Acme Care'], n: 3, label: '{{reviewCount}} reviews', bad: '{{nope}}' });
    expect(findStrayTokens(out)).toEqual(['nope']);
  });
  it('groupName falls back to the region name, and is blank at the root', () => {
    expect(buildTokens(resolveSite(settings, [{ key: 'x', name: '', regionName: 'Region' }], '/x')).groupName).toBe('Region');
    expect(buildTokens(resolveSite(settings, groups, '/')).groupName).toBe('');
  });
});

describe('review counter', () => {
  it('inherits settings, then group, then page; 0 turns it off; blank inherits', () => {
    expect(resolveReviewCounter(settings.reviewCounter)).toEqual({ target: 500, rampMs: 3000 });
    expect(resolveReviewCounter(settings.reviewCounter, { target: 900 }, null)).toEqual({ target: 900, rampMs: 3000 });
    expect(resolveReviewCounter(settings.reviewCounter, { target: 900 }, { target: 0 })).toEqual({ target: 0, rampMs: 3000 });
    expect(resolveReviewCounter(settings.reviewCounter, { target: null, rampMs: null })).toEqual({ target: 500, rampMs: 3000 });
    expect(resolveReviewCounter()).toEqual({ target: 0, rampMs: 4000 });
  });
  it('fills labels while on, and drops count labels while off', () => {
    const on = { current: 1240, target: 1240, progress: 1, enabled: true };
    const off = { current: 0, target: 0, progress: 1, enabled: false };
    expect(fillReviewLabel('{{reviewCount}} five-star reviews', on)).toBe('1,240 five-star reviews');
    expect(fillReviewLabel('{{reviewCount}} five-star reviews', off)).toBeNull();
    expect(fillReviewLabel('Rated five stars', off)).toBe('Rated five stars');
    expect(fillReviewLabel(undefined, on)).toBeNull();
  });
});

describe('phones and layouts', () => {
  it('builds tel: links from display phones', () => {
    expect(phoneDigits('1 (555) 010-0100')).toBe('5550100100');
    expect(telHref('(555) 010-0100')).toBe('tel:+15550100100');
    expect(telHref('')).toBe('');
  });
  it('lead-form needs fields and campaign needs coupons', () => {
    expect(canRenderLayout({}, 'standard')).toBe(true);
    expect(canRenderLayout({}, 'lead-form')).toBe(false);
    expect(canRenderLayout({ form: { fields: [{}] } } as never, 'lead-form')).toBe(true);
    expect(canRenderLayout({ coupons: [] }, 'campaign')).toBe(false);
    expect(canRenderLayout({}, 'nope')).toBe(false);
  });
});
