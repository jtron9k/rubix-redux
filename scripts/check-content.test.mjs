import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkContent, iconMapNames } from './check-content.mjs';
import { loadContent, ROOT } from './lib/load-content.mjs';

const configYml = fs.readFileSync(path.join(ROOT, 'public/admin/config.yml'), 'utf8');
const iconNames = iconMapNames(fs.readFileSync(path.join(ROOT, 'src/content/iconMap.ts'), 'utf8'));

/** The sample content, deep-copied, with an optional edit to one page. */
function run(edit = () => {}, opts = {}) {
  const content = structuredClone(loadContent());
  edit(content);
  return checkContent({ ...content, configYml, iconNames, now: new Date(2026, 9, 1), ...opts });
}
const page = (content, slug) => content.pages.find((p) => p.data.slug === slug).data;

describe('check-content', () => {
  it('passes the sample content, with go-live warnings', () => {
    const { errors, warnings } = run();
    expect(errors).toEqual([]);
    expect(warnings.join('\n')).toMatch(/sample business name/);
    expect(warnings.join('\n')).toMatch(/placeholder image/);
    expect(warnings.join('\n')).toMatch(/sample reviews/);
  });

  const cases = [
    ['an unknown layout', (c) => (page(c, '/denver').layout = 'grid'), /layout "grid"/],
    ['a lead-form page without a form', (c) => delete page(c, '/austin/date-night').form, /lead-form pages need form.fields/],
    ['a campaign page without coupons', (c) => (page(c, '/austin/summer').coupons = []), /campaign pages need coupons/],
    ['a duplicate slug', (c) => (page(c, '/denver').slug = '/austin'), /duplicate slug \/austin/],
    ['a bad slug', (c) => (page(c, '/denver').slug = '/Denver Home'), /slug "\/Denver Home"/],
    ['a page outside any group', (c) => (page(c, '/denver').slug = '/houston'), /"\/houston" is not a page group/],
    ['a missing variant page', (c) => (page(c, '/denver/date-night').experiment.variantSlug = '/denver/nope'), /variantSlug \/denver\/nope is not a page/],
    ['an unrenderable variant layout', (c) => (page(c, '/austin').experiment.variantLayout = 'lead-form'), /can't render this page/],
    ['an unknown icon', (c) => (page(c, '/denver').trustBar[0].icon = 'rocket'), /trustBar\[0\]\.icon icon "rocket"/],
    ['a bad date', (c) => (page(c, '/austin/summer').coupons[0].expiresAt = '2027-02-30'), /expiresAt "2027-02-30" is not a date/],
    ['a window that ends before it starts', (c) => Object.assign(page(c, '/austin/summer').coupons[0], { startsAt: '2027-05-01', expiresAt: '2027-04-01' }), /starts after it expires/],
    ['a stray token', (c) => (page(c, '/denver').hero.headline = 'Hi {{cityName}}'), /\{\{cityName\}\}/],
    ['a malformed GTM id', (c) => (c.settings.gtmId = 'UA-123'), /gtmId "UA-123"/],
    ['a bad brand color', (c) => (c.settings.brand.accent = 'orange'), /brand.accent/],
    ['a group file that does not match its key', (c) => (c.groups[0].data.key = 'atx'), /file name should be atx.json/],
  ];
  it.each(cases)('flags %s', (_name, edit, pattern) => {
    expect(run(edit).errors.join('\n')).toMatch(pattern);
  });

  it('keeps {{reviewCount}} as a runtime token', () => {
    expect(run((c) => (page(c, '/denver').hero.ratingLabel = '{{reviewCount}} reviews')).errors).toEqual([]);
  });

  it('flags registries that drift from the Decap selects', () => {
    expect(run(() => {}, { iconNames: [...iconNames, 'rocket'] }).errors.join('\n')).toMatch(/icon options must match iconMap \(missing: rocket/);
    const yml = configYml.replace(/(name: layout,[^\n]*options: \[)standard, /, '$1');
    expect(run(() => {}, { configYml: yml }).errors.join('\n')).toMatch(/layout options must match LAYOUT_KEYS \(missing: standard/);
  });

  it('warns once a campaign has ended', () => {
    expect(run(() => {}, { now: new Date(2028, 0, 1) }).warnings.join('\n')).toMatch(/campaign ended/);
  });
});
