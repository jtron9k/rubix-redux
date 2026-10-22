// Silent A/B split. React-free so it can be unit-tested; nothing here may throw.
//
// Precedence: QA pin (?lp_ab=a|b|off), then a 0 or 100 percent share, then the cookie, then a roll.
// Gotcha: a 0% share still writes a control cookie, so visitors who land while a test is staged
// stay in control after it goes live. Stage a test under a throwaway id, then switch to the real id.

import type { ExperimentConfig } from '../content/types';

export type Arm = 'control' | 'variant';
export type QaPin = 'a' | 'b' | 'off';
export type ArmSource = 'pin' | 'forced' | 'cookie' | 'roll' | 'fallback';

export const PIN_PARAM = 'lp_ab';
export const COOKIE_DAYS = 30;

const isBlank = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/** An experiment counts only with an id and a variant (slug or layout). Blank strings are absent. */
export function isActive(exp: ExperimentConfig | undefined | null): exp is ExperimentConfig {
  return Boolean(exp && !isBlank(exp.id) && (!isBlank(exp.variantSlug) || !isBlank(exp.variantLayout)));
}

export function cookieName(id: string): string {
  return `lp_ab_${id.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
}

export function variantPercent(exp: ExperimentConfig): number {
  const raw = exp.variantPercent;
  if (isBlank(raw)) return 50;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 50;
  return Math.min(100, Math.max(0, n));
}

export function readPin(search: string): QaPin | null {
  try {
    const v = new URLSearchParams(search).get(PIN_PARAM)?.trim().toLowerCase();
    return v === 'a' || v === 'b' || v === 'off' ? v : null;
  } catch {
    return null;
  }
}

/** The arm stored in the cookie string, or null when it's missing or malformed. */
export function readArm(cookieString: string, id: string): Arm | null {
  try {
    const name = cookieName(id);
    for (const part of (cookieString || '').split(';')) {
      const eq = part.indexOf('=');
      if (eq < 0) continue;
      if (part.slice(0, eq).trim() !== name) continue;
      let value = part.slice(eq + 1).trim();
      try {
        value = decodeURIComponent(value);
      } catch {
        return null;
      }
      return value === 'control' || value === 'variant' ? value : null;
    }
  } catch {
    // fall through
  }
  return null;
}

export interface Decision {
  arm: Arm;
  source: ArmSource;
  /** Cookie action for the caller: write the arm, clear it, or leave it alone. */
  cookie: 'write' | 'clear' | 'none';
}

export interface DecideInput {
  experiment: ExperimentConfig;
  search: string;
  cookieString: string;
  /** Whether arm B can actually render for this page (see canRenderLayout). */
  variantRenderable: boolean;
  random?: () => number;
}

export function decideArm({ experiment, search, cookieString, variantRenderable, random = Math.random }: DecideInput): Decision {
  let decision: Decision;
  try {
    const pin = readPin(search);
    const pct = variantPercent(experiment);
    if (pin) {
      // QA pins never write a cookie; "off" clears it.
      decision = { arm: pin === 'b' ? 'variant' : 'control', source: 'pin', cookie: pin === 'off' ? 'clear' : 'none' };
    } else if (pct <= 0 || pct >= 100) {
      decision = { arm: pct >= 100 ? 'variant' : 'control', source: 'forced', cookie: 'write' };
    } else {
      const stored = readArm(cookieString, experiment.id);
      if (stored) {
        decision = { arm: stored, source: 'cookie', cookie: 'none' };
      } else {
        let r = 0.5;
        try {
          r = random();
        } catch {
          // keep the midpoint
        }
        decision = { arm: r * 100 < pct ? 'variant' : 'control', source: 'roll', cookie: 'write' };
      }
    }
  } catch {
    decision = { arm: 'control', source: 'fallback', cookie: 'none' };
  }
  // A variant that can't render is served and reported as control.
  if (decision.arm === 'variant' && !variantRenderable) {
    return { arm: 'control', source: 'fallback', cookie: decision.cookie === 'write' ? 'none' : decision.cookie };
  }
  return decision;
}

export function armCookie(id: string, arm: Arm): string {
  const maxAge = COOKIE_DAYS * 24 * 60 * 60;
  // Not HttpOnly: GTM reads it as a first-party cookie variable.
  return `${cookieName(id)}=${arm}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

export function clearArmCookie(id: string): string {
  return `${cookieName(id)}=; Max-Age=0; Path=/; SameSite=Lax`;
}

/** The query string without the QA pin, or null when there was nothing to strip. */
export function stripPin(search: string): string | null {
  try {
    const params = new URLSearchParams(search);
    if (!params.has(PIN_PARAM)) return null;
    params.delete(PIN_PARAM);
    const s = params.toString();
    return s ? `?${s}` : '';
  } catch {
    return null;
  }
}
