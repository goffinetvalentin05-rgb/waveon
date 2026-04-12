import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingIntro } from "@/components/landing/LandingIntro";
import { LandingDaily } from "@/components/landing/LandingDaily";
import { LandingScrollStory } from "@/components/landing/LandingScrollStory";
import { LandingProduct } from "@/components/landing/LandingProduct";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingBrandImage } from "@/components/landing/LandingBrandImage";
import { LandingFinalCta } from "@/components/landing/LandingFinalCta";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { landingContent } from "@/lib/landing/config";

export default function Home() {
  const { brand, header, hero, intro, daily, scrollStory, product, pricing, brandImage, finalCta, faq, footer } =
    landingContent;

  return (
    <div className="relative min-h-screen overflow-x-clip bg-white font-sans text-neutral-950 antialiased selection:bg-neutral-200/80">
      <LandingHeader brand={brand} header={header} />
      <main>
        <LandingHero content={hero} />
        <LandingIntro content={intro} />
        <LandingDaily content={daily} />
        <LandingScrollStory content={scrollStory} />
        <LandingProduct content={product} />
        <LandingPricing content={pricing} />
        <LandingBrandImage content={brandImage} />
        <LandingFinalCta content={finalCta} />
        <LandingFaq content={faq} />
      </main>
      <LandingFooter brand={brand} footer={footer} />
    </div>
  );
}
