import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingBenefits } from "@/components/landing/LandingBenefits";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingFinalCta } from "@/components/landing/LandingFinalCta";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { landingContent } from "@/lib/landing/config";

export default function Home() {
  const { brand, nav, hero, benefits, features, finalCta, footer } = landingContent;

  return (
    <div className="min-h-screen bg-white font-sans text-neutral-950 selection:bg-neutral-200/60">
      <LandingHeader brand={brand} nav={nav} />
      <main>
        <LandingHero content={hero} />
        <LandingBenefits content={benefits} />
        <LandingFeatures content={features} />
        <LandingFinalCta content={finalCta} />
      </main>
      <LandingFooter brand={brand} footer={footer} />
    </div>
  );
}
