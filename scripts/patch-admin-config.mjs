#!/usr/bin/env node
// Postbuild: point the built dist/admin/config.yml at the repo and URL Netlify is deploying, so a
// fork made with "Deploy to Netlify" logs in without editing YAML. The source file is untouched.
// Netlify sets REPOSITORY_URL (https://github.com/owner/name or git@github.com:owner/name) and URL.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from './lib/load-content.mjs';

const FILE = path.join(ROOT, 'dist/admin/config.yml');

export function repoFromUrl(url) {
  const m = /github\.com[/:]([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/.exec(url ?? '');
  return m ? m[1] : null;
}

export function patchConfig(yml, { repo, baseUrl }) {
  let out = yml;
  if (repo) out = out.replace(/^(\s+repo:\s*).*$/m, `$1${repo}`);
  if (baseUrl) out = out.replace(/^(\s+base_url:\s*).*$/m, `$1${baseUrl.replace(/\/$/, '')}`);
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (!fs.existsSync(FILE)) {
    console.log('patch-admin-config: no dist/admin/config.yml, skipping');
  } else {
    const repo = repoFromUrl(process.env.REPOSITORY_URL);
    const baseUrl = process.env.URL;
    const before = fs.readFileSync(FILE, 'utf8');
    const after = patchConfig(before, { repo, baseUrl });
    if (after !== before) {
      fs.writeFileSync(FILE, after);
      console.log(`patch-admin-config: repo=${repo ?? '(unchanged)'} base_url=${baseUrl ?? '(unchanged)'}`);
    } else {
      console.log('patch-admin-config: nothing to change');
    }
  }
}
