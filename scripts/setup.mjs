#!/usr/bin/env node
// `npm run setup`: the terminal version of the /setup wizard. It asks the same questions, defaulting
// to what's already in content/, and writes through scripts/lib/setup-core.mjs.

import { stdin as input, stdout as output } from 'node:process';
import readline from 'node:readline';
import { fieldRules } from '../shared/setup-rules.mjs';
import { applySetup, planSetup, readState } from './lib/setup-core.mjs';

// A line queue instead of readline/promises, whose question() drops lines that arrive early,
// so piped answers (`printf '…' | npm run setup`) work as well as typing.
const rl = readline.createInterface({ input, output, terminal: Boolean(input.isTTY) });
const lines = [];
const waiting = [];
let ended = false;
rl.on('line', (l) => (waiting.length ? waiting.shift()(l) : lines.push(l)));
rl.on('close', () => {
  ended = true;
  while (waiting.length) waiting.shift()(null);
});

async function question(prompt) {
  output.write(prompt);
  const line = lines.length ? lines.shift() : ended ? null : await new Promise((resolve) => waiting.push(resolve));
  if (line === null) throw new Error('Input ended before setup finished. Nothing was written.');
  if (!input.isTTY) output.write(`${line}\n`);
  return line;
}

/** Ask until the rule passes. Enter keeps the default; "-" clears an optional field. */
async function ask(label, def = '', rule) {
  for (;;) {
    const hint = def ? ` [${def}]` : '';
    const raw = (await question(`${label}${hint}: `)).trim();
    const value = raw === '-' ? '' : raw || def;
    const err = rule ? fieldRules[rule](value) : '';
    if (!err) return value;
    console.log(`  ${err}`);
  }
}

async function yesNo(label, def) {
  const raw = (await question(`${label} [${def ? 'Y/n' : 'y/N'}]: `)).trim().toLowerCase();
  return raw ? raw.startsWith('y') : def;
}

function heading(text) {
  console.log(`\n== ${text} ==`);
}

async function askGroup(g) {
  return {
    ...g,
    key: await ask('  URL key (first path segment)', g.key, 'groupKey'),
    name: await ask('  Display name', g.name, 'groupName'),
    regionName: await ask('  Region name', g.regionName),
    stateAbbr: await ask('  State abbreviation', g.stateAbbr),
    phone: await ask('  Phone override (blank uses the main number)', g.phone, 'optionalPhone'),
  };
}

async function main() {
  const { answers: cur } = readState();
  console.log('First-time setup. Press Enter to keep the value in [brackets], or type "-" to clear an optional field.');

  heading('1. Business');
  const b = cur.business;
  const business = {
    businessName: await ask('Business name', b.businessName, 'businessName'),
    tagline: await ask('Tagline', b.tagline),
    phone: await ask('Main phone', b.phone, 'phone'),
    email: await ask('Email', b.email, 'email'),
    address: await ask('Address', b.address),
    hoursText: await ask('Hours', b.hoursText),
    serviceAreaText: await ask('Service area', b.serviceAreaText),
    licenseText: await ask('License or disclaimer line', b.licenseText),
    metaTitle: await ask('Default page title', b.metaTitle),
    metaDescription: await ask('Default page description', b.metaDescription),
  };

  heading('2. Brand');
  const brand = {
    primary: await ask('Primary color (hex)', cur.brand.primary, 'color'),
    accent: await ask('Accent color (hex)', cur.brand.accent, 'color'),
    logoSrc: await ask('Logo path', cur.brand.logoSrc, 'logoSrc'),
    logoAlt: await ask('Logo alt text', cur.brand.logoAlt),
  };

  heading('3. Tracking');
  const tracking = {
    gtmId: await ask('Google Tag Manager ID (GTM-XXXXXXX, blank for none)', cur.tracking.gtmId, 'gtmId'),
    noindex: await yesNo('Hide pages from search engines (noindex)?', cur.tracking.noindex),
  };

  heading('4. Leads');
  const leads = {
    webhookUrl: await ask('Lead webhook URL (blank uses Netlify Forms)', cur.leads.webhookUrl, 'webhookUrl'),
    consentText: await ask('Consent text under forms', cur.leads.consentText, 'consentText'),
  };

  heading('5. Page groups');
  const groups = [];
  for (const g of cur.groups) {
    const choice = (await question(`/${g.key} (${g.name}): keep, edit or remove? [K/e/r]: `)).trim().toLowerCase();
    if (choice.startsWith('r')) console.log(`  /${g.key} and its pages will be removed.`);
    else if (choice.startsWith('e')) groups.push(await askGroup(g));
    else groups.push(g);
  }
  while (await yesNo('Add a page group?', false)) {
    groups.push(await askGroup({ key: '', previousKey: '', name: '', regionName: '', stateAbbr: '', phone: '' }));
  }

  heading('6. Publishing');
  const publishing = {
    repo: await ask('GitHub repo (owner/name)', cur.publishing.repo, 'repo'),
    siteUrl: await ask('Site URL', cur.publishing.siteUrl, 'siteUrl'),
  };

  heading('7. Review');
  const answers = { business, brand, tracking, leads, groups, publishing };
  const plan = planSetup(answers);
  const errs = Object.entries(plan.errors);
  if (errs.length) {
    for (const [k, msg] of errs) console.log(`  ${k}: ${msg}`);
    throw new Error('Fix the answers above and run setup again.');
  }
  if (!plan.changes.length) console.log('No file changes.');
  for (const c of plan.changes) console.log(`  ${c.action.padEnd(6)} ${c.path}`);
  if (!(await yesNo('Write these changes?', true))) {
    console.log('Nothing written.');
    return;
  }

  const { checklist } = applySetup(answers);
  console.log('\nSaved. Next steps:');
  checklist.forEach((item, i) => console.log(`  ${i + 1}. ${item}`));
}

main()
  .catch((err) => {
    console.error(`\n${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
