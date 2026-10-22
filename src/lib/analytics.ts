// dataLayer helper. Rule: never push undefined (GTM keeps the previous value for a key
// that is pushed as undefined, so stale data leaks between events). Blank is "".

type DataValue = string | number | boolean;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export type TrackedEvent = 'experiment_view' | 'phone_click' | 'cta_click' | 'generate_lead' | 'form_step';

export function clean(data: Record<string, DataValue | null | undefined>): Record<string, DataValue> {
  const out: Record<string, DataValue> = {};
  for (const [k, v] of Object.entries(data)) out[k] = v === undefined || v === null ? '' : v;
  return out;
}

export function pushEvent(event: TrackedEvent, data: Record<string, DataValue | null | undefined> = {}): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...clean(data) });
}
