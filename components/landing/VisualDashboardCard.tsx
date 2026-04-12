const rows = [
  { time: "09:00", name: "Marie D.", day: "Lun 10" },
  { time: "10:30", name: "Thomas L.", day: "Lun 10" },
  { time: "14:00", name: "Samira K.", day: "Mar 11" },
  { time: "16:30", name: "Lucas P.", day: "Mar 11" },
] as const;

/** Carte type agenda / dashboard (étape 2). */
export function VisualDashboardCard() {
  return (
    <div
      className="mx-auto w-full max-w-md rounded-3xl border border-neutral-200/90 bg-white p-5 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.08)] md:p-6"
      aria-hidden
    >
      <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
        <p className="text-sm font-semibold text-neutral-950">Rendez-vous</p>
        <span className="rounded-full bg-[#f5f5f5] px-2.5 py-1 text-[11px] font-medium text-neutral-600">
          Semaine
        </span>
      </div>
      <ul className="divide-y divide-neutral-100">
        {rows.map((row) => (
          <li key={`${row.day}-${row.time}`} className="flex items-center justify-between gap-3 py-3.5">
            <div className="min-w-0">
              <p className="text-[11px] text-neutral-500">{row.day}</p>
              <p className="text-sm font-medium text-neutral-950">{row.name}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs font-semibold tabular-nums text-neutral-600">{row.time}</span>
              <span className="rounded-md bg-[#f5f5f5] px-2 py-0.5 text-[10px] font-medium text-neutral-700">
                OK
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
