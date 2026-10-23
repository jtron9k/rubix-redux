// Layout registry. Keys must match the LayoutKey union in src/content/types.ts and the layout
// select in public/admin/config.yml; check-content enforces all three.

import type { ComponentType } from 'react';
import type { LayoutKey } from '../content/types';
import CampaignLayout from './campaign';
import LeadFormLayout from './lead-form';
import ServicesFirstLayout from './services-first';
import StandardLayout from './standard';
import TrustHeavyLayout from './trust-heavy';
import type { LayoutProps } from './types';

export { canRenderLayout } from '../../shared/content-core.mjs';
export type { LayoutProps } from './types';

export const layouts: Record<LayoutKey, ComponentType<LayoutProps>> = {
  standard: StandardLayout,
  'services-first': ServicesFirstLayout,
  'trust-heavy': TrustHeavyLayout,
  'lead-form': LeadFormLayout,
  campaign: CampaignLayout,
};
