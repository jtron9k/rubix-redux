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

export default function StandardLayout(props: LayoutProps) {
  const { page, site } = props;
  return (
    <>
      <Header site={site} />
      <Hero page={page} site={site} />
      <AnnouncementBar announcements={page.announcements} />
      <TrustBar items={page.trustBar} />
      <CtaBand content={page.cta} page={page} site={site} location="cta_band" />
      <Services content={page.services} />
      <PromoAd ads={page.promoAds} page={page} site={site} />
      <WhyUs content={page.whyUs} />
      <Reviews content={page.reviews} />
      <QuoteSection {...props} />
      <Faq items={page.faq} />
      <CtaBand content={page.cta} page={page} site={site} tone="dark" location="cta_band_bottom" />
      <Footer content={page.footer} site={site} />
    </>
  );
}
