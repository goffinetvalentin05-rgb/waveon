import Image from "next/image";

const slots = [
  { time: "10:00", selected: false },
  { time: "10:30", selected: true },
  { time: "11:00", selected: false },
  { time: "14:00", selected: false },
] as const;

/** Dimensions natives de `public/mockup_iphone.png`. */
const FRAME_NATURAL_W = 1587;
const FRAME_NATURAL_H = 2245;

/**
 * Zone écran dans `mockup_iphone.png` (1587×2245).
 * Pas de transform 3D ici : la perspective est déjà dans le PNG ; un rotateX/Y
 * ne s’appliquait qu’à l’UI et créait le décalage / débordement visible.
 */
const SCREEN_BOX = {
  top: "22%",
  left: "19%",
  right: "21%",
  bottom: "17%",
} as const;

/**
 * Contenu « app » : haut (titre + service + grille), CTA ancré en bas (comportement natif).
 */
function BookingScreen() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white px-6 pb-8 pt-[5.75rem] text-center text-neutral-950">
      <header className="shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
          Réserver
        </p>
      </header>

      <div className="mt-4 shrink-0">
        <p className="font-display text-[1.05rem] font-normal leading-[1.2] tracking-[-0.02em]">
          Coupe + barbe
        </p>
        <p className="mt-1 text-[12px] leading-none text-neutral-500">45 min</p>
      </div>

      <div className="mt-5 min-h-0 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
          Créneaux
        </p>
        <div className="mt-2.5 grid grid-cols-2 gap-3">
          {slots.map(({ time, selected }) => (
            <span
              key={time}
              className={`rounded-2xl px-1 py-2.5 text-center text-[13px] font-semibold tabular-nums leading-none ${
                selected
                  ? "bg-neutral-950 text-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.35)]"
                  : "border border-neutral-200 bg-neutral-50/80 text-neutral-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              }`}
            >
              {time}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto w-full shrink-0 pt-6">
        <div
          role="presentation"
          className="w-full rounded-2xl bg-neutral-950 py-3 text-[15px] font-semibold leading-none tracking-tight text-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.25)]"
        >
          Réserver
        </div>
      </div>
    </div>
  );
}

/**
 * Mockup photoréaliste `mockup_iphone.png` + UI alignée sur l’écran.
 */
export function VisualPhoneBooking() {
  return (
    <div
      className="relative mx-auto flex min-h-[min(380px,52vw)] w-full max-w-[min(100%,360px)] shrink-0 items-center justify-center py-10 md:max-w-[440px] md:py-14"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-[10%] -z-20 rounded-[3rem] bg-neutral-300/25 blur-[48px]" />

      <div className="pointer-events-none absolute left-1/2 top-[48%] z-0 h-[78%] w-[108%] max-w-[400px] -translate-x-[46%] -translate-y-1/2 rotate-[-7deg] rounded-[2rem] border border-neutral-200/70 bg-white shadow-[0_28px_80px_-24px_rgba(15,23,42,0.12),0_8px_24px_-8px_rgba(15,23,42,0.06)] md:rounded-[2.25rem]" />

      <div className="relative z-10 mx-auto max-md:[transform:rotate(8deg)]">
        <div
          className="pointer-events-none absolute -bottom-10 left-[6%] right-[6%] z-0 h-32 rounded-[50%] bg-black/[0.18] blur-2xl"
          aria-hidden
        />

        <div className="relative z-10 w-[min(100%,248px)] drop-shadow-[0_36px_80px_-24px_rgba(0,0,0,0.45)] md:w-[min(100%,280px)]">
          <div className="relative w-full">
            <Image
              src="/mockup_iphone.png"
              alt=""
              width={FRAME_NATURAL_W}
              height={FRAME_NATURAL_H}
              sizes="(max-width: 768px) 248px, 280px"
              className="pointer-events-none relative z-10 block h-auto w-full select-none"
              draggable={false}
              priority={false}
            />

            <div
              className="absolute z-20 overflow-hidden rounded-[2rem] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06),inset_0_18px_40px_-12px_rgba(255,255,255,0.65),inset_0_-10px_28px_-14px_rgba(0,0,0,0.07)] ring-1 ring-black/[0.04]"
              style={{
                top: SCREEN_BOX.top,
                left: SCREEN_BOX.left,
                right: SCREEN_BOX.right,
                bottom: SCREEN_BOX.bottom,
              }}
            >
              <BookingScreen />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
