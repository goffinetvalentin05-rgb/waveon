const slots = [
  { time: "10:00", selected: false },
  { time: "10:30", selected: true },
  { time: "11:00", selected: false },
  { time: "14:00", selected: false },
] as const;

/**
 * Présentation produit type hero (style Apple / taap.it) — cadre iPhone, lumière et profondeur.
 */
export function VisualPhoneBooking() {
  return (
    <div
      className="relative mx-auto w-full max-w-[min(100%,308px)] shrink-0 pb-14 pt-2 md:max-w-[min(100%,340px)] md:pb-16 md:pt-4 md:[perspective:1400px]"
      aria-hidden
    >
      {/* Halo d’ambiance */}
      <div className="pointer-events-none absolute left-1/2 top-[46%] -z-10 h-[min(420px,52vh)] w-[min(420px,92vw)] max-w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-[100%] bg-neutral-400/30 blur-[56px]" />

      {/* Reflet au sol (silhouette très douce) */}
      <div className="pointer-events-none absolute bottom-2 left-1/2 z-0 h-10 w-[68%] max-w-[220px] -translate-x-1/2 rounded-[100%] bg-neutral-900/[0.12] blur-xl" />

      <div className="relative z-[1] mx-auto -rotate-[1.25deg] [transform-style:preserve-3d] md:-rotate-0 md:[transform:rotateX(3.5deg)_rotateY(-3.5deg)_rotateZ(-2.2deg)]">
        {/* Boutons latéraux */}
        <div className="absolute -left-[2px] top-[22%] z-20 hidden flex-col gap-5 sm:flex" aria-hidden>
          <span className="h-8 w-[3px] rounded-l-sm bg-[linear-gradient(180deg,#525252,#262626)] shadow-[inset_-1px_0_0_rgba(255,255,255,0.06)]" />
          <span className="h-14 w-[3px] rounded-l-sm bg-[linear-gradient(180deg,#525252,#262626)] shadow-[inset_-1px_0_0_rgba(255,255,255,0.06)]" />
        </div>

        {/* Châssis extérieur — bord poli + volume */}
        <div className="rounded-[2.85rem] bg-[linear-gradient(165deg,#525252_0%,#1a1a1a_38%,#0d0d0d_100%)] p-[2px] shadow-[0_48px_100px_-28px_rgba(0,0,0,0.45),0_24px_48px_-20px_rgba(0,0,0,0.28),0_2px_0_rgba(255,255,255,0.08)_inset]">
          <div className="rounded-[2.75rem] bg-[linear-gradient(180deg,#171717_0%,#0a0a0a_100%)] p-[11px] shadow-[inset_0_2px_4px_rgba(255,255,255,0.06),inset_0_-6px_12px_rgba(0,0,0,0.45)]">
            {/* Écran */}
            <div className="relative overflow-hidden rounded-[2.05rem] bg-neutral-950 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
              <div className="relative bg-[#fbfbfb] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-20px_40px_-20px_rgba(0,0,0,0.04)]">
                {/* Lueur haut d’écran */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0.7)_0%,transparent_100%)] opacity-90" />

                <div className="relative px-[18px] pb-5 pt-3">
                  {/* Barre d’état */}
                  <div className="relative flex h-7 items-end justify-between pb-1">
                    <span className="text-[12px] font-semibold leading-none tracking-tight text-neutral-950">9:41</span>
                    <div className="absolute left-1/2 top-0 h-[26px] w-[88px] -translate-x-1/2 rounded-full bg-neutral-950 shadow-[0_4px_12px_rgba(0,0,0,0.25),inset_0_-2px_4px_rgba(255,255,255,0.08)]" />
                    <div className="flex items-center gap-1 pr-0.5">
                      <span className="flex gap-0.5 pt-0.5" aria-hidden>
                        <span className="h-[3px] w-[3px] rounded-full bg-neutral-950" />
                        <span className="h-[3px] w-[3px] rounded-full bg-neutral-950" />
                        <span className="h-[3px] w-[3px] rounded-full bg-neutral-950" />
                        <span className="h-[3px] w-[3px] rounded-full bg-neutral-300" />
                      </span>
                      <span className="pl-0.5 text-[10px] font-bold leading-none tracking-tight text-neutral-900">
                        5G
                      </span>
                      <span className="ml-0.5 flex h-3 w-5 items-center justify-end rounded-sm border border-neutral-300/90 bg-white pr-[2px]">
                        <span className="h-2 w-[55%] rounded-[1px] bg-neutral-950" />
                      </span>
                    </div>
                  </div>

                  <div className="relative mt-1">
                    <p className="text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      Réserver
                    </p>
                    <p className="mt-3 text-center font-display text-[1.35rem] font-normal leading-[1.12] tracking-[-0.02em] text-neutral-950 md:text-2xl">
                      Coupe + barbe
                    </p>
                    <p className="mt-1 text-center text-[12px] text-neutral-500">45 min</p>

                    <div className="mt-6 border-t border-neutral-200/90 pt-5">
                      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
                        Créneaux
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {slots.map(({ time, selected }) => (
                          <span
                            key={time}
                            className={`rounded-xl py-2.5 text-center text-[13px] font-semibold tabular-nums transition-shadow ${
                              selected
                                ? "border-0 bg-neutral-950 text-white shadow-[0_6px_16px_-4px_rgba(0,0,0,0.25)]"
                                : "border border-neutral-200/90 bg-white text-neutral-600 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                            }`}
                          >
                            {time}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div
                      role="presentation"
                      className="mt-6 w-full rounded-2xl bg-neutral-950 py-3.5 text-center text-[15px] font-semibold tracking-tight text-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.35)]"
                    >
                      Réserver
                    </div>

                    {/* Indicateur d’accueil */}
                    <div className="mx-auto mt-5 h-[5px] w-[31%] min-w-[96px] rounded-full bg-neutral-900/25" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
