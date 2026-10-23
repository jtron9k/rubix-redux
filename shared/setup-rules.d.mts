export interface SetupGroup {
  key: string;
  /** The key this group had when setup loaded it; blank for a new group. A change renames it. */
  previousKey: string;
  name: string;
  regionName: string;
  stateAbbr: string;
  /** Blank inherits the main business phone. */
  phone: string;
}

export interface SetupAnswers {
  business: {
    businessName: string;
    tagline: string;
    phone: string;
    email: string;
    address: string;
    hoursText: string;
    serviceAreaText: string;
    licenseText: string;
    metaTitle: string;
    metaDescription: string;
  };
  brand: { primary: string; accent: string; logoSrc: string; logoAlt: string };
  tracking: { gtmId: string; noindex: boolean };
  leads: { webhookUrl: string; consentText: string };
  groups: SetupGroup[];
  publishing: { repo: string; siteUrl: string };
}

export type SetupErrors = Record<string, string>;

export const REPO_PATTERN: RegExp;
export const fieldRules: Record<
  | 'businessName'
  | 'phone'
  | 'optionalPhone'
  | 'email'
  | 'color'
  | 'logoSrc'
  | 'gtmId'
  | 'webhookUrl'
  | 'consentText'
  | 'repo'
  | 'siteUrl'
  | 'groupKey'
  | 'groupName',
  (value: unknown) => string
>;
export function validateGroups(groups: SetupGroup[] | undefined): SetupErrors;
export function validateAnswers(answers: SetupAnswers): SetupErrors;
