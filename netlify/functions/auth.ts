// GET /api/auth: starts the GitHub login for Decap CMS (see netlify/lib/oauth.ts).

import { credentials, newState } from '../lib/oauth';

export default async function handler(req: Request): Promise<Response> {
  const creds = credentials();
  if (!creds) {
    return new Response('GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are not set on this site.', { status: 500 });
  }
  const url = new URL(req.url);
  const { state, cookie } = newState(creds.secret);
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', creds.id);
  authorize.searchParams.set('redirect_uri', `${url.origin}/api/callback`);
  authorize.searchParams.set('scope', url.searchParams.get('scope') || 'repo,user');
  authorize.searchParams.set('state', state);
  return new Response(null, {
    status: 302,
    headers: { Location: authorize.toString(), 'Set-Cookie': cookie, 'Cache-Control': 'no-store' },
  });
}
