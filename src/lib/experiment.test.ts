import { describe, expect, it } from 'vitest';
import type { ExperimentConfig } from '../content/types';
import { armCookie, clearArmCookie, cookieName, decideArm, isActive, readArm, readPin, stripPin, variantPercent } from './experiment';

const exp = (over: Partial<ExperimentConfig> = {}): ExperimentConfig => ({ id: 'home_v1', variantLayout: 'trust-heavy', variantPercent: 50, ...over });
const decide = (over: Partial<Parameters<typeof decideArm>[0]> = {}) =>
  decideArm({ experiment: exp(), search: '', cookieString: '', variantRenderable: true, random: () => 0.9, ...over });

describe('isActive', () => {
  it('needs an id and a variant; blank strings count as absent', () => {
    expect(isActive(exp())).toBe(true);
    expect(isActive(exp({ variantSlug: '/x', variantLayout: '' }))).toBe(true);
    expect(isActive(exp({ id: '  ' }))).toBe(false);
    expect(isActive(exp({ variantLayout: '', variantSlug: ' ' }))).toBe(false);
    expect(isActive(undefined)).toBe(false);
  });
});

describe('cookieName and variantPercent', () => {
  it('lowercases and replaces unsafe characters', () => {
    expect(cookieName('Home-V1.b')).toBe('lp_ab_home_v1_b');
  });
  it('defaults to 50 and clamps to 0..100', () => {
    expect(variantPercent(exp({ variantPercent: null }))).toBe(50);
    expect(variantPercent(exp({ variantPercent: 'x' as unknown as number }))).toBe(50);
    expect(variantPercent(exp({ variantPercent: 140 }))).toBe(100);
    expect(variantPercent(exp({ variantPercent: -5 }))).toBe(0);
  });
});

describe('readPin and readArm', () => {
  it('reads a, b and off case-insensitively', () => {
    expect(readPin('?lp_ab=B')).toBe('b');
    expect(readPin('?lp_ab=off')).toBe('off');
    expect(readPin('?lp_ab=c')).toBeNull();
    expect(readPin('')).toBeNull();
  });
  it('reads the arm and ignores malformed cookies without throwing', () => {
    expect(readArm('a=1; lp_ab_home_v1=variant', 'home_v1')).toBe('variant');
    expect(readArm('lp_ab_home_v1=%E0%A4%A', 'home_v1')).toBeNull();
    expect(readArm('lp_ab_home_v1=banana', 'home_v1')).toBeNull();
    expect(readArm('garbage;;=;', 'home_v1')).toBeNull();
  });
});

describe('decideArm precedence', () => {
  it('a QA pin wins over the cookie and the share, and writes no cookie', () => {
    expect(decide({ search: '?lp_ab=b', cookieString: 'lp_ab_home_v1=control', experiment: exp({ variantPercent: 0 }) })).toEqual({ arm: 'variant', source: 'pin', cookie: 'none' });
    expect(decide({ search: '?lp_ab=off' })).toEqual({ arm: 'control', source: 'pin', cookie: 'clear' });
  });
  it('0 and 100 percent force an arm over the cookie (the kill switch)', () => {
    expect(decide({ experiment: exp({ variantPercent: 0 }), cookieString: 'lp_ab_home_v1=variant' })).toEqual({ arm: 'control', source: 'forced', cookie: 'write' });
    expect(decide({ experiment: exp({ variantPercent: 100 }) }).arm).toBe('variant');
  });
  it('a stored arm beats the roll', () => {
    expect(decide({ cookieString: 'lp_ab_home_v1=variant', random: () => 0.99 })).toEqual({ arm: 'variant', source: 'cookie', cookie: 'none' });
  });
  it('rolls against the share and writes the result', () => {
    expect(decide({ random: () => 0.2 })).toEqual({ arm: 'variant', source: 'roll', cookie: 'write' });
    expect(decide({ random: () => 0.8 })).toEqual({ arm: 'control', source: 'roll', cookie: 'write' });
  });
  it('a throwing random falls back to the midpoint', () => {
    const d = decide({ random: () => { throw new Error('no'); }, experiment: exp({ variantPercent: 60 }) });
    expect(d.arm).toBe('variant');
  });
  it('an unrenderable variant is served and reported as control without writing a cookie', () => {
    expect(decide({ random: () => 0.1, variantRenderable: false })).toEqual({ arm: 'control', source: 'fallback', cookie: 'none' });
    expect(decide({ search: '?lp_ab=b', variantRenderable: false }).arm).toBe('control');
  });
});

describe('cookies and pin stripping', () => {
  it('writes a 30-day JS-readable Lax cookie and clears it', () => {
    expect(armCookie('home_v1', 'variant')).toBe('lp_ab_home_v1=variant; Max-Age=2592000; Path=/; SameSite=Lax');
    expect(clearArmCookie('home_v1')).toContain('Max-Age=0');
  });
  it('strips only the pin and keeps other params', () => {
    expect(stripPin('?lp_ab=b&gclid=1&utm_source=x')).toBe('?gclid=1&utm_source=x');
    expect(stripPin('?lp_ab=a')).toBe('');
    expect(stripPin('?gclid=1')).toBeNull();
  });
});
