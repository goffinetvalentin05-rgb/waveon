const features = ["Moins d’appels", "Plus de clients", "Tout est automatique"] as const;

export function LandingFeatures() {
  return (
    <section className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {features.map((label) => (
            <div
              key={label}
              className="rounded-3xl border border-white/[0.06] bg-white/[0.02] px-6 py-8 text-center md:py-10"
            >
              <p className="text-lg font-semibold tracking-tight text-white md:text-xl">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
