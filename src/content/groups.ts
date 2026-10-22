import { resolveSite } from '../../shared/content-core.mjs';
import { settings } from './settings';
import type { PageGroup, SiteContent } from './types';

const modules = import.meta.glob<PageGroup>('../../content/groups/*.json', { eager: true, import: 'default' });

export const groups: PageGroup[] = Object.values(modules).sort((a, b) => a.name.localeCompare(b.name));

/** Business settings with the overrides of the group named by the first path segment. */
export function getSite(pathname: string): SiteContent {
  return resolveSite(settings, groups, pathname);
}
