import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { PricingSection } from "@/components/landing/PricingSection";
import { FaqSection } from "@/components/landing/FaqSection";
import "@/components/dashboard/pronoclash-dashboard.css";
import "@/components/landing/pronoclash-landing.css";

export default function PricingPage() {
  return (
    <div className="pc-landing-page relative min-h-screen overflow-x-clip">
      <div className="pc-landing-glow-fixed" aria-hidden />
      <MarketingHeader />
      <main className="pt-8">
        <PricingSection />
        <FaqSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
