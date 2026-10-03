import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { ProgramSteps } from "@/components/landing/ProgramSteps";
import { SampleReport } from "@/components/landing/SampleReport";
import { ShopperSwarm } from "@/components/landing/ShopperSwarm";
import { FrictionMatrix } from "@/components/landing/FrictionMatrix";
import { AgencySection } from "@/components/landing/AgencySection";
import { FAQ } from "@/components/landing/FAQ";
import { CTASection } from "@/components/landing/CTASection";
import { copy } from "@/lib/copy";
import { INTRO_GATE_SCRIPT } from "@/components/landing/intro/script";
import { IntroGhost } from "@/components/landing/intro/IntroGhost";
import { SmoothScroll } from "@/components/landing/fx/SmoothScroll";
import { CursorTrail } from "@/components/landing/fx/CursorTrail";

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
      {/* Decides before first paint whether the once-per-session intro plays. */}
      <script dangerouslySetInnerHTML={{ __html: INTRO_GATE_SCRIPT }} />
      <IntroGhost />
      <SmoothScroll />
      <CursorTrail />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Header />
      <Hero />
      <ProgramSteps />
      <SampleReport />
      <ShopperSwarm />
      <FrictionMatrix />
      <AgencySection />
      <FAQ />
      <CTASection />
      <Footer />
    </main>
  );
}
