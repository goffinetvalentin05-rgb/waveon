import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { PricingSection } from "@/components/marketing/sections/PricingSection";
import { FaqSection } from "@/components/marketing/sections/FaqSection";

export default function PricingPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <MarketingHeader />
      <main className="pt-16">
        <PricingSection />
        <FaqSection />
      </main>
      <MarketingFooter />
    </div>
  );
}
