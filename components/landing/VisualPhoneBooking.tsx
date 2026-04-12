const slots = [
  { time: "10:00", selected: false },
  { time: "10:30", selected: true },
  { time: "11:00", selected: false },
  { time: "14:00", selected: false },
] as const;

/**
 * iPhone style présentation produit (réf. taap.it / Apple) :
 * plateau blanc en retrait + téléphone incliné, bordures fines, ombre diffuse.
 */
export function VisualPhoneBooking() {
  return (
    <div
      className="relative mx-auto flex min-h-[min(380px,52vw)] w-full max-w-[min(100%,360px)] shrink-0 items-center justify-center py-10 md:max-w-[400px] md:py-14 md:[perspective:1600px]"
      aria-hidden
    >
      {/* Halo très doux */}
      <div className="pointer-events-none absolute inset-[10%] -z-20 rounded-[3rem] bg-neutral-300/25 blur-[48px]" />

      {/* Couche « carte » blanche derrière (effet taap.it) */}
      <div className="pointer-events-none absolute left-1/2 top-[48%] z-0 h-[78%] w-[108%] max-w-[380px] -translate-x-[46%] -translate-y-1/2 rotate-[-7deg] rounded-[2rem] border border-neutral-200/70 bg-white shadow-[0_28px_80px_-24px_rgba(15,23,42,0.12),0_8px_24px_-8px_rgba(15,23,42,0.06)] md:rounded-[2.25rem]" />

      {/* Appareil — ~15° vers la droite ; 3D sur md+ */}
      <div className="relative z-10 mx-auto w-[min(100%,300px)] max-md:[transform:rotate(11deg)] md:w-[min(100%,318px)] md:[transform-style:preserve-3d] md:[transform:rotateX(6deg)_rotateY(10deg)_rotateZ(12deg)]">
        {/* Ombre portée diffuse sous l’iPhone */}
        <div
          className="pointer-events-none absolute -bottom-6 left-[10%] right-[10%] z-0 h-24 rounded-[50%] bg-black/[0.14] blur-2xl"
          aria-hidden
        />

        {/* Boutons latéraux (très discrets) */}
        <div className="absolute -left-[1px] top-[26%] z-20 hidden flex-col gap-6 sm:flex" aria-hidden>
          <span className="h-7 w-[2.5px] rounded-l-sm bg-[linear-gradient(180deg,#4a4a4a,#1f1f1f)] shadow-[inset_-1px_0_0_rgba(255,255,255,0.05)]" />
          <span className="h-12 w-[2.5px] rounded-l-sm bg-[linear-gradient(180deg,#4a4a4a,#1f1f1f)] shadow-[inset_-1px_0_0_rgba(255,255,255,0.05)]" />
        </div>

        {/* Châssis — fin, type Pro / titane foncé */}
        <div className="relative rounded-[2.65rem] bg-[linear-gradient(155deg,#3f3f3f_0%,#141414_42%,#0a0a0a_100%)] p-px shadow-[0_36px_90px_-24px_rgba(0,0,0,0.22),0_12px_32px_-12px_rgba(0,0,0,0.14)]">
          <div className="rounded-[2.6rem] bg-[linear-gradient(180deg,#121212,#050505)] p-[7px] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-8px_16px_rgba(0,0,0,0.5)] md:p-[8px]">
            <div className="overflow-hidden rounded-[2.1rem] bg-black ring-1 ring-white/[0.06]">
              <div className="relative bg-white">
                {/* Lueur haut écran */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.85)_0%,transparent_72%)]" />

                <div className="relative px-4 pb-5 pt-2.5 md:px-[18px]">
                  {/* Barre d’état + Dynamic Island type Pro */}
                  <div className="relative flex h-8 items-end justify-between pb-0.5">
                    <span className="text-[13px] font-semibold tabular-nums tracking-tight text-neutral-950">9:41</span>
                    <div className="absolute left-1/2 top-0.5 h-[27px] w-[92px] -translate-x-1/2 rounded-full bg-black shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_-1px_2px_rgba(255,255,255,0.06)]" />
                    <div className="flex items-center gap-1.5 pr-0.5">
                      <span className="flex gap-[3px] pb-0.5" aria-hidden>
                        {[0, 1, 2, 3].map((i) => (
                          <span
                            key={i}
                            className={`h-[3px] w-[3px] rounded-full ${i < 3 ? "bg-neutral-950" : "bg-neutral-300"}`}
                          />
                        ))}
                      </span>
                      <span className="text-[11px] font-bold tracking-tight text-neutral-900">5G</span>
                      <span className="flex h-[11px] w-[22px] items-center justify-end rounded-[3px] border border-neutral-300/90 bg-white pr-[2px]">
                        <span className="h-[7px] w-[58%] rounded-[1px] bg-neutral-950" />
                      </span>
                    </div>
                  </div>

                  <div className="relative mt-0.5">
                    <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                      Réserver
                    </p>
                    <p className="mt-3 text-center font-display text-xl font-normal leading-[1.1] tracking-[-0.03em] text-neutral-950 md:text-2xl">
                      Coupe + barbe
                    </p>
                    <p className="mt-1 text-center text-[12px] text-neutral-500">45 min</p>

                    <div className="mt-6 border-t border-neutral-100 pt-5">
                      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                        Créneaux
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2.5">
                        {slots.map(({ time, selected }) => (
                          <span
                            key={time}
                            className={`rounded-2xl py-3 text-center text-[13px] font-semibold tabular-nums ${
                              selected
                                ? "bg-neutral-950 text-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.22)]"
                                : "border border-neutral-200/90 bg-white text-neutral-600 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                            }`}
                          >
                            {time}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div
                      role="presentation"
                      className="mt-6 w-full rounded-2xl bg-neutral-950 py-3.5 text-center text-[15px] font-semibold tracking-tight text-white shadow-[0_10px_28px_-8px_rgba(0,0,0,0.28)]"
                    >
                      Réserver
                    </div>

                    <div className="mx-auto mt-5 h-1 w-[30%] min-w-[100px] rounded-full bg-neutral-900/[0.18]" />
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
