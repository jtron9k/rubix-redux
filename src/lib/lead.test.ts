import { describe, expect, it, vi } from 'vitest';
import type { FormConfig, FormField } from '../content/types';
import { buildPayload, submitLead, validateField, validateFields } from './lead';
import { readTrackingParams } from './tracking';

const field = (over: Partial<FormField>): FormField => ({ name: 'f', type: 'text', label: 'Field', required: false, ...over });

describe('validateField', () => {
  it('requires required fields and skips blank optional ones', () => {
    expect(validateField(field({ required: true }), '  ')).toBe('Field is required.');
    expect(validateField(field({ type: 'email' }), '')).toBeNull();
  });
  it('checks each type', () => {
    expect(validateField(field({ type: 'tel' }), '(555) 010-01')).not.toBeNull();
    expect(validateField(field({ type: 'tel' }), '(555) 010-0100')).toBeNull();
    expect(validateField(field({ type: 'email' }), 'a@b')).not.toBeNull();
    expect(validateField(field({ type: 'zip' }), '78701-1234')).toBeNull();
    expect(validateField(field({ type: 'zip' }), '7870')).not.toBeNull();
    expect(validateField(field({ type: 'number' }), 'two')).not.toBeNull();
    expect(validateField(field({ type: 'date' }), '2027-13-45')).not.toBeNull();
    expect(validateField(field({ type: 'select', options: ['1', '2'] }), '3')).not.toBeNull();
    expect(validateField(field({ type: 'select', options: ['1', '2'] }), '2')).toBeNull();
  });
  it('validateFields keys errors by field name', () => {
    expect(validateFields([field({ name: 'name', required: true }), field({ name: 'x' })], {})).toEqual({ name: 'Field is required.' });
  });
});

describe('buildPayload', () => {
  const form = { id: 'dn', fields: [field({ name: 'name' }), field({ name: 'phone', type: 'tel' })] } as FormConfig;
  it('adds tracking and context, omitting absent experiment keys', () => {
    const body = buildPayload(form, { name: ' Pat ', phone: '5550100100', extra: 'dropped' }, true, '', {
      page: '/austin/date-night',
      group: 'austin',
      experimentId: null,
      tracking: readTrackingParams('?utm_source=google&gclid=abc&utm_term=&foo=1'),
    });
    expect(body).toEqual({
      name: 'Pat',
      phone: '5550100100',
      utm_source: 'google',
      gclid: 'abc',
      page: '/austin/date-night',
      group: 'austin',
      form_id: 'dn',
      consent: 'yes',
      company: '',
    });
    expect(Object.values(body)).not.toContain(undefined);
  });
  it('carries the experiment and an unchecked consent', () => {
    const body = buildPayload(form, {}, false, 'bot', { page: '/', group: '', experimentId: 'x', experimentArm: 'variant', tracking: {} });
    expect(body).toMatchObject({ experiment_id: 'x', experiment_arm: 'variant', consent: '', company: 'bot' });
  });
});

describe('submitLead', () => {
  it('posts JSON to /api/lead and reports res.ok', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }));
    expect(await submitLead({ a: '1' }, fetchImpl as unknown as typeof fetch)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith('/api/lead', expect.objectContaining({ method: 'POST', body: '{"a":"1"}' }));
  });
  it('returns false on an error status or a network failure', async () => {
    expect(await submitLead({}, (async () => new Response('', { status: 502 })) as unknown as typeof fetch)).toBe(false);
    expect(await submitLead({}, (async () => { throw new Error('offline'); }) as unknown as typeof fetch)).toBe(false);
  });
});
