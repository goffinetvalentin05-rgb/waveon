import { LandingNav } from "@/components/landing/LandingNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingProblem } from "@/components/landing/LandingProblem";
import { LandingSteps } from "@/components/landing/LandingSteps";
import { LandingProductPreview } from "@/components/landing/LandingProductPreview";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingCta } from "@/components/landing/LandingCta";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased selection:bg-white/20">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingProblem />
        <LandingSteps />
        <LandingProductPreview />
        <LandingFeatures />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
