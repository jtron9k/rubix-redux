import { AnnouncementBar } from '../components/AnnouncementBar';
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

/** A compact hero with the services grid right under it. */
export default function ServicesFirstLayout(props: LayoutProps) {
  const { page, site } = props;
  return (
    <>
      <Header site={site} />
      <AnnouncementBar announcements={page.announcements} />
      <Hero page={page} site={site} compact />
      <Services content={page.services} />
      <TrustBar items={page.trustBar} />
      <PromoAd ads={page.promoAds} page={page} site={site} />
      <WhyUs content={page.whyUs} />
      <CtaBand content={page.cta} page={page} site={site} location="cta_band" />
      <Reviews content={page.reviews} />
      <QuoteSection {...props} />
      <Faq items={page.faq} />
      <CtaBand content={page.cta} page={page} site={site} tone="dark" location="cta_band_bottom" />
      <Footer content={page.footer} site={site} />
    </>
  );
}
