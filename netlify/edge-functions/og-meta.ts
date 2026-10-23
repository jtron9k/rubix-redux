// Per-page share cards. Link unfurlers don't run JavaScript, so this rewrites the <title>,
// description, og:* and twitter:* tags in index.html from og-manifest.json (written at prebuild
// by scripts/build-og-manifest.mjs). Only tags that already exist can be replaced, which is why
// build/site-settings-plugin.ts always writes the full set. Paths are scoped in netlify.toml.

import type { Context } from '@netlify/edge-functions';
import manifest from './og-manifest.json' with { type: 'json' };

interface ShareCard {
  title: string;
  description: string;
  image: string;
}

const cards = manifest as Record<string, ShareCard>;

function normalize(pathname: string): string {
  const p = pathname.toLowerCase().replace(/\/+$/, '');
  return p || '/';
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function setMeta(html: string, attr: 'name' | 'property', key: string, value: string): string {
  const re = new RegExp(`(<meta\\s+${attr}="${key.replace(/[.:]/g, '\\$&')}"\\s+content=")[^"]*(")`, 'i');
  return html.replace(re, `$1${esc(value)}$2`);
}

export function rewrite(html: string, card: ShareCard, origin: string, pathname: string): string {
  const image = /^https?:\/\//.test(card.image) ? card.image : card.image ? `${origin}${card.image.startsWith('/') ? '' : '/'}${card.image}` : '';
  let out = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(card.title)}</title>`);
  out = setMeta(out, 'name', 'description', card.description);
  out = setMeta(out, 'property', 'og:title', card.title);
  out = setMeta(out, 'property', 'og:description', card.description);
  out = setMeta(out, 'property', 'og:url', `${origin}${pathname}`);
  out = setMeta(out, 'name', 'twitter:title', card.title);
  out = setMeta(out, 'name', 'twitter:description', card.description);
  if (image) {
    out = setMeta(out, 'property', 'og:image', image);
    out = setMeta(out, 'name', 'twitter:image', image);
  }
  return out;
}

export default async function handler(req: Request, context: Context) {
  const url = new URL(req.url);
  const card = cards[normalize(url.pathname)];
  if (!card) return;
  const res = await context.next();
  if (!res.headers.get('content-type')?.includes('text/html')) return res;
  const html = rewrite(await res.text(), card, url.origin, url.pathname);
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  return new Response(html, { status: res.status, headers });
}
