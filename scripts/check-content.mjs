#!/usr/bin/env node
// Content gate for CI and for editors. Errors fail the run; warnings flag go-live leftovers such as
// placeholder images and the sample business. `--strict` fails on warnings too.
//
//   npm run check:content
//   npm run check:content -- --strict

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyTemplates,
  buildTokens,
  canRenderLayout,
  findStrayTokens,
  firstSegment,
  HEX_COLOR_PATTERN,
  isBlank,
  isValidGroupKey,
  isValidGtmId,
  LAYOUT_KEYS,
  normalizeSlug,
  resolveSite,
  SLUG_PATTERN,
  slugToFileName,
} from '../shared/content-core.mjs';
import { loadContent, ROOT } from './lib/load-content.mjs';

export const SAMPLE_BUSINESS_NAME = 'Brightside Sitters';
const SAMPLE_REVIEW = /^Sample parent\b/;
const PLACEHOLDER_IMAGE = /\/placeholder-[^"'\s]*$/;

/** Options of a Decap select field, found by its `name:`. Handles flow (`options: [a, b]`) lists. */
export function selectOptions(yml, fieldName) {
  const m = new RegExp(`name:\\s*${fieldName}\\b`).exec(yml);
  if (!m) return null;
  const rest = yml.slice(m.index, m.index + 600);
  const opts = /options:\s*\[([^\]]*)\]/.exec(rest);
  if (!opts) return null;
  return opts[1]
    .split(',')
    .map((s) => s.trim().replace(/^(['"])(.*)\1$/, '$2'))
    .filter(Boolean);
}

/** Keys of the iconMap object literal in src/content/iconMap.ts. */
export function iconMapNames(source) {
  const block = /iconMap[^=]*=\s*\{([\s\S]*?)\n\};/.exec(source);
  if (!block) return [];
  return [...block[1].matchAll(/^\s*'?([a-z0-9-]+)'?\s*:/gm)].map((m) => m[1]);
}

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const diff = (a, b) => a.filter((x) => !b.includes(x));

function parseDate(value, endOfDay = false) {
  const s = String(value).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
    const date = endOfDay ? new Date(y, mo, d, 23, 59, 59, 999) : new Date(y, mo, d);
    return date.getMonth() === mo && date.getDate() === d ? date : null;
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : new Date(t);
}

/** Every `icon` value anywhere in a page, with its JSON path. */
function iconsIn(value, at = '', out = []) {
  if (Array.isArray(value)) value.forEach((v, i) => iconsIn(v, `${at}[${i}]`, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k === 'icon' && typeof v === 'string') out.push({ path: `${at}.${k}`.replace(/^\./, ''), name: v });
      else iconsIn(v, `${at}.${k}`, out);
    }
  }
  return out;
}

/** Image src strings anywhere in a value. */
function imagesIn(value, out = []) {
  if (typeof value === 'string') {
    if (PLACEHOLDER_IMAGE.test(value)) out.push(value);
  } else if (Array.isArray(value)) value.forEach((v) => imagesIn(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => imagesIn(v, out));
  return out;
}

/**
 * Pure check over loaded content. `groups` and `pages` are `{ file, data }[]`.
 * Returns `{ errors: string[], warnings: string[] }`.
 */
export function checkContent({ settings, groups, pages, configYml, iconNames, now = new Date() }) {
  const errors = [];
  const warnings = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

  // Registries kept in sync by hand: LAYOUT_KEYS, the Decap selects and the iconMap.
  for (const field of ['layout', 'variantLayout']) {
    const opts = selectOptions(configYml, field);
    if (!opts) err('public/admin/config.yml', `no options found for the ${field} select`);
    else if (!sameSet(opts, LAYOUT_KEYS)) {
      err('public/admin/config.yml', `${field} options must match LAYOUT_KEYS (missing: ${diff(LAYOUT_KEYS, opts).join(', ') || 'none'}; extra: ${diff(opts, LAYOUT_KEYS).join(', ') || 'none'})`);
    }
  }
  const iconOpts = selectOptions(configYml, 'icon');
  if (!iconOpts) err('public/admin/config.yml', 'no options found for the icon select');
  else if (!sameSet(iconOpts, iconNames)) {
    err('public/admin/config.yml', `icon options must match iconMap (missing: ${diff(iconNames, iconOpts).join(', ') || 'none'}; extra: ${diff(iconOpts, iconNames).join(', ') || 'none'})`);
  }

  // Settings.
  const sf = 'content/settings/business.json';
  if (isBlank(settings.businessName)) err(sf, 'businessName is blank');
  if (!isValidGtmId(settings.gtmId)) err(sf, `gtmId "${settings.gtmId}" must look like GTM-XXXXXXX or be blank`);
  for (const k of ['primary', 'accent']) {
    if (!HEX_COLOR_PATTERN.test(settings.brand?.[k] ?? '')) err(sf, `brand.${k} must be a 6-digit hex color`);
  }
  if (!settings.setupComplete) warn(sf, 'setupComplete is false; run `npm run setup` or open /setup in dev');
  if (settings.businessName === SAMPLE_BUSINESS_NAME) warn(sf, `still uses the sample business name "${SAMPLE_BUSINESS_NAME}"`);
  for (const img of new Set(imagesIn(settings))) warn(sf, `uses placeholder image ${img}`);

  // Groups.
  const groupKeys = new Set();
  for (const { file, data: g } of groups) {
    if (!isValidGroupKey(g.key ?? '')) err(file, `key "${g.key}" must be lowercase letters, numbers and hyphens, and not reserved`);
    else if (groupKeys.has(g.key)) err(file, `duplicate group key "${g.key}"`);
    else if (path.basename(file, '.json') !== g.key) err(file, `file name should be ${g.key}.json to match its key`);
    groupKeys.add(g.key);
    if (isBlank(g.name)) err(file, 'name is blank');
  }
  const groupList = groups.map((g) => g.data);

  // Pages.
  const slugs = new Map();
  for (const { file, data: p } of pages) {
    const slug = p?.slug;
    if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) {
      err(file, `slug "${slug}" must look like / or /group/page-name (lowercase, hyphens)`);
      continue;
    }
    if (slugs.has(slug)) err(file, `duplicate slug ${slug} (also in ${slugs.get(slug)})`);
    slugs.set(slug, file);
  }

  for (const { file, data: p } of pages) {
    if (typeof p?.slug !== 'string' || !SLUG_PATTERN.test(p.slug)) continue;
    const seg = firstSegment(p.slug);
    if (seg && !groupKeys.has(seg)) err(file, `first path segment "/${seg}" is not a page group; add content/groups/${seg}.json or move the page`);
    if (path.basename(file, '.json') !== slugToFileName(p.slug)) {
      warn(file, `file name differs from the one the CMS would use (${slugToFileName(p.slug)}.json)`);
    }

    if (!LAYOUT_KEYS.includes(p.layout)) err(file, `layout "${p.layout}" is not one of ${LAYOUT_KEYS.join(', ')}`);
    else if (!canRenderLayout(p, p.layout)) {
      err(file, p.layout === 'lead-form' ? 'lead-form pages need form.fields' : p.layout === 'campaign' ? 'campaign pages need coupons' : `cannot render ${p.layout}`);
    }

    const exp = p.experiment;
    if (exp && !isBlank(exp.id)) {
      if (!isBlank(exp.variantSlug)) {
        const v = normalizeSlug(exp.variantSlug);
        if (!slugs.has(v)) err(file, `experiment.variantSlug ${exp.variantSlug} is not a page`);
        else if (v === normalizeSlug(p.slug)) err(file, 'experiment.variantSlug points at the page itself');
      }
      if (!isBlank(exp.variantLayout)) {
        if (!LAYOUT_KEYS.includes(exp.variantLayout)) err(file, `experiment.variantLayout "${exp.variantLayout}" is not a layout`);
        else if (!canRenderLayout(p, exp.variantLayout)) err(file, `experiment.variantLayout ${exp.variantLayout} can't render this page, so every visitor would get control`);
      }
      if (isBlank(exp.variantSlug) && isBlank(exp.variantLayout)) warn(file, `experiment ${exp.id} has no variant, so it is off`);
      const pct = exp.variantPercent;
      if (!isBlank(pct) && !(Number(pct) >= 0 && Number(pct) <= 100)) err(file, 'experiment.variantPercent must be 0 to 100');
    }

    for (const { path: at, name } of iconsIn(p)) {
      if (!iconNames.includes(name)) err(file, `${at} icon "${name}" is not in src/content/iconMap.ts`);
    }

    for (const key of ['coupons', 'announcements', 'promoAds']) {
      (p[key] ?? []).forEach((entry, i) => {
        const starts = isBlank(entry.startsAt) ? null : parseDate(entry.startsAt);
        const expires = isBlank(entry.expiresAt) ? null : parseDate(entry.expiresAt, true);
        if (!isBlank(entry.startsAt) && !starts) err(file, `${key}[${i}].startsAt "${entry.startsAt}" is not a date`);
        if (!isBlank(entry.expiresAt) && !expires) err(file, `${key}[${i}].expiresAt "${entry.expiresAt}" is not a date`);
        if (starts && expires && starts > expires) err(file, `${key}[${i}] starts after it expires`);
      });
    }
    if (!isBlank(p.campaignEndsAt)) {
      const ends = parseDate(p.campaignEndsAt, true);
      if (!ends) err(file, `campaignEndsAt "${p.campaignEndsAt}" is not a date`);
      else if (ends <= now) warn(file, `campaign ended ${p.campaignEndsAt}; the page now redirects to its group home`);
    }

    const site = resolveSite(settings, groupList, p.slug);
    const stray = findStrayTokens(applyTemplates(p, buildTokens(site)));
    if (stray.length) err(file, `unknown template tokens: ${stray.map((t) => `{{${t}}}`).join(', ')}`);

    const placeholders = new Set(imagesIn(p));
    if (placeholders.size) warn(file, `uses ${placeholders.size} placeholder image${placeholders.size === 1 ? '' : 's'}`);
    if ((p.reviews?.items ?? []).some((r) => SAMPLE_REVIEW.test(r.name ?? ''))) warn(file, 'still has sample reviews');
    if (JSON.stringify(p).includes(SAMPLE_BUSINESS_NAME)) warn(file, `mentions the sample business "${SAMPLE_BUSINESS_NAME}"`);
  }

  return { errors, warnings };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const strict = process.argv.includes('--strict');
  const { settings, groups, pages } = loadContent();
  const { errors, warnings } = checkContent({
    settings,
    groups,
    pages,
    configYml: fs.readFileSync(path.join(ROOT, 'public/admin/config.yml'), 'utf8'),
    iconNames: iconMapNames(fs.readFileSync(path.join(ROOT, 'src/content/iconMap.ts'), 'utf8')),
  });
  for (const w of warnings) console.log(`warn   ${w}`);
  for (const e of errors) console.log(`error  ${e}`);
  console.log(`check-content: ${pages.length} pages, ${groups.length} groups, ${errors.length} errors, ${warnings.length} warnings`);
  if (errors.length || (strict && warnings.length)) process.exitCode = 1;
}
