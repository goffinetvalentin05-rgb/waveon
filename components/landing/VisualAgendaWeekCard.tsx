const days = [
  { label: "Lun", fill: 0.35 },
  { label: "Mar", fill: 0.55 },
  { label: "Mer", fill: 0.9 },
  { label: "Jeu", fill: 0.45 },
  { label: "Ven", fill: 0.7 },
] as const;

const slots = [
  { time: "09:00", name: "Marie D.", hint: "Coupe" },
  { time: "10:30", name: "Thomas L.", hint: "Barbe" },
  { time: "14:00", name: "Samira K.", hint: "Couleur" },
  { time: "16:30", name: "Lucas P.", hint: "Soin" },
] as const;

/** Mockup agenda / semaine — étape « ton agenda se remplit ». */
export function VisualAgendaWeekCard() {
  return (
    <div
      className="mx-auto w-full max-w-md rounded-3xl border border-neutral-200/90 bg-white p-5 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.08)] md:p-6"
      aria-hidden
    >
      <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-4">
        <div>
          <p className="text-sm font-semibold text-neutral-950">Agenda</p>
          <p className="mt-0.5 text-[11px] text-neutral-500">Semaine en cours · créneaux confirmés</p>
        </div>
        <span className="shrink-0 rounded-full bg-neutral-950 px-2.5 py-1 text-[11px] font-medium text-white">
          +4
        </span>
      </div>

      <div className="mt-4 flex justify-between gap-1">
        {days.map((d) => (
          <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="text-[9px] font-medium text-neutral-400 sm:text-[10px]">{d.label}</span>
            <div className="relative h-14 w-full overflow-hidden rounded-xl bg-[#f5f5f5]">
              <div
                className="absolute bottom-0 left-0 right-0 rounded-t-lg bg-neutral-950/90"
                style={{ height: `${Math.round(d.fill * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Aujourd&apos;hui</p>
      <ul className="mt-2 divide-y divide-neutral-100 rounded-xl border border-neutral-100 bg-neutral-50/40">
        {slots.map((row) => (
          <li key={row.time} className="flex items-center justify-between gap-3 px-3 py-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold tabular-nums text-neutral-600">{row.time}</p>
              <p className="truncate text-sm font-medium text-neutral-950">{row.name}</p>
              <p className="text-[11px] text-neutral-500">{row.hint}</p>
            </div>
            <span className="shrink-0 rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-neutral-700 ring-1 ring-neutral-200/90">
              OK
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
