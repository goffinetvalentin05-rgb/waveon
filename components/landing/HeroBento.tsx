/**
 * Décoratif uniquement — aucun texte marketing (hors contenu config).
 */
export function HeroBento() {
  return (
    <div
      className="mt-16 grid grid-cols-2 gap-3 md:mt-20 md:grid-cols-12 md:gap-4 lg:gap-5"
      aria-hidden
    >
      <div className="col-span-2 flex flex-col rounded-3xl border border-violet-100/80 bg-white p-4 shadow-sm md:col-span-5 md:p-5">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <span className="h-2 w-12 rounded-full bg-neutral-200" />
          <span className="h-6 w-6 rounded-full bg-violet-100" />
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-neutral-50" />
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <span className="h-8 flex-1 rounded-xl bg-violet-50" />
          <span className="h-8 flex-1 rounded-xl bg-neutral-50" />
          <span className="h-8 flex-1 rounded-xl bg-neutral-50" />
        </div>
      </div>

      <div className="col-span-1 flex flex-col rounded-3xl border border-violet-100/80 bg-white p-4 shadow-sm md:col-span-4 md:p-5">
        <span className="h-2 w-20 rounded-full bg-neutral-200" />
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50/80 px-3 py-2"
            >
              <span className="h-3 w-3 rounded-full border-2 border-violet-200" />
              <span className="h-2 flex-1 rounded-full bg-neutral-200" />
            </div>
          ))}
        </div>
      </div>

      <div className="col-span-1 flex flex-col rounded-3xl border border-violet-100/80 bg-white p-4 shadow-sm md:col-span-3 md:p-5">
        <span className="h-2 w-16 rounded-full bg-neutral-200" />
        <div className="mt-4 grid grid-cols-2 gap-2">
          {["09:00", "10:00", "11:00", "14:00"].map((t) => (
            <span
              key={t}
              className="rounded-xl border border-neutral-100 bg-neutral-50 py-2 text-center text-[10px] font-medium tabular-nums text-neutral-500"
            >
              {t}
            </span>
          ))}
        </div>
        <span className="mt-auto h-9 rounded-xl bg-indigo-950/90" />
      </div>

      <div className="col-span-2 rounded-3xl border border-violet-100/80 bg-gradient-to-br from-violet-50/80 to-white p-4 shadow-sm md:col-span-7 md:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="h-24 w-32 rounded-2xl border border-white bg-white/90 shadow-sm" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <span className="h-2 w-32 rounded-full bg-neutral-200" />
            <span className="h-2 w-20 rounded-full bg-neutral-100" />
            <div className="mt-2 flex gap-2">
              <span className="h-6 w-14 rounded-lg bg-violet-200/60" />
              <span className="h-6 w-14 rounded-lg bg-neutral-100" />
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-2 flex items-center gap-3 rounded-3xl border border-violet-100/80 bg-white p-4 shadow-sm md:col-span-5 md:p-4">
        <span className="h-11 w-11 shrink-0 rounded-2xl bg-violet-100" />
        <div className="min-w-0 flex-1 space-y-2">
          <span className="block h-2 w-24 rounded-full bg-neutral-200" />
          <span className="block h-2 w-40 max-w-full rounded-full bg-neutral-100" />
        </div>
      </div>
    </div>
  );
}
