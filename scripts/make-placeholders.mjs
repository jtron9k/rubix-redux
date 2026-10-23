#!/usr/bin/env node
// Writes labeled, brand-tinted SVG placeholders into public/images/uploads/ (plus public/favicon.svg).
// Everything stays local; there is no external placeholder service. Re-run after changing brand colors.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/images/uploads');
const settings = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/settings/business.json'), 'utf8'));
const primary = settings.brand?.primary || '#0d9488';
const accent = settings.brand?.accent || '#f59e0b';
const name = settings.businessName || 'Your Business';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function scene(w, h, label, sub = `${w}×${h} placeholder`) {
  const r = Math.min(w, h);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primary}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0.28"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#f8fafc"/>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <circle cx="${w * 0.82}" cy="${h * 0.2}" r="${r * 0.32}" fill="${accent}" fill-opacity="0.18"/>
  <circle cx="${w * 0.12}" cy="${h * 0.9}" r="${r * 0.42}" fill="${primary}" fill-opacity="0.14"/>
  <text x="50%" y="48%" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${Math.round(r * 0.09)}" font-weight="700" fill="#0f172a">${esc(label)}</text>
  <text x="50%" y="${48 + 9}%" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${Math.round(r * 0.045)}" fill="#475569">${esc(sub)}</text>
</svg>
`;
}

function logo() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="72" viewBox="0 0 320 72">
  <circle cx="36" cy="36" r="26" fill="${primary}"/>
  <circle cx="36" cy="36" r="11" fill="${accent}"/>
  <text x="74" y="46" font-family="system-ui, sans-serif" font-size="26" font-weight="700" fill="#0f172a">${esc(name)}</text>
</svg>
`;
}

function badge(label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <circle cx="80" cy="80" r="74" fill="#fff" stroke="${primary}" stroke-width="6"/>
  <circle cx="80" cy="80" r="60" fill="none" stroke="${accent}" stroke-width="2" stroke-dasharray="4 4"/>
  <text x="80" y="76" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="#0f172a">SAMPLE</text>
  <text x="80" y="98" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="#475569">${esc(label)}</text>
</svg>
`;
}

function favicon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="${primary}"/><circle cx="32" cy="32" r="12" fill="${accent}"/></svg>
`;
}

const files = {
  'placeholder-hero.svg': scene(1600, 900, 'Hero image'),
  'placeholder-team.svg': scene(800, 600, 'Team photo'),
  'placeholder-city.svg': scene(800, 600, 'City photo'),
  'placeholder-og.svg': scene(1200, 630, name, 'Share card placeholder (1200×630)'),
  'placeholder-logo.svg': logo(),
  'placeholder-badge-1.svg': badge('Award'),
  'placeholder-badge-2.svg': badge('Certified'),
};
for (const [slug, label] of [
  ['date-night', 'Date night'],
  ['after-school', 'After school'],
  ['overnight', 'Overnight'],
  ['last-minute', 'Last minute'],
  ['special-needs', 'Special needs'],
  ['event', 'Event care'],
]) {
  files[`placeholder-service-${slug}.svg`] = scene(800, 600, label);
}

fs.mkdirSync(OUT, { recursive: true });
for (const [file, svg] of Object.entries(files)) fs.writeFileSync(path.join(OUT, file), svg);
fs.writeFileSync(path.join(ROOT, 'public/favicon.svg'), favicon());
console.log(`Wrote ${Object.keys(files).length} placeholders to public/images/uploads/ and public/favicon.svg`);
