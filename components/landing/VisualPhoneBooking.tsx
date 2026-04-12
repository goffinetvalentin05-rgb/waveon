import Image from "next/image";

const slots = [
  { time: "10:00", selected: false },
  { time: "10:30", selected: true },
  { time: "11:00", selected: false },
  { time: "14:00", selected: false },
] as const;

/** Dimensions natives de `public/iphone.webp` (292×350). */
const FRAME_NATURAL_W = 292;
const FRAME_NATURAL_H = 350;

/**
 * Zone écran dans l’image (pourcentages du cadre), à ajuster si ton export diffère.
 * Calé pour un mockup type « iPhone de face » dans un canvas 292×350.
 */
const SCREEN_INSET = {
  top: "11%",
  left: "9.5%",
  right: "9.5%",
  bottom: "10%",
} as const;

function BookingScreen() {
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] bg-white md:rounded-[1.45rem]">
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
 * Mockup photoréaliste : cadre `iphone.webp` par-dessus l’UI (trou écran = inset %).
 */
export function VisualPhoneBooking() {
  return (
    <div
      className="relative mx-auto flex min-h-[min(380px,52vw)] w-full max-w-[min(100%,360px)] shrink-0 items-center justify-center py-10 md:max-w-[420px] md:py-14 md:[perspective:1600px]"
      aria-hidden
    >
      <div className="pointer-events-none absolute inset-[10%] -z-20 rounded-[3rem] bg-neutral-300/25 blur-[48px]" />

      <div className="pointer-events-none absolute left-1/2 top-[48%] z-0 h-[78%] w-[108%] max-w-[380px] -translate-x-[46%] -translate-y-1/2 rotate-[-7deg] rounded-[2rem] border border-neutral-200/70 bg-white shadow-[0_28px_80px_-24px_rgba(15,23,42,0.12),0_8px_24px_-8px_rgba(15,23,42,0.06)] md:rounded-[2.25rem]" />

      <div className="relative z-10 mx-auto max-md:[transform:rotate(11deg)] md:[transform-style:preserve-3d] md:[transform:rotateX(6deg)_rotateY(10deg)_rotateZ(12deg)]">
        <div
          className="pointer-events-none absolute -bottom-8 left-[8%] right-[8%] z-0 h-28 rounded-[50%] bg-black/[0.16] blur-2xl"
          aria-hidden
        />

        <div className="relative z-10 w-[min(100%,292px)] drop-shadow-[0_40px_70px_-20px_rgba(0,0,0,0.35)]">
          <div
            className="relative w-full"
            style={{ aspectRatio: `${FRAME_NATURAL_W} / ${FRAME_NATURAL_H}` }}
          >
            {/* Contenu écran (sous le cadre WebP si transparence sur la zone écran) */}
            <div
              className="absolute z-0 overflow-hidden bg-neutral-200"
              style={{
                top: SCREEN_INSET.top,
                left: SCREEN_INSET.left,
                right: SCREEN_INSET.right,
                bottom: SCREEN_INSET.bottom,
              }}
            >
              <BookingScreen />
            </div>

            <Image
              src="/iphone.webp"
              alt=""
              width={FRAME_NATURAL_W}
              height={FRAME_NATURAL_H}
              className="pointer-events-none relative z-10 h-auto w-full select-none"
              draggable={false}
              priority={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
