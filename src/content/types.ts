// The content schema. Every field here needs a matching field in public/admin/config.yml,
// because Decap drops keys it doesn't know about when an editor saves.

export type LayoutKey = 'standard' | 'services-first' | 'trust-heavy' | 'lead-form' | 'campaign';

export const LAYOUT_KEYS: readonly LayoutKey[] = [
  'standard',
  'services-first',
  'trust-heavy',
  'lead-form',
  'campaign',
];

export interface ImageRef {
  src: string;
  alt: string;
}

export interface MetaDefaults {
  title: string;
  description: string;
}

export interface ReviewCounterConfig {
  /** Final count. 0 turns the counter off; blank or absent inherits. */
  target?: number | null;
  /** How long the count-up takes, in milliseconds. */
  rampMs?: number | null;
}

export interface BusinessSettings {
  setupComplete: boolean;
  businessName: string;
  tagline: string;
  /** Display format. The tel: link is derived from its digits. */
  phone: string;
  email: string;
  address: string;
  hoursText: string;
  serviceAreaText: string;
  licenseText?: string;
  logo: ImageRef;
  brand: { primary: string; accent: string };
  /** GTM-XXXXXXX, or blank to disable tag manager. */
  gtmId: string;
  siteUrl: string;
  defaultOgImage: string;
  metaDefaults: MetaDefaults;
  /** Paid landing pages usually shouldn't be indexed. */
  noindex: boolean;
  reviewCounter?: ReviewCounterConfig;
  /** Shown under every lead form next to the consent checkbox. */
  consentText: string;
  badges?: ImageRef[];
}

/** A top-level URL segment (a city, a language, a partner) with optional overrides. */
export interface PageGroup {
  key: string;
  name: string;
  regionName: string;
  stateAbbr?: string;
  phone?: string;
  hoursText?: string;
  serviceAreaText?: string;
  licenseText?: string;
  metaDefaults?: Partial<MetaDefaults>;
  reviewCounter?: ReviewCounterConfig;
}

/** Business settings with the matching group's overrides merged on top. */
export interface SiteContent extends BusinessSettings {
  group: PageGroup | null;
  /** First URL segment, or '' for the root site. */
  groupSlug: string;
  groupName: string;
  regionName: string;
  stateAbbr: string;
}

export interface CtaLink {
  label: string;
  /** A path, URL, or '#quote' to scroll to the lead form. Blank means "call". */
  href?: string;
}

export interface HeroContent {
  eyebrow?: string;
  headline: string;
  subheadline: string;
  image?: ImageRef;
  primaryCta: CtaLink;
  secondaryCta?: CtaLink;
  /** Short reassurance bullets under the CTAs. */
  bullets?: string[];
  /** Label next to the stars, e.g. "{{reviewCount}} five-star reviews". */
  ratingLabel?: string;
}

export interface TrustItem {
  icon: string;
  label: string;
}

export interface ServiceItem {
  icon: string;
  title: string;
  body: string;
  image?: ImageRef;
  href?: string;
}

export interface ServicesContent {
  heading: string;
  intro?: string;
  items: ServiceItem[];
}

export interface WhyUsContent {
  heading: string;
  intro?: string;
  points: { icon: string; title: string; body: string }[];
  image?: ImageRef;
}

export interface ReviewItem {
  name: string;
  location?: string;
  rating: number;
  quote: string;
}

export interface ReviewsContent {
  heading: string;
  ratingLabel?: string;
  items: ReviewItem[];
}

export interface CtaBandContent {
  heading: string;
  body: string;
  primaryCta: CtaLink;
}

export interface FooterContent {
  blurb: string;
  links?: CtaLink[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export type FormFieldType = 'text' | 'tel' | 'email' | 'zip' | 'date' | 'select' | 'textarea' | 'number';

export interface FormField {
  name: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface FormConfig {
  id: string;
  title: string;
  intro?: string;
  multiStep: boolean;
  submitLabel: string;
  successTitle: string;
  successBody: string;
  fields: FormField[];
}

export interface OfferContent {
  heading: string;
  items: { title: string; value?: string; body?: string }[];
  totalLabel?: string;
}

/** Shared date gate for coupons, announcements and promo ads. ISO dates or datetimes. */
export interface DateWindow {
  startsAt?: string;
  expiresAt?: string;
}

export interface Coupon extends DateWindow {
  title: string;
  value: string;
  body: string;
  code?: string;
  finePrint?: string;
}

export interface Announcement extends DateWindow {
  text: string;
  href?: string;
  linkLabel?: string;
}

export interface PromoAd extends DateWindow {
  heading: string;
  body: string;
  image?: ImageRef;
  cta: CtaLink;
}

export interface ExperimentConfig {
  id: string;
  /** Serve another page's content at this URL for arm B. */
  variantSlug?: string;
  /** Or render this page with a different layout for arm B. */
  variantLayout?: LayoutKey | '';
  /** Share of visitors in arm B, 0 to 100. Defaults to 50. */
  variantPercent?: number | null;
}

export interface PageContent {
  slug: string;
  layout: LayoutKey;
  meta: { title: string; description: string; image?: string };
  hero: HeroContent;
  trustBar: TrustItem[];
  services: ServicesContent;
  whyUs: WhyUsContent;
  reviews: ReviewsContent;
  cta: CtaBandContent;
  footer: FooterContent;
  faq?: FaqItem[];
  form?: FormConfig;
  offer?: OfferContent;
  coupons?: Coupon[];
  announcements?: Announcement[];
  promoAds?: PromoAd[];
  experiment?: ExperimentConfig;
  /** After this moment the page redirects to its group home. */
  campaignEndsAt?: string;
  reviewCounter?: ReviewCounterConfig;
}

/** A page after template substitution, bound to its site. */
export interface ResolvedPage {
  page: PageContent;
  site: SiteContent;
  /** Resolved review counter target; 0 means off. */
  reviewTarget: number;
  reviewRampMs: number;
}
