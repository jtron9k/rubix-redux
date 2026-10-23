// Client side of the lead form: per-field validation and the payload posted to /api/lead.
// netlify/functions/lead.ts re-checks name, phone and consent on the server.

import type { FormConfig, FormField } from '../content/types';

export type FormValues = Record<string, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP = /^\d{5}(-\d{4})?$/;

export function digits(value: string): string {
  return value.replace(/\D/g, '');
}

/** An error message for one field, or null when it's valid. */
export function validateField(field: FormField, raw: string | undefined): string | null {
  const value = (raw ?? '').trim();
  if (!value) return field.required ? `${field.label} is required.` : null;
  switch (field.type) {
    case 'tel': {
      const d = digits(value);
      return d.length >= 10 && d.length <= 11 ? null : 'Enter a 10-digit phone number.';
    }
    case 'email':
      return EMAIL.test(value) ? null : 'Enter a valid email address.';
    case 'zip':
      return ZIP.test(value) ? null : 'Enter a 5-digit ZIP code.';
    case 'number':
      return Number.isFinite(Number(value)) ? null : `${field.label} must be a number.`;
    case 'date':
      return Number.isNaN(Date.parse(value)) ? 'Enter a valid date.' : null;
    case 'select':
      return field.options?.length && !field.options.includes(value) ? 'Choose one of the options.' : null;
    default:
      return null;
  }
}

export function validateFields(fields: FormField[], values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const e = validateField(f, values[f.name]);
    if (e) errors[f.name] = e;
  }
  return errors;
}

export interface LeadContext {
  page: string;
  group: string;
  experimentId?: string | null;
  experimentArm?: string | null;
  tracking: Record<string, string>;
}

/** The JSON body for /api/lead. Optional context keys are omitted rather than sent blank. */
export function buildPayload(form: FormConfig, values: FormValues, consent: boolean, honeypot: string, ctx: LeadContext) {
  const body: Record<string, string> = {};
  for (const f of form.fields) body[f.name] = (values[f.name] ?? '').trim();
  Object.assign(body, ctx.tracking);
  body.page = ctx.page;
  body.group = ctx.group;
  body.form_id = form.id;
  if (ctx.experimentId) body.experiment_id = ctx.experimentId;
  if (ctx.experimentArm) body.experiment_arm = ctx.experimentArm;
  body.consent = consent ? 'yes' : '';
  body.company = honeypot;
  return body;
}

export async function submitLead(body: Record<string, string>, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetchImpl('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}
