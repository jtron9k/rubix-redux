// POST /api/lead. Forwards a lead to LEAD_WEBHOOK_URL when it's set, otherwise to Netlify Forms
// (the "lead" form registered by the hidden static form that build/site-settings-plugin.ts injects).

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const MAX_FIELD = 5000;

/** Strings only, trimmed and capped, so the forward body is predictable. */
export function sanitize(input: unknown): Record<string, string> | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(k)) continue;
    if (v === null || v === undefined) continue;
    if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') continue;
    out[k] = String(v).trim().slice(0, MAX_FIELD);
  }
  return out;
}

/** The first validation problem, or null. Mirrors the required checks in src/lib/lead.ts. */
export function validateLead(lead: Record<string, string>): string | null {
  if (!lead.name) return 'Name is required.';
  if (lead.phone.replace(/\D/g, '').length < 10) return 'A phone number with at least 10 digits is required.';
  if (!lead.consent) return 'Consent is required.';
  return null;
}

async function forward(lead: Record<string, string>): Promise<boolean> {
  const webhook = process.env.LEAD_WEBHOOK_URL?.trim();
  if (webhook) {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...lead, submitted_at: new Date().toISOString() }),
    });
    return res.ok;
  }
  const site = process.env.URL?.replace(/\/$/, '');
  if (!site) return false;
  const body = new URLSearchParams({ 'form-name': 'lead', ...lead });
  const res = await fetch(`${site}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  return res.ok;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'Method not allowed.' });

  let lead: Record<string, string> | null;
  try {
    lead = sanitize(await req.json());
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON.' });
  }
  if (!lead) return json(400, { ok: false, error: 'Invalid body.' });
  lead.phone ??= '';

  // Honeypot filled: pretend it worked and drop it.
  if (lead.company) return json(200, { ok: true });

  const problem = validateLead(lead);
  if (problem) return json(422, { ok: false, error: problem });

  delete lead.company;
  try {
    if (await forward(lead)) return json(200, { ok: true });
  } catch (err) {
    console.error('lead forward failed', err);
  }
  return json(502, { ok: false, error: 'Could not deliver the lead.' });
}
