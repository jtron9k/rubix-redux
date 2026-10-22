import type { BusinessSettings } from './types';
import raw from '../../content/settings/business.json';

export const settings = raw as unknown as BusinessSettings;
