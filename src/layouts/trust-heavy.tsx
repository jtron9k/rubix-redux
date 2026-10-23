import { AnnouncementBar } from '../components/AnnouncementBar';
import { Badges } from '../components/Badges';
import { CtaBand } from '../components/CtaBand';
import { Faq } from '../components/Faq';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { PromoAd } from '../components/PromoAd';
import { QuoteSection } from '../components/QuoteSection';
import { Reviews } from '../components/Reviews';
import { Services } from '../components/Services';
import { TrustBar } from '../components/TrustBar';
import { WhyUs } from '../components/WhyUs';
import type { LayoutProps } from './types';

/** Reviews, badges and guarantees before the services. */
export default function TrustHeavyLayout(props: LayoutProps) {
  const { page, site } = props;
  return (
    <>
      <Header site={site} />
      <AnnouncementBar announcements={page.announcements} />
      <Hero page={page} site={site} />
      <TrustBar items={page.trustBar} />
      <Reviews content={page.reviews} tone="tint" />
      {site.badges && site.badges.length > 0 && (
        <div className="bg-white px-4 py-12 sm:px-6">
          <Badges badges={site.badges} />
        </div>
      )}
      <WhyUs content={page.whyUs} />
      <CtaBand content={page.cta} page={page} site={site} location="cta_band" />
      <Services content={page.services} />
      <PromoAd ads={page.promoAds} page={page} site={site} />
      <QuoteSection {...props} />
      <Faq items={page.faq} />
      <CtaBand content={page.cta} page={page} site={site} tone="dark" location="cta_band_bottom" />
      <Footer content={page.footer} site={site} />
    </>
  );
}
