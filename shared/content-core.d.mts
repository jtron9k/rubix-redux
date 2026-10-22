import type { BusinessSettings, PageGroup, ReviewCounterConfig, SiteContent } from '../src/content/types';

export const SLUG_PATTERN: RegExp;
export const GROUP_KEY_PATTERN: RegExp;
export const RESERVED_GROUP_KEYS: string[];
export const GTM_ID_PATTERN: RegExp;
export const HEX_COLOR_PATTERN: RegExp;
export const TEMPLATE_TOKENS: string[];
export const RUNTIME_TOKENS: string[];
export const DEFAULT_RAMP_MS: number;

export type TemplateTokens = Record<string, string>;

export function normalizeSlug(path: string | null | undefined): string;
export function firstSegment(path: string): string;
export function slugToFileName(slug: string): string;
export function isBlank(v: unknown): boolean;
export function mergeOverrides<T extends object>(base: T, overrides: Partial<T> | undefined | null): T;
export function resolveSite(settings: BusinessSettings, groups: PageGroup[], pathname: string): SiteContent;
export function buildTokens(site: SiteContent): TemplateTokens;
export function applyTemplateString(str: string, tokens: TemplateTokens): string;
export function applyTemplates<T>(value: T, tokens: TemplateTokens): T;
export function findStrayTokens(value: unknown): string[];
export function resolveReviewCounter(
  ...levels: (ReviewCounterConfig | null | undefined)[]
): { target: number; rampMs: number };
export function phoneDigits(phone: string | null | undefined): string;
export function telHref(phone: string | null | undefined): string;
export function isValidGtmId(id: string | null | undefined): boolean;
export function isValidGroupKey(key: string): boolean;
export const LAYOUT_KEYS: import('../src/content/types').LayoutKey[];
export function canRenderLayout(page: Partial<import('../src/content/types').PageContent> | null | undefined, key: string): boolean;
