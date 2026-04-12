export function LandingProductPreview() {
  return (
    <section className="border-t border-white/[0.06] px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-6xl">
        <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
          Aperçu produit
        </p>
        <div className="mt-12 grid gap-6 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-5">
            <p className="mb-4 text-sm font-medium text-zinc-400">Page de réservation</p>
            <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-900/40 p-6 shadow-xl">
              <div className="mx-auto max-w-[200px] space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-white/[0.08]" />
                <div className="space-y-2">
                  <div className="h-3 w-[75%] rounded-full bg-white/[0.12]" />
                  <div className="h-3 w-1/2 rounded-full bg-white/[0.08]" />
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {["Lun", "Mar", "Mer", "Jeu"].map((d) => (
                    <div
                      key={d}
                      className="rounded-xl border border-white/[0.06] py-3 text-center text-xs text-zinc-500"
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl bg-white text-center py-3 text-xs font-semibold text-zinc-900">
                  Réserver
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-4">
            <p className="mb-4 text-sm font-medium text-zinc-400">Tableau de bord</p>
            <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-zinc-900/40 p-5 shadow-xl">
              <div className="mb-4 flex gap-2">
                <div className="h-8 flex-1 rounded-xl bg-white/[0.06]" />
                <div className="h-8 w-20 rounded-xl bg-white/[0.06]" />
              </div>
              <ul className="space-y-2">
                {["09:00 — Emma", "10:30 — Hugo", "14:00 — Inès", "16:00 — Paul"].map((line) => (
                  <li
                    key={line}
                    className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-3 text-xs text-zinc-300"
                  >
                    <span>{line}</span>
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400/90">
                      OK
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="lg:col-span-3">
            <p className="mb-4 text-sm font-medium text-zinc-400">Mobile</p>
            <div className="mx-auto flex max-w-[220px] justify-center lg:mx-0">
              <div className="relative w-full rounded-[2rem] border-[10px] border-zinc-800 bg-zinc-950 p-3 shadow-2xl">
                <div className="absolute left-1/2 top-2 h-1 w-12 -translate-x-1/2 rounded-full bg-zinc-800" />
                <div className="mt-6 space-y-3 rounded-2xl bg-zinc-900/80 p-4">
                  <div className="h-2 w-16 rounded-full bg-white/20" />
                  <div className="h-2 w-full rounded-full bg-white/10" />
                  <div className="h-2 w-[80%] rounded-full bg-white/10" />
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="h-10 rounded-xl bg-white/[0.06]" />
                    <div className="h-10 rounded-xl bg-white/[0.06]" />
                  </div>
                  <div className="h-11 w-full rounded-xl bg-white text-center text-xs font-semibold leading-[2.75rem] text-zinc-900">
                    Confirmer
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
