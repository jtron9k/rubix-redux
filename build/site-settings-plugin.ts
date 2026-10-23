import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { applySetup, planSetup, readState, SetupValidationError } from '../scripts/lib/setup-core.mjs';
import { GTM_ID_PATTERN } from '../shared/content-core.mjs';
import { themeCss } from '../shared/theme.mjs';
import type { BusinessSettings, PageContent } from '../src/content/types';

const ROOT = path.resolve(__dirname, '..');
const SETTINGS_FILE = path.join(ROOT, 'content/settings/business.json');
const PAGES_DIR = path.join(ROOT, 'content/pages');

// Swap these together with fontFamily in tailwind.config.js.
const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap';

/** Hidden fields every lead submission may carry, beyond the per-form fields. */
export const LEAD_META_FIELDS = [
  'page',
  'group',
  'form_id',
  'experiment_id',
  'experiment_arm',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'msclkid',
  'fbclid',
  'consent',
  'company',
];

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

export function readSettings(): BusinessSettings {
  return readJson<BusinessSettings>(SETTINGS_FILE);
}

function readPages(): PageContent[] {
  if (!fs.existsSync(PAGES_DIR)) return [];
  return fs
    .readdirSync(PAGES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => readJson<PageContent>(path.join(PAGES_DIR, f)));
}

function absoluteUrl(siteUrl: string, src: string): string {
  if (!src) return '';
  if (/^https?:\/\//.test(src)) return src;
  return `${siteUrl.replace(/\/$/, '')}${src.startsWith('/') ? '' : '/'}${src}`;
}

function headTags(s: BusinessSettings): string {
  const title = s.metaDefaults?.title || s.businessName;
  const description = s.metaDefaults?.description || s.tagline;
  const image = absoluteUrl(s.siteUrl || '', s.defaultOgImage || '');
  const gtm = GTM_ID_PATTERN.test(s.gtmId ?? '') ? s.gtmId : '';
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    // The og-meta edge function can only replace tags that exist, so the full set is always written.
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(s.businessName)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:url" content="${esc(s.siteUrl)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    s.noindex ? `<meta name="robots" content="noindex, nofollow" />` : '',
    `<meta name="theme-color" content="${esc(s.brand?.primary || '#2563eb')}" />`,
    `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />`,
    `<link rel="preconnect" href="https://fonts.googleapis.com" />`,
    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />`,
    `<link rel="stylesheet" href="${FONTS_HREF}" />`,
    `<style id="brand-theme">${themeCss(s.brand)}</style>`,
  ];
  if (gtm) {
    tags.push(
      `<script>window.dataLayer=window.dataLayer||[];(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');</script>`,
    );
  }
  return tags.filter(Boolean).join('\n    ');
}

/** Field names across every page form, plus the shared tracking fields. */
export function leadFieldNames(pages: PageContent[]): string[] {
  const names = new Set<string>();
  for (const p of pages) for (const f of p.form?.fields ?? []) if (f.name) names.add(f.name);
  for (const n of LEAD_META_FIELDS) names.add(n);
  return [...names];
}

function bodyTags(s: BusinessSettings, pages: PageContent[]): string {
  const gtm = GTM_ID_PATTERN.test(s.gtmId ?? '') ? s.gtmId : '';
  const parts: string[] = [];
  if (gtm) {
    parts.push(
      `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtm}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`,
    );
  }
  // Static form so Netlify's build-time form detection registers "lead" for the Forms fallback.
  const inputs = leadFieldNames(pages)
    .map((n) => `<input type="text" name="${esc(n)}" />`)
    .join('');
  parts.push(
    `<form name="lead" data-netlify="true" netlify-honeypot="company" hidden><input type="hidden" name="form-name" value="lead" />${inputs}</form>`,
  );
  return parts.join('\n    ');
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

/**
 * Dev-only API for the /setup wizard. GET /__setup/state returns the current answers;
 * POST /__setup/save with `{ answers, dryRun? }` validates and (unless dryRun) writes through setup-core.
 * Requiring a JSON content type means a cross-site page can't post here without a CORS preflight.
 */
// A setup save rewrites business.json; skip the reload that would wipe the wizard's checklist.
// Its "View the site" link is a full page load, so index.html still picks up the new settings.
let skipReloadUntil = 0;

async function setupApi(req: IncomingMessage, res: ServerResponse) {
  try {
    if (req.method === 'GET' && req.url === '/state') return sendJson(res, 200, readState());
    if (req.method === 'POST' && req.url === '/save') {
      if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) {
        return sendJson(res, 415, { error: 'Expected application/json.' });
      }
      const { answers, dryRun } = (await readBody(req)) as { answers: Parameters<typeof planSetup>[0]; dryRun?: boolean };
      if (dryRun) {
        const plan = planSetup(answers);
        const changes = plan.changes.map(({ path: p, action }) => ({ path: p, action }));
        return sendJson(res, Object.keys(plan.errors).length ? 422 : 200, { ...plan, changes });
      }
      skipReloadUntil = Date.now() + 3000;
      return sendJson(res, 200, { errors: {}, ...applySetup(answers) });
    }
    return sendJson(res, 404, { error: 'Not found.' });
  } catch (err) {
    if (err instanceof SetupValidationError) return sendJson(res, 422, { errors: err.errors });
    return sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
  }
}

export function siteSettingsPlugin(): Plugin {
  return {
    name: 'site-settings',
    transformIndexHtml(html) {
      const s = readSettings();
      return html.replace('<!--site-head-->', headTags(s)).replace('<!--site-body-->', bodyTags(s, readPages()));
    },
    configureServer(server) {
      server.middlewares.use('/__setup', (req, res) => void setupApi(req, res));
      // index.html is built from business.json, so a settings change needs a full reload.
      server.watcher.add(SETTINGS_FILE);
      server.watcher.on('change', (file) => {
        if (path.resolve(file) === SETTINGS_FILE && Date.now() > skipReloadUntil) server.ws.send({ type: 'full-reload' });
      });
    },
  };
}
