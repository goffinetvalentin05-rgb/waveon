const steps = [
  {
    step: "1",
    title: "Tes clients réservent en ligne",
  },
  {
    step: "2",
    title: "Les réservations sont confirmées automatiquement",
  },
  {
    step: "3",
    title: "Tu récupères des avis et une liste de clients",
  },
] as const;

export function LandingSteps() {
  return (
    <section className="px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Comment ça marche
        </p>
        <div className="mt-12 grid gap-4 md:grid-cols-3 md:gap-6">
          {steps.map((s) => (
            <div
              key={s.step}
              className="relative rounded-3xl border border-white/[0.06] bg-zinc-900/30 p-8 md:p-10"
            >
              <span className="text-5xl font-semibold tabular-nums text-white/[0.08] md:text-6xl">
                {s.step}
              </span>
              <p className="mt-4 text-lg font-medium leading-snug text-white md:text-xl">{s.title}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
