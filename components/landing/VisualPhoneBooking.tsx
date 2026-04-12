import Image from "next/image";

const slots = [
  { time: "10:00", selected: false },
  { time: "10:30", selected: true },
  { time: "11:00", selected: false },
  { time: "14:00", selected: false },
] as const;

/** Dimensions natives de `public/iphone-mockup.png`. */
const FRAME_NATURAL_W = 1857;
const FRAME_NATURAL_H = 3096;

/**
 * Boîte englobante de la zone écran (noir) dans le PNG, en % du cadre.
 * À affiner si le rendu décale encore (mockup 3/4, îlot visible).
 */
const SCREEN_BOX = {
  top: "17.5%",
  left: "26.5%",
  right: "26.5%",
  bottom: "22%",
} as const;

/**
 * Aligne l’UI plate sur la perspective du téléphone (écran noir du mockup).
 * Ajuster si besoin : rotateY / rotateX / perspective.
 */
const SCREEN_TRANSFORM =
  "perspective(1400px) rotateY(-10deg) rotateX(7deg) rotateZ(-0.8deg) scale(1.02)";

function BookingScreen() {
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.75rem] bg-white md:rounded-[2rem]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-14 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,transparent_100%)]" />

      <div className="relative min-h-0 flex-1 px-3 pb-3 pt-4 md:px-4 md:pb-4 md:pt-5">
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
          Réserver
        </p>
        <p className="mt-2 text-center font-display text-lg font-normal leading-[1.1] tracking-[-0.03em] text-neutral-950 md:text-xl">
          Coupe + barbe
        </p>
        <p className="mt-0.5 text-center text-[11px] text-neutral-500 md:text-[12px]">45 min</p>

        <div className="mt-4 border-t border-neutral-100 pt-3 md:mt-5 md:pt-4">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Créneaux
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 md:mt-3 md:gap-2.5">
            {slots.map(({ time, selected }) => (
              <span
                key={time}
                className={`rounded-xl py-2.5 text-center text-[12px] font-semibold tabular-nums md:rounded-2xl md:py-3 md:text-[13px] ${
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
          className="mt-4 w-full rounded-xl bg-neutral-950 py-3 text-center text-[14px] font-semibold tracking-tight text-white shadow-[0_10px_28px_-8px_rgba(0,0,0,0.28)] md:mt-5 md:rounded-2xl md:py-3.5 md:text-[15px]"
        >
          Réserver
        </div>
      </div>
    </div>
  );
}

/**
 * Mockup photoréaliste 3D (`iphone-mockup.png`) : UI superposée sur l’écran
 * avec transform 3D pour suivre la perspective du PNG.
 */
export function VisualPhoneBooking() {
  return (
    <div
      className="relative mx-auto flex min-h-[min(380px,52vw)] w-full max-w-[min(100%,360px)] shrink-0 items-center justify-center py-10 md:max-w-[440px] md:py-14 md:[perspective:2000px]"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-[10%] -z-20 rounded-[3rem] bg-neutral-300/25 blur-[48px]" />

      <div className="pointer-events-none absolute left-1/2 top-[48%] z-0 h-[78%] w-[108%] max-w-[400px] -translate-x-[46%] -translate-y-1/2 rotate-[-7deg] rounded-[2rem] border border-neutral-200/70 bg-white shadow-[0_28px_80px_-24px_rgba(15,23,42,0.12),0_8px_24px_-8px_rgba(15,23,42,0.06)] md:rounded-[2.25rem]" />

      {/* Pas de rotateX/Y sur le mockup : la perspective est déjà dans le PNG */}
      <div className="relative z-10 mx-auto max-md:[transform:rotate(8deg)]">
        <div
          className="pointer-events-none absolute -bottom-10 left-[6%] right-[6%] z-0 h-32 rounded-[50%] bg-black/[0.18] blur-2xl"
          aria-hidden
        />

        <div className="relative z-10 w-[min(100%,248px)] drop-shadow-[0_36px_80px_-24px_rgba(0,0,0,0.45)] md:w-[min(100%,280px)]">
          <div className="relative w-full [transform-style:preserve-3d]">
            <Image
              src="/iphone-mockup.png"
              alt=""
              width={FRAME_NATURAL_W}
              height={FRAME_NATURAL_H}
              sizes="(max-width: 768px) 248px, 280px"
              className="pointer-events-none relative z-10 block h-auto w-full select-none"
              draggable={false}
              priority={false}
            />

            <div
              className="absolute z-20 overflow-hidden bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] [backface-visibility:hidden] [transform-style:preserve-3d]"
              style={{
                top: SCREEN_BOX.top,
                left: SCREEN_BOX.left,
                right: SCREEN_BOX.right,
                bottom: SCREEN_BOX.bottom,
                transform: SCREEN_TRANSFORM,
                transformOrigin: "50% 42%",
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
