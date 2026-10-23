import { AnnouncementBar } from '../components/AnnouncementBar';
import { Countdown } from '../components/Countdown';
import { CouponGrid } from '../components/CouponGrid';
import { CtaBand } from '../components/CtaBand';
import { Faq } from '../components/Faq';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { QuoteSection } from '../components/QuoteSection';
import { Reviews } from '../components/Reviews';
import { TrustBar } from '../components/TrustBar';
import type { LayoutProps } from './types';

/** Promo hero with a countdown to campaignEndsAt, a date-gated coupon grid and a CTA banner. Requires coupons. */
export default function CampaignLayout(props: LayoutProps) {
  const { page, site } = props;
  return (
    <>
      <Header site={site} />
      <AnnouncementBar announcements={page.announcements} />
      <Hero page={page} site={site}>
        {page.campaignEndsAt && (
          <div className="mt-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">Offer ends in</p>
            <Countdown until={page.campaignEndsAt} />
          </div>
        )}
      </Hero>
      <TrustBar items={page.trustBar} />
      <CouponGrid coupons={page.coupons} page={page} site={site} />
      <CtaBand content={page.cta} page={page} site={site} location="cta_band" />
      <Reviews content={page.reviews} />
      <QuoteSection {...props} />
      <Faq items={page.faq} />
      <Footer content={page.footer} site={site} />
    </>
  );
}
