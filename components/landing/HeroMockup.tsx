export function HeroMockup() {
  return (
    <div className="relative mx-auto max-w-4xl">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-b from-white/[0.08] to-transparent opacity-50 blur-2xl md:-inset-8 md:rounded-[2.5rem]" />
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-900/40 shadow-2xl shadow-black/40 backdrop-blur-sm md:rounded-[2rem]">
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3 md:px-5">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-600" />
          <span className="ml-3 text-xs text-zinc-500">waevon — Aperçu</span>
        </div>
        <div className="grid gap-0 md:grid-cols-[1fr_220px]">
          <div className="border-b border-white/[0.06] p-5 md:border-b-0 md:border-r md:p-8">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Réservation</p>
            <p className="mt-1 text-lg font-medium text-white">Coupe + barbe</p>
            <p className="mt-4 text-sm text-zinc-400">Choisis un créneau</p>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {["10:00", "10:30", "11:00", "14:00", "14:30", "15:00"].map((t) => (
                <span
                  key={t}
                  aria-hidden
                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-center text-xs font-medium text-zinc-300"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-white/[0.06] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">Confirmé</span>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  Auto
                </span>
              </div>
            </div>
          </div>
          <div className="hidden flex-col bg-zinc-950/50 p-5 md:flex">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Aujourd&apos;hui</p>
            <ul className="mt-4 space-y-2">
              {[
                { t: "10:00", n: "Léa M." },
                { t: "11:30", n: "Thomas" },
                { t: "15:00", n: "Samir" },
              ].map((row) => (
                <li
                  key={row.n}
                  className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
                >
                  <span className="text-xs text-zinc-500">{row.t}</span>
                  <span className="text-xs font-medium text-zinc-200">{row.n}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
