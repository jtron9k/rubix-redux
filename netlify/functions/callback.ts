// GET /api/callback: GitHub redirects here; trade the code for a token and hand it to Decap.

import { credentials, handshakePage, verifyState } from '../lib/oauth';

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const origin = url.origin;
  const creds = credentials();
  if (!creds) return handshakePage(origin, 'error', { message: 'OAuth is not configured on this site.' });

  if (!verifyState(req.headers.get('cookie'), url.searchParams.get('state'), creds.secret)) {
    return handshakePage(origin, 'error', { message: 'State mismatch. Start the login again from /admin.' });
  }
  const code = url.searchParams.get('code');
  if (!code) return handshakePage(origin, 'error', { message: url.searchParams.get('error_description') || 'No code returned.' });

  try {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: creds.id, client_secret: creds.secret, code, redirect_uri: `${origin}/api/callback` }),
    });
    const data = (await res.json()) as { access_token?: string; error_description?: string };
    if (!data.access_token) return handshakePage(origin, 'error', { message: data.error_description || 'GitHub did not return a token.' });
    return handshakePage(origin, 'success', { token: data.access_token, provider: 'github' });
  } catch {
    return handshakePage(origin, 'error', { message: 'Could not reach GitHub.' });
  }
}
