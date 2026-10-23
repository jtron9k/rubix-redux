// The only writer for first-time setup. `npm run setup` and the dev wizard's /__setup API both call
// readState() and applySetup(); every write is checked against WRITABLE before it happens.

import fs from 'node:fs';
import path from 'node:path';
import { firstSegment, isBlank, normalizeSlug, slugToFileName } from '../../shared/content-core.mjs';
import { validateAnswers } from '../../shared/setup-rules.mjs';
import { patchConfig } from './admin-config.mjs';
import { ROOT } from './load-content.mjs';

const SETTINGS = 'content/settings/business.json';
const GROUPS_DIR = 'content/groups';
const PAGES_DIR = 'content/pages';
const ADMIN_CONFIG = 'public/admin/config.yml';
const ENV_FILE = '.env';
const GROUP_TEMPLATE = 'scripts/templates/group-home.json';

const WRITABLE = [
  /^content\/settings\/business\.json$/,
  /^content\/groups\/[a-z0-9-]+\.json$/,
  /^content\/pages\/[a-z0-9-]+\.json$/,
  /^public\/admin\/config\.yml$/,
  /^\.env$/,
];

export class SetupValidationError extends Error {
  constructor(errors) {
    super(`Setup answers are invalid: ${Object.values(errors).join(' ')}`);
    this.name = 'SetupValidationError';
    this.errors = errors;
  }
}

const str = (v) => String(v ?? '').trim();

function readJson(root, rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

function readText(root, rel) {
  const abs = path.join(root, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
}

function listJson(root, dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ file: `${dir}/${f}`, data: readJson(root, `${dir}/${f}`) }));
}

function yamlValue(yml, key) {
  const m = new RegExp(`^\\s+${key}:\\s*(.*)$`, 'm').exec(yml ?? '');
  return m ? m[1].trim() : '';
}

