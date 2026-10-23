import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applySetup, planSetup, readState, setEnvLine, SetupValidationError } from './setup-core.mjs';
import { ROOT } from './load-content.mjs';

let root;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'setup-core-'));
  fs.cpSync(path.join(ROOT, 'content'), path.join(root, 'content'), { recursive: true });
  fs.mkdirSync(path.join(root, 'public/admin'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'public/admin/config.yml'), path.join(root, 'public/admin/config.yml'));
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
const state = () => readState({ root }).answers;
const actions = (plan) => plan.changes.map((c) => `${c.action} ${c.path}`);

describe('readState', () => {
  it('reads settings, groups, the admin config and a missing .env', () => {
    const a = state();
    expect(a.business.businessName).toBe('Brightside Sitters');
    expect(a.groups.map((g) => [g.key, g.previousKey])).toEqual([['austin', 'austin'], ['denver', 'denver']]);
    expect(a.publishing.repo).toBe('jtron9k/rubix-redux');
    expect(a.leads.webhookUrl).toBe('');
  });
});

describe('validation', () => {
  const cases = [
    ['tracking.gtmId', (a) => (a.tracking.gtmId = 'GTM-abc')],
    ['brand.primary', (a) => (a.brand.primary = 'teal')],
    ['business.phone', (a) => (a.business.phone = '555-0100')],
    ['publishing.repo', (a) => (a.publishing.repo = 'just-a-name')],
    ['publishing.siteUrl', (a) => (a.publishing.siteUrl = 'my-site')],
    ['leads.webhookUrl', (a) => (a.leads.webhookUrl = 'http://hooks.test')],
    ['groups.0.key', (a) => (a.groups[0].key = 'Austin')],
    ['groups.0.key', (a) => (a.groups[0].key = 'admin')],
    ['groups.1.key', (a) => (a.groups[1].key = 'austin')],
    ['groups.0.phone', (a) => (a.groups[0].phone = '12')],
  ];
  it.each(cases)('rejects a bad %s', (field, mutate) => {
    const a = state();
    mutate(a);
    expect(planSetup(a, { root }).errors).toHaveProperty([field]);
    expect(() => applySetup(a, { root })).toThrow(SetupValidationError);
  });
  it('writes nothing when invalid', () => {
    const before = read('content/settings/business.json');
    const a = state();
    a.tracking.gtmId = 'nope';
    expect(() => applySetup(a, { root })).toThrow();
    expect(read('content/settings/business.json')).toBe(before);
  });
});

describe('planSetup and applySetup', () => {
  it('saving the current answers only marks setup complete', () => {
    expect(actions(planSetup(state(), { root }))).toEqual(['update content/settings/business.json']);
    applySetup(state(), { root });
    expect(JSON.parse(read('content/settings/business.json')).setupComplete).toBe(true);
  });

  it('keeps unrelated settings keys and their order', () => {
    const a = state();
    a.tracking.gtmId = 'GTM-ABC1234';
    a.brand.primary = '#7C3AED';
    applySetup(a, { root });
    const s = JSON.parse(read('content/settings/business.json'));
    expect(s.gtmId).toBe('GTM-ABC1234');
    expect(s.brand.primary).toBe('#7c3aed');
    expect(s.reviewCounter).toEqual({ target: 1240, rampMs: 4000 });
    expect(Object.keys(s)[0]).toBe('setupComplete');
    expect(s.badges).toHaveLength(2);
  });

  it('adds a group with a page cloned from the template', () => {
    const a = state();
    a.groups.push({ key: 'houston', previousKey: '', name: 'Houston', regionName: '', stateAbbr: 'tx', phone: '' });
    applySetup(a, { root });
    expect(JSON.parse(read('content/groups/houston.json'))).toEqual({ key: 'houston', name: 'Houston', regionName: 'Houston', stateAbbr: 'TX' });
    const page = JSON.parse(read('content/pages/houston.json'));
    expect(page.slug).toBe('/houston');
    expect(page.layout).toBe('standard');
  });

  it('renames a group, moving its pages and rewriting links to them', () => {
    const a = state();
    a.groups[0].key = 'atx';
    const result = applySetup(a, { root });
    expect(result.checklist[0]).toMatch(/Renamed \/austin to \/atx/);
    expect(exists('content/groups/austin.json')).toBe(false);
    expect(exists('content/pages/austin-summer.json')).toBe(false);
    expect(JSON.parse(read('content/groups/atx.json')).key).toBe('atx');
    expect(JSON.parse(read('content/pages/atx-summer.json')).slug).toBe('/atx/summer');
    expect(read('content/pages/atx.json')).toContain('"/atx/summer"');
    expect(read('content/pages/home.json')).toContain('"/atx"');
    expect(read('content/pages/home.json')).not.toContain('"/austin"');
    expect(read('content/pages/denver.json')).toBe(fs.readFileSync(path.join(ROOT, 'content/pages/denver.json'), 'utf8'));
  });

  it('removes a group and its pages', () => {
    const a = state();
    a.groups = a.groups.filter((g) => g.key !== 'denver');
    const plan = planSetup(a, { root });
    expect(actions(plan)).toEqual(expect.arrayContaining(['delete content/groups/denver.json', 'delete content/pages/denver-date-night-v2.json']));
    applySetup(a, { root });
    expect(fs.readdirSync(path.join(root, 'content/pages')).filter((f) => f.startsWith('denver'))).toEqual([]);
  });

  it('a group renamed onto a removed key keeps its moved pages', () => {
    const a = state();
    a.groups = [{ ...a.groups[0], key: 'denver' }];
    applySetup(a, { root });
    expect(JSON.parse(read('content/pages/denver-summer.json')).slug).toBe('/denver/summer');
    expect(exists('content/pages/denver-date-night-v2.json')).toBe(false);
  });

  it('edits only the repo and base_url lines of the admin config', () => {
    const before = read('public/admin/config.yml');
    const a = state();
    a.publishing = { repo: 'me/site', siteUrl: 'https://me.netlify.app/' };
    applySetup(a, { root });
    const after = read('public/admin/config.yml');
    expect(after).toContain('  repo: me/site\n');
    expect(after).toContain('  base_url: https://me.netlify.app\n');
    expect(after.split('\n').length).toBe(before.split('\n').length);
    expect(after.split('\n').filter((l, i) => l !== before.split('\n')[i])).toHaveLength(2);
  });

  it('writes .env only for a webhook, and removes the line when switching to Netlify Forms', () => {
    applySetup(state(), { root });
    expect(exists('.env')).toBe(false);
    fs.writeFileSync(path.join(root, '.env'), 'OTHER=1\n');
    const a = state();
    a.leads.webhookUrl = 'https://hooks.test/x';
    applySetup(a, { root });
    expect(read('.env')).toBe('OTHER=1\nLEAD_WEBHOOK_URL=https://hooks.test/x\n');
    expect(state().leads.webhookUrl).toBe('https://hooks.test/x');
    a.leads.webhookUrl = '';
    applySetup(a, { root });
    expect(read('.env')).toBe('OTHER=1\n');
  });
});

describe('setEnvLine', () => {
  it('replaces, appends and removes a single key', () => {
    expect(setEnvLine('A=1\nB=2\n', 'A', '3')).toBe('B=2\nA=3\n');
    expect(setEnvLine(null, 'A', '1')).toBe('A=1\n');
    expect(setEnvLine('A=1\n', 'A', '')).toBe('');
  });
});
