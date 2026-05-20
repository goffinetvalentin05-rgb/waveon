import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { GeneralLeagueSection } from "@/components/landing/GeneralLeagueSection";
import { PrivateLeaguesSection } from "@/components/landing/PrivateLeaguesSection";
import { CardsShowcase } from "@/components/landing/CardsShowcase";
import { WhatsAppSection } from "@/components/landing/WhatsAppSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FaqSection } from "@/components/landing/FaqSection";
import "@/components/dashboard/pronoclash-dashboard.css";
import "@/components/landing/pronoclash-landing.css";

export function LandingPage() {
  return (
    <div className="pc-landing-page relative min-h-screen overflow-x-clip">
      <div className="pc-landing-glow-fixed" aria-hidden />
      <MarketingHeader />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <GeneralLeagueSection />
        <PrivateLeaguesSection />
        <CardsShowcase />
        <WhatsAppSection />
        <PricingSection />
        <FaqSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
