const rdv = [
  { time: "10:30", label: "Coupe · Marie D." },
  { time: "14:00", label: "Barbe · Thomas L." },
] as const;

const clients = [
  { initials: "CR", name: "Camille Renard", meta: "Dernière visite · lun." },
  { initials: "JP", name: "Julien Petit", meta: "Nouveau client" },
] as const;

/** Vue unifiée rendez-vous + clients — étape « tout est centralisé ». */
export function VisualCentralHubCard() {
  return (
    <div
      className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-neutral-200/90 bg-white shadow-[0_4px_24px_-6px_rgba(0,0,0,0.08)]"
      aria-hidden
    >
      <div className="border-b border-neutral-100 bg-[#fafafa] px-5 py-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Vue d&apos;ensemble</p>
        <p className="text-sm font-semibold text-neutral-950">{"Rendez-vous & clients"}</p>
      </div>

      <div className="grid divide-y divide-neutral-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="p-4 sm:p-5">
          <p className="text-[11px] font-medium text-neutral-500">Agenda</p>
          <ul className="mt-3 space-y-2">
            {rdv.map((r) => (
              <li
                key={r.time}
                className="rounded-lg border border-neutral-100 bg-neutral-50/80 px-3 py-2.5 text-left"
              >
                <p className="text-xs font-semibold tabular-nums text-neutral-600">{r.time}</p>
                <p className="mt-0.5 text-xs font-medium text-neutral-950">{r.label}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 sm:p-5">
          <p className="text-[11px] font-medium text-neutral-500">Clients</p>
          <ul className="mt-3 space-y-2">
            {clients.map((c) => (
              <li
                key={c.name}
                className="flex items-center gap-2.5 rounded-lg border border-neutral-100 bg-white px-2.5 py-2"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5] text-[9px] font-bold text-neutral-600 ring-1 ring-neutral-200">
                  {c.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-neutral-950">{c.name}</p>
                  <p className="truncate text-[10px] text-neutral-500">{c.meta}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