function envValue(env, key) {
  const m = new RegExp(`^${key}=(.*)$`, 'm').exec(env ?? '');
  return m ? m[1].trim().replace(/^(['"])(.*)\1$/, '$2') : '';
}

/** Set or remove one KEY=value line, keeping every other line as it was. */
export function setEnvLine(env, key, value) {
  const lines = (env ?? '').split('\n').filter((l, i, all) => !(i === all.length - 1 && l === ''));
  const kept = lines.filter((l) => !l.startsWith(`${key}=`));
  if (!isBlank(value)) kept.push(`${key}=${value}`);
  return kept.length ? `${kept.join('\n')}\n` : '';
}

/** Current answers, used as defaults by the wizard and the CLI. */
export function readState({ root = ROOT } = {}) {
  const s = readJson(root, SETTINGS);
  const yml = readText(root, ADMIN_CONFIG);
  const env = readText(root, ENV_FILE);
  return {
    setupComplete: Boolean(s.setupComplete),
    answers: {
      business: {
        businessName: s.businessName ?? '',
        tagline: s.tagline ?? '',
        phone: s.phone ?? '',
        email: s.email ?? '',
        address: s.address ?? '',
        hoursText: s.hoursText ?? '',
        serviceAreaText: s.serviceAreaText ?? '',
        licenseText: s.licenseText ?? '',
        metaTitle: s.metaDefaults?.title ?? '',
        metaDescription: s.metaDefaults?.description ?? '',
      },
      brand: {
        primary: s.brand?.primary ?? '',
        accent: s.brand?.accent ?? '',
        logoSrc: s.logo?.src ?? '',
        logoAlt: s.logo?.alt ?? '',
      },
      tracking: { gtmId: s.gtmId ?? '', noindex: s.noindex !== false },
      leads: { webhookUrl: envValue(env, 'LEAD_WEBHOOK_URL'), consentText: s.consentText ?? '' },
      groups: listJson(root, GROUPS_DIR).map(({ data: g }) => ({
        key: g.key ?? '',
        previousKey: g.key ?? '',
        name: g.name ?? '',
        regionName: g.regionName ?? '',
        stateAbbr: g.stateAbbr ?? '',
        phone: g.phone ?? '',
      })),
      publishing: { repo: yamlValue(yml, 'repo'), siteUrl: s.siteUrl || yamlValue(yml, 'base_url') },
    },
  };
}

/** Assign `value`, or delete the key when it's blank, so blank optional fields don't linger as "". */
function setOptional(obj, key, value) {
  if (isBlank(value)) delete obj[key];
  else obj[key] = str(value);
}

function nextSettings(current, a) {
  const b = a.business;
  const s = { ...current, setupComplete: true };
  s.businessName = str(b.businessName);
  s.tagline = str(b.tagline);
  s.phone = str(b.phone);
  s.email = str(b.email);
  s.address = str(b.address);
  s.hoursText = str(b.hoursText);
  s.serviceAreaText = str(b.serviceAreaText);
  setOptional(s, 'licenseText', b.licenseText);
  s.logo = { ...current.logo, src: str(a.brand.logoSrc), alt: str(a.brand.logoAlt) || str(b.businessName) };
  s.brand = { ...current.brand, primary: str(a.brand.primary).toLowerCase(), accent: str(a.brand.accent).toLowerCase() };
  s.gtmId = str(a.tracking.gtmId);
  s.siteUrl = str(a.publishing.siteUrl).replace(/\/$/, '');
  s.metaDefaults = {
    ...current.metaDefaults,
    title: str(b.metaTitle) || str(b.businessName),
    description: str(b.metaDescription) || str(b.tagline),
  };
  s.noindex = Boolean(a.tracking.noindex);
  s.consentText = str(a.leads.consentText);
  return s;
}

function nextGroup(current, g) {
  const out = { ...current, key: str(g.key), name: str(g.name), regionName: str(g.regionName) || str(g.name) };
  setOptional(out, 'stateAbbr', g.stateAbbr && str(g.stateAbbr).toUpperCase());
  setOptional(out, 'phone', g.phone);
  return out;
}

/** Rewrite every internal path under /from (slugs, variantSlug, hrefs) to /to, deep. */
function movePaths(value, from, to) {
  if (typeof value === 'string') {
    return value.startsWith(`/${from}`) && /^$|^[/?#]/.test(value.slice(from.length + 1))
      ? `/${to}${value.slice(from.length + 1)}`
      : value;
  }
  if (Array.isArray(value)) return value.map((v) => movePaths(v, from, to));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, movePaths(v, from, to)]));
  }
  return value;
}

const json = (data) => `${JSON.stringify(data, null, 2)}\n`;

/**
 * Work out every file change for a set of answers without touching disk.
 * Returns `{ errors, changes: [{ path, action: 'create'|'update'|'delete', content? }], checklist }`.
 */
