#!/usr/bin/env node
// Prebuild: writes netlify/edge-functions/og-manifest.json, { "<slug>": { title, description, image } },
// from every page with template tokens resolved. The og-meta edge function serves it to link
// unfurlers. CMS saves trigger a rebuild, so it never drifts from the content.

import fs from 'node:fs';
import path from 'node:path';
import { applyTemplates, buildTokens, normalizeSlug, resolveSite } from '../shared/content-core.mjs';
import { loadContent, ROOT } from './lib/load-content.mjs';

const OUT = path.join(ROOT, 'netlify/edge-functions/og-manifest.json');

const { settings, groups, pages } = loadContent();
const groupList = groups.map((g) => g.data);
const manifest = {};

for (const { data: page } of pages) {
  if (!page?.slug) continue;
  const site = resolveSite(settings, groupList, page.slug);
  const meta = applyTemplates(page.meta ?? {}, buildTokens(site));
  manifest[normalizeSlug(page.slug)] = {
    title: meta.title || site.metaDefaults?.title || settings.businessName,
    description: meta.description || site.metaDefaults?.description || settings.tagline || '',
    image: meta.image || settings.defaultOgImage || '',
  };
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
console.log(`og-manifest: ${Object.keys(manifest).length} pages -> ${path.relative(ROOT, OUT)}`);
