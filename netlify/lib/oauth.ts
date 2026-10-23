// Shared pieces of the GitHub OAuth proxy that Decap CMS logs in through.
// The state is an HMAC-signed value in a short-lived HttpOnly cookie, so the callback can prove
// the login started here.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const STATE_COOKIE = 'decap_oauth_state';
export const STATE_MAX_AGE = 600;

export function credentials(): { id: string; secret: string } | null {
  const id = process.env.GITHUB_CLIENT_ID?.trim();
  const secret = process.env.GITHUB_CLIENT_SECRET?.trim();
  return id && secret ? { id, secret } : null;
}

function sign(state: string, secret: string): string {
  return createHmac('sha256', secret).update(state).digest('hex');
}

export function newState(secret: string): { state: string; cookie: string } {
  const state = randomBytes(24).toString('hex');
  const value = `${state}.${sign(state, secret)}`;
  return { state, cookie: `${STATE_COOKIE}=${value}; Max-Age=${STATE_MAX_AGE}; Path=/api; HttpOnly; Secure; SameSite=Lax` };
}

export const clearStateCookie = `${STATE_COOKIE}=; Max-Age=0; Path=/api; HttpOnly; Secure; SameSite=Lax`;

function readCookie(header: string | null, name: string): string | null {
  for (const part of (header ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** True when the state in the query matches the signed cookie. */
export function verifyState(cookieHeader: string | null, state: string | null, secret: string): boolean {
  const raw = readCookie(cookieHeader, STATE_COOKIE);
  if (!raw || !state) return false;
  const dot = raw.lastIndexOf('.');
  if (dot < 0) return false;
  const value = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  return safeEqual(sig, sign(value, secret)) && safeEqual(value, state);
}

/**
 * The popup page Decap expects: announce "authorizing:github", wait for the opener to answer,
 * then post `authorization:github:<status>:<json>` back to it. Only the site's own origin is answered.
 */
export function handshakePage(origin: string, status: 'success' | 'error', content: Record<string, string>): Response {
  const message = `authorization:github:${status}:${JSON.stringify(content)}`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Signing in…</title></head><body>
<p>${status === 'success' ? 'Signed in. This window will close.' : 'Sign-in failed. You can close this window and try again.'}</p>
<script>
(function () {
  var origin = ${JSON.stringify(origin)};
  var message = ${JSON.stringify(message)};
  function receive(e) {
    if (e.origin !== origin) return;
    window.removeEventListener('message', receive, false);
    window.opener.postMessage(message, e.origin);
  }
  if (!window.opener) return;
  window.addEventListener('message', receive, false);
  window.opener.postMessage('authorizing:github', origin);
})();
</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': clearStateCookie, 'Cache-Control': 'no-store' },
  });
}
