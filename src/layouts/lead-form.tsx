import { AnnouncementBar } from '../components/AnnouncementBar';
import { CtaBand } from '../components/CtaBand';
import { Faq } from '../components/Faq';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { LeadForm } from '../components/LeadForm';
import { OfferStack } from '../components/OfferStack';
import { Reviews } from '../components/Reviews';
import { TrustBar } from '../components/TrustBar';
import { WhyUs } from '../components/WhyUs';
import type { LayoutProps } from './types';

/** The form sits beside the hero on desktop and under it on mobile. Requires page.form. */
export default function LeadFormLayout({ page, site, experiment }: LayoutProps) {
  const form = page.form ? (
    <div id="quote" className="scroll-mt-20">
      <LeadForm form={page.form} site={site} {...experiment} />
    </div>
  ) : null;
  return (
    <>
      <Header site={site} />
      <AnnouncementBar announcements={page.announcements} />
      <Hero page={page} site={site} aside={form} />
      <TrustBar items={page.trustBar} />
      <OfferStack offer={page.offer} />
      <Reviews content={page.reviews} tone="tint" />
      <WhyUs content={page.whyUs} tone="white" />
      <Faq items={page.faq} />
      <CtaBand content={page.cta} page={page} site={site} tone="dark" location="cta_band_bottom" />
      <Footer content={page.footer} site={site} />
    </>
  );
}
