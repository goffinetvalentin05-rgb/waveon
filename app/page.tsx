import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingIntro } from "@/components/landing/LandingIntro";
import { LandingDaily } from "@/components/landing/LandingDaily";
import { LandingProduct } from "@/components/landing/LandingProduct";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingBrandImage } from "@/components/landing/LandingBrandImage";
import { LandingFinalCta } from "@/components/landing/LandingFinalCta";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { landingContent } from "@/lib/landing/config";

export default function Home() {
  const { brand, header, hero, intro, daily, product, pricing, brandImage, finalCta, footer } =
    landingContent;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white font-sans text-neutral-950 antialiased selection:bg-violet-200/50">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_90%_55%_at_50%_-8%,rgba(139,92,246,0.08),transparent_52%),linear-gradient(180deg,#fafaff_0%,#ffffff_22%,#ffffff_100%)]"
        aria-hidden
      />
      <LandingHeader brand={brand} header={header} />
      <main>
        <LandingHero content={hero} />
        <LandingIntro content={intro} />
        <LandingDaily content={daily} />
        <LandingProduct content={product} />
        <LandingPricing content={pricing} />
        <LandingBrandImage content={brandImage} />
        <LandingFinalCta content={finalCta} />
      </main>
      <LandingFooter brand={brand} footer={footer} />
    </div>
  );
}
