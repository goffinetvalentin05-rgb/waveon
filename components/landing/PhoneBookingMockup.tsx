const slots = [
  { time: "10:00", selected: false },
  { time: "10:30", selected: true },
  { time: "11:00", selected: false },
  { time: "14:00", selected: false },
] as const;

/**
 * Cadre type iPhone — UI de réservation (aperçu produit).
 */
export function PhoneBookingMockup() {
  return (
    <div
      className="relative mx-auto w-[min(100%,260px)] shrink-0"
      aria-hidden
    >
      <div className="rounded-[2.35rem] border-[10px] border-neutral-900 bg-neutral-900 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)]">
        <div className="relative overflow-hidden rounded-[1.65rem] bg-white">
          <div className="mx-auto mt-2 h-5 w-20 rounded-full bg-neutral-900/90" />
          <div className="px-5 pb-6 pt-5">
            <p className="text-center text-[10px] font-medium uppercase tracking-wide text-neutral-400">
              Réserver
            </p>
            <p className="mt-3 text-center font-display text-lg font-normal leading-tight text-neutral-950">
              Coupe + barbe
            </p>
            <p className="mt-1 text-center text-xs text-neutral-500">45 min</p>
            <p className="mt-5 text-[10px] font-medium uppercase tracking-wide text-neutral-400">Créneaux</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {slots.map(({ time, selected }) => (
                <span
                  key={time}
                  className={`rounded-xl py-2.5 text-center text-xs font-medium tabular-nums ${
                    selected
                      ? "border-2 border-neutral-950 bg-white text-neutral-950"
                      : "border border-neutral-200 bg-neutral-50 text-neutral-600"
                  }`}
                >
                  {time}
                </span>
              ))}
            </div>
            <div
              role="presentation"
              className="mt-5 w-full rounded-xl bg-neutral-950 py-3 text-center text-sm font-medium text-white"
            >
              Réserver
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
