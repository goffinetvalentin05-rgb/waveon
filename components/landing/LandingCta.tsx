import { PrimaryButton } from "./PrimaryButton";

export function LandingCta() {
  return (
    <section className="border-t border-white/[0.06] px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-white md:text-5xl">
          Ton agenda se remplit tout seul.
        </h2>
        <div className="mt-10">
          <PrimaryButton href="/signup">Essayer gratuitement</PrimaryButton>
        </div>
      </div>
    </section>
  );
}
