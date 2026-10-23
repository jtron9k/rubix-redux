/** Scroll to the #quote section and focus its first field. False when the page has none. */
export function scrollToQuote(behavior: ScrollBehavior = 'smooth'): boolean {
  const el = document.getElementById('quote');
  if (!el) return false;
  el.scrollIntoView({ behavior, block: 'start' });
  el.querySelector<HTMLElement>('input, select, textarea')?.focus({ preventScroll: true });
  return true;
}
