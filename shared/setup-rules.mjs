// Validation for first-time setup answers. Pure, so the browser wizard checks each step with the
// same rules scripts/lib/setup-core.mjs enforces before it writes anything.

import { HEX_COLOR_PATTERN, isBlank, isValidGroupKey, isValidGtmId, phoneDigits, RESERVED_GROUP_KEYS } from './content-core.mjs';

export const REPO_PATTERN = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;

const str = (v) => String(v ?? '').trim();

function isHttpUrl(v, { httpsOnly = false } = {}) {
  try {
    const u = new URL(str(v));
    return httpsOnly ? u.protocol === 'https:' : u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Per-field checks. Each returns an error message, or '' when the value is fine. */
export const fieldRules = {
  businessName: (v) => (isBlank(v) ? 'Enter the business name.' : ''),
  phone: (v) => (phoneDigits(v).length === 10 ? '' : 'Enter a 10-digit US phone number, e.g. (555) 010-0100.'),
  optionalPhone: (v) => (isBlank(v) || phoneDigits(v).length === 10 ? '' : 'Enter a 10-digit phone number, or leave it blank to use the main number.'),
  email: (v) => (isBlank(v) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(v)) ? '' : 'Enter a valid email address, or leave it blank.'),
  color: (v) => (HEX_COLOR_PATTERN.test(str(v)) ? '' : 'Use a 6-digit hex color such as #0d9488.'),
  logoSrc: (v) => (isBlank(v) || str(v).startsWith('/') || isHttpUrl(v) ? '' : 'Use an uploads path such as /images/uploads/logo.svg, or a full URL.'),
  gtmId: (v) => (isValidGtmId(v) ? '' : 'Use the container ID from Tag Manager, e.g. GTM-ABC1234, or leave it blank.'),
  webhookUrl: (v) => (isBlank(v) || isHttpUrl(v, { httpsOnly: true }) ? '' : 'Use an https:// URL, or leave it blank to use Netlify Forms.'),
  consentText: (v) => (isBlank(v) ? 'Enter the consent text shown under lead forms.' : ''),
  repo: (v) => (REPO_PATTERN.test(str(v)) ? '' : 'Use owner/name, e.g. your-name/your-site.'),
  siteUrl: (v) => (isHttpUrl(v) ? '' : 'Use the full site URL, e.g. https://your-site.netlify.app.'),
  groupKey: (v) => {
    const k = str(v);
    if (RESERVED_GROUP_KEYS.includes(k)) return `"${k}" is reserved. Pick another key.`;
    return isValidGroupKey(k) ? '' : 'Use lowercase letters, numbers and hyphens, e.g. austin or north-side.';
  },
  groupName: (v) => (isBlank(v) ? 'Enter a display name.' : ''),
};

/** Validate one group list. Errors are keyed `groups.<index>.<field>`. */
export function validateGroups(groups) {
  const errors = {};
  const seen = new Set();
  (groups ?? []).forEach((g, i) => {
    const keyErr = fieldRules.groupKey(g.key);
    if (keyErr) errors[`groups.${i}.key`] = keyErr;
    else if (seen.has(str(g.key))) errors[`groups.${i}.key`] = `Another group already uses "${str(g.key)}".`;
    seen.add(str(g.key));
    const nameErr = fieldRules.groupName(g.name);
    if (nameErr) errors[`groups.${i}.name`] = nameErr;
    const phoneErr = fieldRules.optionalPhone(g.phone);
    if (phoneErr) errors[`groups.${i}.phone`] = phoneErr;
  });
  return errors;
}

/** Validate a full set of answers. Returns `{ "<section>.<field>": message }`, empty when valid. */
export function validateAnswers(a) {
  const errors = {};
  const check = (path, rule, value) => {
    const msg = fieldRules[rule](value);
    if (msg) errors[path] = msg;
  };
  check('business.businessName', 'businessName', a?.business?.businessName);
  check('business.phone', 'phone', a?.business?.phone);
  check('business.email', 'email', a?.business?.email);
  check('brand.primary', 'color', a?.brand?.primary);
  check('brand.accent', 'color', a?.brand?.accent);
  check('brand.logoSrc', 'logoSrc', a?.brand?.logoSrc);
  check('tracking.gtmId', 'gtmId', a?.tracking?.gtmId);
  check('leads.webhookUrl', 'webhookUrl', a?.leads?.webhookUrl);
  check('leads.consentText', 'consentText', a?.leads?.consentText);
  check('publishing.repo', 'repo', a?.publishing?.repo);
  check('publishing.siteUrl', 'siteUrl', a?.publishing?.siteUrl);
  Object.assign(errors, validateGroups(a?.groups));
  return errors;
}
