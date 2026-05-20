import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { PricingSection } from "@/components/landing/PricingSection";
import { FaqSection } from "@/components/landing/FaqSection";

export default function PricingPage() {
  return (
    <div className="pc-landing-page relative min-h-screen overflow-x-clip font-[family-name:var(--font-inter)]">
      <div className="pc-landing-glow-fixed" aria-hidden />
      <MarketingHeader />
      <main className="pt-16">
        <PricingSection />
        <FaqSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
