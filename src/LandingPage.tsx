import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { NotFound } from './components/NotFound';
import { SetupBanner } from './components/SetupBanner';
import { StickyMobileCallBar } from './components/StickyMobileCallBar';
import { getPage, hasPage } from './content/pages';
import { settings } from './content/settings';
import { ReviewCounterProvider } from './hooks/ReviewCounterProvider';
import { useExperiment } from './hooks/useExperiment';
import { canRenderLayout, layouts } from './layouts';
import { campaignRedirect } from './lib/promo';
import { scrollToQuote } from './lib/scroll';

function setMeta(title: string, description: string) {
  document.title = title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', description);
}

export function LandingPage() {
  const { pathname, search, hash } = useLocation();
  const control = getPage(pathname);
  // Redirect order: an expired campaign redirects before the experiment runs, so it never
  // writes an arm cookie or reports an experiment_view for a page nobody sees.
  const redirect = control ? campaignRedirect(control.page.slug, control.page.campaignEndsAt, new Date(), hasPage) : null;
  const result = useExperiment(redirect ? null : control, pathname, search);
  const resolved = result?.resolved ?? null;

  useEffect(() => {
    if (!resolved) {
      setMeta(`Page not found | ${settings.businessName}`, settings.metaDefaults.description);
      return;
    }
    const { page, site } = resolved;
    setMeta(page.meta.title || site.metaDefaults.title, page.meta.description || site.metaDefaults.description);
  }, [resolved]);

  // New page: start at the top, or at the form for #quote deep links (GTM widgets link there).
  useEffect(() => {
    if (hash === '#quote') {
      const t = window.setTimeout(() => scrollToQuote('auto'), 50);
      return () => window.clearTimeout(t);
    }
    window.scrollTo(0, 0);
    // Only on navigation, not on every hash change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!control) return <NotFound />;
  if (redirect) return <Navigate replace to={{ pathname: redirect, search }} />;
  if (!resolved) return null;

  const { page, site } = resolved;
  const key = canRenderLayout(page, page.layout) ? page.layout : 'standard';
  const Layout = layouts[key] ?? layouts.standard;

  return (
    <ReviewCounterProvider key={pathname} target={resolved.reviewTarget} rampMs={resolved.reviewRampMs}>
      <div className="min-h-screen bg-white pb-20 font-sans text-ink-900 antialiased md:pb-0">
        <SetupBanner />
        <Layout page={page} site={site} experiment={{ experimentId: result?.experiment?.id ?? null, experimentArm: result?.arm ?? null }} />
        <StickyMobileCallBar site={site} mode={key === 'lead-form' ? 'form' : 'call'} formLabel={page.hero.primaryCta?.label || undefined} />
      </div>
    </ReviewCounterProvider>
  );
}
