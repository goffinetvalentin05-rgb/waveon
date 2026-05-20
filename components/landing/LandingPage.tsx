import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { CustomCursor } from "@/components/landing/CustomCursor";
import { HeroSection } from "@/components/landing/HeroSection";
import { WhySection } from "@/components/landing/WhySection";
import { ContestSection } from "@/components/landing/ContestSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { CardsShowcase } from "@/components/landing/CardsShowcase";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";

export function LandingPage() {
  return (
    <div className="pc-landing-page relative min-h-screen overflow-x-clip font-[family-name:var(--font-inter)]">
      <div className="pc-landing-glow-fixed" aria-hidden />
      <CustomCursor />
      <MarketingHeader />
      <main>
        <HeroSection />
        <WhySection />
        <ContestSection />
        <HowItWorksSection />
        <CardsShowcase />
        <TestimonialsSection />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
