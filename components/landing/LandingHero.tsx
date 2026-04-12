import { PrimaryButton } from "./PrimaryButton";
import { HeroMockup } from "./HeroMockup";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden px-5 pb-20 pt-12 md:px-8 md:pb-28 md:pt-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[480px] w-[800px] -translate-x-1/2 rounded-full bg-white/[0.03] blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-white md:text-6xl md:leading-[1.08]">
            Ton agenda se remplit tout seul.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-zinc-400 md:text-lg">
            Tes clients réservent en ligne, tu confirmes automatiquement et tu récupères leurs avis
            sans rien faire.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <PrimaryButton href="/signup">Commencer gratuitement</PrimaryButton>
          </div>
        </div>
        <div className="mt-16 md:mt-20">
          <HeroMockup />
        </div>
      </div>
    </section>
  );
}
