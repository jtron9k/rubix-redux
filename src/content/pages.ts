import { normalizeSlug, resolveReviewCounter } from '../../shared/content-core.mjs';
import { getSite } from './groups';
import { settings } from './settings';
import { applyTemplates, buildTokens } from './templates';
import type { PageContent, ResolvedPage } from './types';

const modules = import.meta.glob<PageContent>('../../content/pages/*.json', { eager: true, import: 'default' });

function resolve(page: PageContent): ResolvedPage {
  const site = getSite(page.slug);
  const resolved = applyTemplates(page, buildTokens(site));
  const { target, rampMs } = resolveReviewCounter(settings.reviewCounter, site.group?.reviewCounter, page.reviewCounter);
  return { page: resolved, site, reviewTarget: target, reviewRampMs: rampMs };
}

const bySlug = new Map<string, ResolvedPage>();
for (const page of Object.values(modules)) {
  bySlug.set(normalizeSlug(page.slug), resolve(page));
}

export function getPage(pathname: string): ResolvedPage | null {
  return bySlug.get(normalizeSlug(pathname)) ?? null;
}

export function hasPage(pathname: string): boolean {
  return bySlug.has(normalizeSlug(pathname));
}

export function allPages(): ResolvedPage[] {
  return [...bySlug.values()];
}
