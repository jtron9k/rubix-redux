const TRACKING_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'msclkid',
  'fbclid',
] as const;

/** Ad-click and UTM parameters present in the query string; absent ones are omitted. */
export function readTrackingParams(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const out: Record<string, string> = {};
  for (const key of TRACKING_KEYS) {
    const v = params.get(key);
    if (v) out[key] = v;
  }
  return out;
}
