import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { ProgramSteps } from "@/components/landing/ProgramSteps";
import { SampleReport } from "@/components/landing/SampleReport";
import { FounderTestimonial } from "@/components/landing/FounderTestimonial";
import { Pricing } from "@/components/landing/Pricing";
import { AgencySection } from "@/components/landing/AgencySection";
import { FAQ } from "@/components/landing/FAQ";
import { CTASection } from "@/components/landing/CTASection";
import { copy } from "@/lib/copy";

/** FAQPage structured data — lets the answers surface in search results. */
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: copy.landing.faq.items.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="relative min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Header />
      <Hero />
      <ProgramSteps />
      <SampleReport />
      <FounderTestimonial />
      <Pricing />
      <AgencySection />
      <FAQ />
      <CTASection />
      <Footer />
    </main>
  );
}
