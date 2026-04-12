const slots = [
  { time: "10:00", selected: false },
  { time: "10:30", selected: true },
  { time: "11:00", selected: false },
  { time: "14:00", selected: false },
] as const;

type PhoneBookingMockupProps = {
  /** Mise en scène type produit (taille, ombre, léger relief) */
  hero?: boolean;
};

/**
 * Cadre type iPhone — UI de réservation. Variante hero pour une seule mise en scène forte.
 */
export function PhoneBookingMockup({ hero = false }: PhoneBookingMockupProps) {
  const frame = hero
    ? "rounded-[2.65rem] border-[12px] border-neutral-950 bg-neutral-950 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.35),0_12px_24px_-8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.06)]"
    : "rounded-[2.35rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)]";

  const width = hero
    ? "w-[min(100%,min(340px,92vw))] md:w-[min(360px,42vw)] lg:w-[380px]"
    : "w-[min(100%,260px)]";

  return (
    <div className={`relative mx-auto shrink-0 ${width}`} aria-hidden>
      {hero ? (
        <div
          className="pointer-events-none absolute left-1/2 top-[52%] -z-10 h-[min(420px,55vh)] w-[min(420px,95vw)] -translate-x-1/2 -translate-y-1/2 rounded-[100%] bg-neutral-300/35 blur-3xl"
          aria-hidden
        />
      ) : null}

      <div className={hero ? "relative -rotate-[1.75deg] md:-rotate-2" : "relative"}>
        <div
          className={`absolute ${hero ? "-left-1 top-28" : "-left-0.5 top-24"} z-10 hidden h-14 w-[3px] rounded-l-full bg-neutral-800 sm:block`}
          aria-hidden
        />

        <div className={`relative ${frame}`}>
          <div className="relative overflow-hidden rounded-[1.85rem] bg-neutral-950 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
            <div className="relative bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              <div className="flex items-center justify-between px-5 pb-1 pt-3">
                <span className="text-[11px] font-semibold tabular-nums text-neutral-950">9:41</span>
                <div className="absolute left-1/2 top-2.5 h-6 w-[4.5rem] -translate-x-1/2 rounded-full bg-neutral-950" />
                <div className="flex items-center gap-1 pr-0.5">
                  <span className="h-2.5 w-3 rounded-sm border border-neutral-300 bg-white" />
                  <span className="text-[10px] font-semibold text-neutral-900">5G</span>
                </div>
              </div>

              <div className={`px-5 ${hero ? "pb-8 pt-2" : "pb-6 pt-5"}`}>
                <p className="text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                  Réserver
                </p>
                <p
                  className={`mt-4 text-center font-display font-normal leading-[1.15] tracking-tight text-neutral-950 ${
                    hero ? "text-xl md:text-2xl" : "text-lg"
                  }`}
                >
                  Coupe + barbe
                </p>
                <p className="mt-1.5 text-center text-xs text-neutral-500">45 min · en salon</p>

                <div className={`mt-6 border-t border-neutral-100 pt-5 ${hero ? "mt-7 pt-6" : ""}`}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                    Créneaux
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    {slots.map(({ time, selected }) => (
                      <span
                        key={time}
                        className={`rounded-xl py-3 text-center text-[13px] font-semibold tabular-nums transition-colors ${
                          selected
                            ? "border-2 border-neutral-950 bg-neutral-950 text-white shadow-sm"
                            : "border border-neutral-200 bg-neutral-50 text-neutral-600"
                        }`}
                      >
                        {time}
                      </span>
                    ))}
                  </div>
                </div>

                <div
                  role="presentation"
                  className={`mt-6 w-full rounded-2xl bg-neutral-950 text-center font-semibold text-white shadow-[0_4px_14px_-2px_rgba(0,0,0,0.25)] ${
                    hero ? "py-3.5 text-[15px]" : "py-3 text-sm"
                  }`}
                >
                  Réserver
                </div>
              </div>
            </div>
          </div>
        </div>

        {hero ? (
          <div
            className="pointer-events-none absolute -bottom-6 left-[12%] right-[12%] h-6 rounded-[100%] bg-neutral-400/20 blur-md"
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
}
