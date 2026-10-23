// The hand-synced lists: layout keys (types, shared rules, registry, Decap) and icon names (iconMap, Decap).
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { iconMapNames, selectOptions } from './check-content.mjs';
import { LAYOUT_KEYS as SHARED_LAYOUT_KEYS } from '../shared/content-core.mjs';
import { layouts } from '../src/layouts';
import { ICON_NAMES } from '../src/content/iconMap';
import { LAYOUT_KEYS } from '../src/content/types';

const configYml = fs.readFileSync(new URL('../public/admin/config.yml', import.meta.url), 'utf8');
const iconSource = fs.readFileSync(new URL('../src/content/iconMap.ts', import.meta.url), 'utf8');
const sorted = (a) => [...a].sort();

describe('layout keys', () => {
  it('match across types, shared rules, the registry and both Decap selects', () => {
    expect(sorted(SHARED_LAYOUT_KEYS)).toEqual(sorted(LAYOUT_KEYS));
    expect(sorted(Object.keys(layouts))).toEqual(sorted(LAYOUT_KEYS));
    expect(sorted(selectOptions(configYml, 'layout') ?? [])).toEqual(sorted(LAYOUT_KEYS));
    expect(sorted(selectOptions(configYml, 'variantLayout') ?? [])).toEqual(sorted(LAYOUT_KEYS));
  });
});

describe('icon names', () => {
  it("check-content's source parse agrees with the real iconMap", () => {
    expect(sorted(iconMapNames(iconSource))).toEqual(sorted(ICON_NAMES));
  });
  it('match the Decap icon select', () => {
    expect(sorted(selectOptions(configYml, 'icon') ?? [])).toEqual(sorted(ICON_NAMES));
  });
});
