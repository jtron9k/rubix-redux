// Pure content rules shared by the app (via Vite), the build scripts and the setup writer.
// Plain ESM with a sibling .d.mts so Node can run it without a TypeScript step.

export const SLUG_PATTERN = /^\/$|^\/[a-z0-9-]+(\/[a-z0-9-]+)*$/;
export const GROUP_KEY_PATTERN = /^[a-z0-9-]+$/;
export const RESERVED_GROUP_KEYS = ['admin', 'api', 'setup', 'images', 'assets'];
export const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/;
export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
export const TEMPLATE_TOKENS = ['businessName', 'groupName', 'regionName', 'stateAbbr', 'groupSlug', 'phone'];
/** Owned by the review counter, never substituted by the templates. */
export const RUNTIME_TOKENS = ['reviewCount'];
export const DEFAULT_RAMP_MS = 4000;

/** Lowercase, no trailing slash, always a leading slash. */
export function normalizeSlug(path) {
  let s = String(path ?? '').trim().toLowerCase();
  const q = s.search(/[?#]/);
  if (q >= 0) s = s.slice(0, q);
  if (!s.startsWith('/')) s = `/${s}`;
  s = s.replace(/\/{2,}/g, '/');
  if (s.length > 1) s = s.replace(/\/+$/, '');
  return s || '/';
}

/** First path segment, or '' for the root. */
export function firstSegment(path) {
  return normalizeSlug(path).split('/')[1] ?? '';
}

/** File name Decap derives from the slug field: '/austin/date-night' -> 'austin-date-night'. */
export function slugToFileName(slug) {
  const s = normalizeSlug(slug);
  return s === '/' ? 'home' : s.slice(1).replace(/\//g, '-');
}

export function isBlank(v) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

/** Shallow-merge non-blank overrides onto a base object. */
export function mergeOverrides(base, overrides) {
  const out = { ...base };
  for (const [k, v] of Object.entries(overrides ?? {})) {
    if (isBlank(v)) continue;
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object') {
      out[k] = mergeOverrides(base[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Bind business settings to the group named by the first path segment. */
export function resolveSite(settings, groups, pathname) {
  const seg = firstSegment(pathname);
  const group = (seg && groups.find((g) => g.key === seg)) || null;
  if (!group) {
    return { ...settings, group: null, groupSlug: '', groupName: '', regionName: '', stateAbbr: '' };
  }
  const { key: _key, name, regionName, stateAbbr, metaDefaults, reviewCounter: _rc, ...overrides } = group;
  const merged = mergeOverrides(settings, overrides);
  if (metaDefaults) merged.metaDefaults = mergeOverrides(settings.metaDefaults, metaDefaults);
  return {
    ...merged,
    group,
    groupSlug: group.key,
    groupName: name ?? '',
    regionName: regionName ?? '',
    stateAbbr: stateAbbr ?? '',
  };
}

export function buildTokens(site) {
  return {
    businessName: site.businessName ?? '',
    groupName: site.groupName || site.regionName || '',
    regionName: site.regionName ?? '',
    stateAbbr: site.stateAbbr ?? '',
    groupSlug: site.groupSlug ?? '',
    phone: site.phone ?? '',
  };
}

const TOKEN_RE = /\{\{\s*([a-zA-Z]+)\s*\}\}/g;

export function applyTemplateString(str, tokens) {
  return str.replace(TOKEN_RE, (match, name) =>
    Object.prototype.hasOwnProperty.call(tokens, name) ? String(tokens[name]) : match,
  );
}

/** Deep-copy a value, substituting template tokens in every string. Unknown tokens are left in place. */
export function applyTemplates(value, tokens) {
  if (typeof value === 'string') return applyTemplateString(value, tokens);
  if (Array.isArray(value)) return value.map((v) => applyTemplates(v, tokens));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = applyTemplates(v, tokens);
    return out;
  }
  return value;
}

/** Tokens still present in a value, excluding runtime tokens such as {{reviewCount}}. */
export function findStrayTokens(value) {
  const found = new Set();
  const walk = (v) => {
    if (typeof v === 'string') {
      for (const m of v.matchAll(TOKEN_RE)) if (!RUNTIME_TOKENS.includes(m[1])) found.add(m[1]);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(value);
  return [...found];
}

function toCount(v) {
  if (isBlank(v)) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
}

/**
 * Settings, then group, then page. A target of 0 turns the counter off at that level;
 * blank or absent inherits from the level above.
 */
export function resolveReviewCounter(...levels) {
  let target = 0;
  let rampMs = DEFAULT_RAMP_MS;
  for (const level of levels) {
    if (!level) continue;
    const t = toCount(level.target);
    if (t !== undefined) target = t;
    const r = toCount(level.rampMs);
    if (r !== undefined) rampMs = r;
  }
  return { target, rampMs };
}

/** Digits of a display phone, without a leading US country code. */
export function phoneDigits(phone) {
  const d = String(phone ?? '').replace(/\D/g, '');
  return d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
}

export function telHref(phone) {
  const d = phoneDigits(phone);
  return d ? `tel:+1${d}` : '';
}

export function isValidGtmId(id) {
  return isBlank(id) || GTM_ID_PATTERN.test(String(id).trim());
}

export function isValidGroupKey(key) {
  return GROUP_KEY_PATTERN.test(key) && !RESERVED_GROUP_KEYS.includes(key);
}
