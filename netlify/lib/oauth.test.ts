import { beforeEach, describe, expect, it } from 'vitest';
import auth from '../functions/auth';
import callback from '../functions/callback';

beforeEach(() => {
  process.env.GITHUB_CLIENT_ID = 'cid';
  process.env.GITHUB_CLIENT_SECRET = 'shh';
});

async function start() {
  const res = await auth(new Request('https://site.test/api/auth?provider=github&scope=repo'));
  const location = new URL(res.headers.get('location') ?? '');
  const cookie = (res.headers.get('set-cookie') ?? '').split(';')[0];
  return { res, location, cookie, state: location.searchParams.get('state') ?? '' };
}

describe('GitHub OAuth proxy', () => {
  it('redirects to GitHub with a signed state cookie', async () => {
    const { res, location, cookie } = await start();
    expect(res.status).toBe(302);
    expect(location.host).toBe('github.com');
    expect(location.searchParams.get('redirect_uri')).toBe('https://site.test/api/callback');
    expect(location.searchParams.get('scope')).toBe('repo');
    expect(cookie).toMatch(/^decap_oauth_state=[0-9a-f]+\.[0-9a-f]{64}$/);
    expect(res.headers.get('set-cookie')).toContain('HttpOnly; Secure; SameSite=Lax');
  });

  it('rejects a state that does not match the cookie', async () => {
    const { cookie } = await start();
    const html = await (await callback(new Request('https://site.test/api/callback?code=x&state=nope', { headers: { cookie } }))).text();
    expect(html).toContain('State mismatch');
  });

  it('rejects a forged signature', async () => {
    const { state } = await start();
    const headers = { cookie: `decap_oauth_state=${state}.deadbeef` };
    const html = await (await callback(new Request(`https://site.test/api/callback?code=x&state=${state}`, { headers }))).text();
    expect(html).toContain('State mismatch');
  });

  it('accepts a valid state and only answers its own origin', async () => {
    const { cookie, state } = await start();
    const res = await callback(new Request(`https://site.test/api/callback?state=${state}&error_description=denied`, { headers: { cookie } }));
    const html = await res.text();
    expect(html).toContain('authorization:github:error');
    expect(html).toContain('denied');
    expect(html).toContain('var origin = "https://site.test"');
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('fails clearly without credentials', async () => {
    delete process.env.GITHUB_CLIENT_SECRET;
    const res = await auth(new Request('https://site.test/api/auth'));
    expect(res.status).toBe(500);
  });
});
