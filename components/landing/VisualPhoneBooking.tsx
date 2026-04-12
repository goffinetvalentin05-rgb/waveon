import { IPhoneMockup } from "react-device-mockup";

const slots = [
  { time: "10:00", selected: false },
  { time: "10:30", selected: true },
  { time: "11:00", selected: false },
  { time: "14:00", selected: false },
] as const;

const SCREEN_W = 286;

function BookingScreen() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      {/* Espace sous l’îlot (mockup en plein écran + îlot en overlay) */}
      <div className="relative shrink-0 px-4 pb-0.5 pt-[46px] md:pt-[50px]">
        <div className="flex items-end justify-between pb-0.5">
          <span className="text-[13px] font-semibold tabular-nums tracking-tight text-neutral-950">
            9:41
          </span>
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
      </div>

      <div className="relative min-h-0 flex-1 px-4 pb-4 pt-0.5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,transparent_100%)]" />

        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
          Réserver
        </p>
        <p className="mt-3 text-center font-display text-xl font-normal leading-[1.1] tracking-[-0.03em] text-neutral-950 md:text-2xl">
          Coupe + barbe
        </p>
        <p className="mt-1 text-center text-[12px] text-neutral-500">45 min</p>

        <div className="mt-5 border-t border-neutral-100 pt-4">
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
          className="mt-5 w-full rounded-2xl bg-neutral-950 py-3.5 text-center text-[15px] font-semibold tracking-tight text-white shadow-[0_10px_28px_-8px_rgba(0,0,0,0.28)]"
        >
          Réserver
        </div>
      </div>
    </div>
  );
}

/**
 * iPhone 15 Pro (Dynamic Island, boutons, ratio 19,5:9) via react-device-mockup,
 * + plateau blanc et inclinaison type landing produit.
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

        <div className="relative z-10 flex justify-center drop-shadow-[0_40px_70px_-20px_rgba(0,0,0,0.35)]">
          <IPhoneMockup
            screenWidth={SCREEN_W}
            screenType="island"
            frameColor="#1b1b1b"
            hideStatusBar
            transparentNavBar
          >
            <BookingScreen />
          </IPhoneMockup>
        </div>
      </div>
    </div>
  );
}
