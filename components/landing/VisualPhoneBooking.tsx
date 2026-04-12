import Image from "next/image";

/** Dimensions natives de `public/mockup_iphone.png`. */
const FRAME_NATURAL_W = 1587;
const FRAME_NATURAL_H = 2245;

/**
 * Mockup iPhone seul (`mockup_iphone.png`) — aucune couche UI par-dessus.
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
          <Image
            src="/mockup_iphone.png"
            alt=""
            width={FRAME_NATURAL_W}
            height={FRAME_NATURAL_H}
            sizes="(max-width: 768px) 248px, 280px"
            className="pointer-events-none block h-auto w-full select-none"
            draggable={false}
            priority={false}
          />
        </div>
      </div>
    </div>
  );
}
