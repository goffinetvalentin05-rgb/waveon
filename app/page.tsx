import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { HeroSection } from "@/components/marketing/sections/HeroSection";
import { HowItWorksSection } from "@/components/marketing/sections/HowItWorksSection";
import { GeneralLeagueSection } from "@/components/marketing/sections/GeneralLeagueSection";
import { ContestSection } from "@/components/marketing/sections/ContestSection";
import { PrivateLeaguesSection } from "@/components/marketing/sections/PrivateLeaguesSection";
import { CardsSection } from "@/components/marketing/sections/CardsSection";
import { WhatsappSection } from "@/components/marketing/sections/WhatsappSection";
import { PricingSection } from "@/components/marketing/sections/PricingSection";
import { FaqSection } from "@/components/marketing/sections/FaqSection";
import { FinalCtaSection } from "@/components/marketing/sections/FinalCtaSection";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <MarketingHeader />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <GeneralLeagueSection />
        <ContestSection />
        <PrivateLeaguesSection />
        <CardsSection />
        <WhatsappSection />
        <PricingSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
