import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler, { sanitize, validateLead } from '../functions/lead';

const valid = { name: 'Pat', phone: '(555) 010-0100', consent: 'yes', company: '', gclid: 'abc', page: '/austin/date-night' };
const post = (body: unknown, method = 'POST') =>
  handler(new Request('https://site.test/api/lead', { method, body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined }));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  delete process.env.LEAD_WEBHOOK_URL;
  process.env.URL = 'https://site.test';
});

afterEach(() => vi.unstubAllGlobals());

describe('sanitize and validateLead', () => {
  it('keeps safe keys and scalar values as trimmed strings', () => {
    expect(sanitize({ name: ' Pat ', n: 2, ok: true, 'bad key': 'x', nested: { a: 1 }, nil: null })).toEqual({ name: 'Pat', n: '2', ok: 'true' });
    expect(sanitize([1, 2])).toBeNull();
    expect(sanitize('x')).toBeNull();
  });
  it('requires a name, 10 phone digits and consent', () => {
    expect(validateLead({ ...valid, name: '' })).toMatch(/Name/);
    expect(validateLead({ ...valid, phone: '555-0100' })).toMatch(/phone/);
    expect(validateLead({ ...valid, consent: '' })).toMatch(/Consent/);
    expect(validateLead(valid)).toBeNull();
  });
});

describe('POST /api/lead', () => {
  it('rejects other methods, bad JSON and invalid leads', async () => {
    expect((await post(null, 'GET')).status).toBe(405);
    expect((await post('{nope')).status).toBe(400);
    expect((await post([1])).status).toBe(400);
    expect((await post({ ...valid, consent: '' })).status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 200 to a filled honeypot without forwarding it', async () => {
    const res = await post({ ...valid, company: 'Spam Inc' });
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards JSON with tracking params to the webhook when one is set', async () => {
    process.env.LEAD_WEBHOOK_URL = 'https://hooks.test/catch';
    const res = await post(valid);
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://hooks.test/catch');
    const sent = JSON.parse(String(init.body));
    expect(sent).toMatchObject({ name: 'Pat', gclid: 'abc', page: '/austin/date-night' });
    expect(sent).not.toHaveProperty('company');
    expect(sent.submitted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('falls back to Netlify Forms without a webhook', async () => {
    const res = await post(valid);
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://site.test/');
    const form = new URLSearchParams(String(init.body));
    expect(form.get('form-name')).toBe('lead');
    expect(form.get('phone')).toBe('(555) 010-0100');
  });

  it('returns 502 when forwarding fails or no destination is known', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500 }));
    expect((await post(valid)).status).toBe(502);
    fetchMock.mockRejectedValueOnce(new Error('down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await post(valid)).status).toBe(502);
    delete process.env.URL;
    expect((await post(valid)).status).toBe(502);
  });
});