export function planSetup(answers, { root = ROOT } = {}) {
  const errors = validateAnswers(answers);
  if (Object.keys(errors).length) return { errors, changes: [], checklist: [] };

  const files = new Map(); // path -> content, or null to delete
  const write = (rel, content) => files.set(rel, content);
  const notes = [];

  write(SETTINGS, json(nextSettings(readJson(root, SETTINGS), answers)));

  // Groups: renames move the group file and every page under its prefix; removals delete both.
  // Removals run first, so a group renamed onto a removed group's key keeps its moved pages.
  const existingGroups = new Map(listJson(root, GROUPS_DIR).map(({ file, data }) => [data.key, { file, data }]));
  let pages = listJson(root, PAGES_DIR);
  const kept = new Set(answers.groups.map((g) => str(g.previousKey)).filter((k) => existingGroups.has(k)));
  for (const [key, { file }] of existingGroups) {
    if (kept.has(key)) continue;
    write(file, null);
    pages = pages.filter((p) => {
      if (firstSegment(p.data.slug) !== key) return true;
      write(p.file, null);
      return false;
    });
    notes.push(`Removed /${key} and its pages. Remove any links to it from other pages.`);
  }
  for (const g of answers.groups) {
    const key = str(g.key);
    const prev = str(g.previousKey);
    const existing = prev ? existingGroups.get(prev) : undefined;
    if (existing && prev !== key) {
      write(existing.file, null);
      pages = pages.map((p) => {
        const data = movePaths(p.data, prev, key);
        if (JSON.stringify(data) === JSON.stringify(p.data)) return p;
        const file = `${PAGES_DIR}/${slugToFileName(data.slug)}.json`;
        if (file !== p.file) write(p.file, null);
        write(file, json(data));
        return { file, data };
      });
      notes.push(`Renamed /${prev} to /${key}, with its pages and every link to them.`);
    }
    write(`${GROUPS_DIR}/${key}.json`, json(nextGroup(existing?.data ?? {}, g)));
    if (!existing) {
      const home = pages.find((p) => normalizeSlug(p.data.slug) === `/${key}`);
      if (!home) {
        const tpl = readJson(fs.existsSync(path.join(root, GROUP_TEMPLATE)) ? root : ROOT, GROUP_TEMPLATE);
        const file = `${PAGES_DIR}/${slugToFileName(`/${key}`)}.json`;
        write(file, json({ ...tpl, slug: `/${key}` }));
        pages.push({ file, data: { ...tpl, slug: `/${key}` } });
      }
      notes.push(`Added /${key}. Its page starts from the group template; edit it in /admin and link to it from your home page.`);
    }
  }

  const yml = readText(root, ADMIN_CONFIG);
  if (yml !== null) {
    write(ADMIN_CONFIG, patchConfig(yml, { repo: str(answers.publishing.repo), baseUrl: str(answers.publishing.siteUrl) }));
  }

  const env = readText(root, ENV_FILE);
  const webhook = str(answers.leads.webhookUrl);
  if (env !== null || webhook) write(ENV_FILE, setEnvLine(env, 'LEAD_WEBHOOK_URL', webhook));

  const changes = [];
  for (const [rel, content] of files) {
    if (!WRITABLE.some((re) => re.test(rel))) throw new Error(`setup-core refused to write outside its whitelist: ${rel}`);
    const before = readText(root, rel);
    if (content === null) {
      if (before !== null) changes.push({ path: rel, action: 'delete' });
    } else if (before === null) changes.push({ path: rel, action: 'create', content });
    else if (before !== content) changes.push({ path: rel, action: 'update', content });
  }
  changes.sort((x, y) => x.path.localeCompare(y.path));

  return { errors: {}, changes, checklist: [...notes, ...finalChecklist(answers, webhook)] };
}

function finalChecklist(answers, webhook) {
  const site = str(answers.publishing.siteUrl).replace(/\/$/, '') || 'https://<your-site>';
  return [
    `Commit and push to GitHub (${str(answers.publishing.repo)}), then connect the repo in Netlify, or use the README's Deploy to Netlify button.`,
    `Create a GitHub OAuth App with the homepage ${site} and the callback ${site}/api/callback.`,
    `In Netlify, set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET${webhook ? ' and LEAD_WEBHOOK_URL (.env only covers netlify dev)' : ', plus LEAD_WEBHOOK_URL if you add a webhook later'}, then redeploy.`,
    webhook
      ? 'Send a test lead and confirm it reaches your webhook.'
      : 'Leads use Netlify Forms: turn on form notifications in Netlify under Forms > lead.',
  ];
}

/** Validate, then write. Throws SetupValidationError when the answers are invalid. */
export function applySetup(answers, { root = ROOT } = {}) {
  const plan = planSetup(answers, { root });
  if (Object.keys(plan.errors).length) throw new SetupValidationError(plan.errors);
  for (const c of plan.changes) {
    const abs = path.join(root, c.path);
    if (c.action === 'delete') fs.rmSync(abs);
    else {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, c.content);
    }
  }
  return { changes: plan.changes.map(({ path: p, action }) => ({ path: p, action })), checklist: plan.checklist };
}
