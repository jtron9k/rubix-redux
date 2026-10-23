// Reads content/ from disk for Node scripts (og-manifest, check-content). The app uses import.meta.glob.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readDir(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => ({ file: path.join(dir, file), data: JSON.parse(fs.readFileSync(path.join(abs, file), 'utf8')) }));
}

export function loadContent(root = ROOT) {
  const settingsFile = path.join(root, 'content/settings/business.json');
  const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
  const groups = readDir('content/groups');
  const pages = readDir('content/pages');
  return { settings, groups, pages };
}
