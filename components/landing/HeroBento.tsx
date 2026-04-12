/**
 * Aperçus UI réalistes (données fictives) — décoratif, hors copie marketing config.
 */
export function HeroBento() {
  return (
    <div
      className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5 lg:gap-6"
      aria-hidden
    >
      {/* Réservation */}
      <div className="rounded-3xl border border-neutral-200/90 bg-white p-5 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] md:col-span-7 md:p-6">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
          <span className="text-xs font-medium text-neutral-500">Réserver</span>
          <span className="rounded-full bg-[#f5f5f5] px-2.5 py-0.5 text-[10px] font-medium text-neutral-600">
            Aujourd&apos;hui
          </span>
        </div>
        <p className="mt-4 font-medium text-neutral-950">Coupe femme</p>
        <p className="mt-0.5 text-xs text-neutral-600">45 min · avec shampoing</p>
        <div className="mt-4 flex gap-1.5">
          {["Lun", "Mar", "Mer", "Jeu", "Ven"].map((d, i) => (
            <span
              key={d}
              className={`flex h-9 flex-1 items-center justify-center rounded-lg text-[11px] font-medium ${
                i === 2 ? "bg-neutral-950 text-white" : "bg-[#f5f5f5] text-neutral-600"
              }`}
            >
              {d}
            </span>
          ))}
        </div>
        <p className="mt-5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">Créneaux</p>
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-4">
          {[
            { t: "10:00", on: true },
            { t: "10:30", on: false },
            { t: "11:00", on: false },
            { t: "14:00", on: false },
          ].map(({ t, on }) => (
            <span
              key={t}
              className={`rounded-lg py-2.5 text-center text-xs font-medium tabular-nums ${
                on
                  ? "border-2 border-neutral-950 bg-white text-neutral-950"
                  : "border border-neutral-200 bg-[#f5f5f5] text-neutral-600"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
        <div
          role="presentation"
          className="mt-5 w-full rounded-xl bg-neutral-950 py-3 text-center text-sm font-medium text-white"
        >
          Confirmer le créneau
        </div>
      </div>

      {/* Agenda du jour */}
      <div className="rounded-3xl border border-neutral-200/90 bg-white p-5 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] md:col-span-5 md:p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-neutral-950">Agenda</p>
          <span className="text-xs text-neutral-500">12 juin</span>
        </div>
        <ul className="mt-4 space-y-0 divide-y divide-neutral-100 border-y border-neutral-100">
          {[
            { time: "09:00", name: "Marie D.", status: "Confirmé" },
            { time: "10:30", name: "Thomas L.", status: "Confirmé" },
            { time: "14:00", name: "Samira K.", status: "En attente" },
            { time: "16:15", name: "Lucas P.", status: "Confirmé" },
          ].map((row) => (
            <li key={row.time} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-xs font-medium tabular-nums text-neutral-500">{row.time}</p>
                <p className="truncate text-sm text-neutral-950">{row.name}</p>
              </div>
              <span className="shrink-0 rounded-md bg-[#f5f5f5] px-2 py-0.5 text-[10px] font-medium text-neutral-700">
                {row.status}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Clients */}
      <div className="rounded-3xl border border-neutral-200/90 bg-white p-5 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] md:col-span-6 md:p-6">
        <p className="text-sm font-medium text-neutral-950">Clients</p>
        <p className="mt-0.5 text-xs text-neutral-500">Dernières fiches</p>
        <ul className="mt-4 space-y-3">
          {[
            { initials: "MD", name: "Marie Dubois", email: "marie.d@email.com" },
            { initials: "TL", name: "Thomas Leroy", email: "t.leroy@email.com" },
            { initials: "SK", name: "Samira Kaci", email: "samira.k@email.com" },
          ].map((c) => (
            <li
              key={c.email}
              className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-[#f5f5f5]/50 px-3 py-2.5"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-neutral-700 ring-1 ring-neutral-200">
                {c.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-950">{c.name}</p>
                <p className="truncate text-xs text-neutral-500">{c.email}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Mini calendrier + résumé */}
      <div className="rounded-3xl border border-neutral-200/90 bg-[#f5f5f5] p-5 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] md:col-span-6 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-neutral-500">Cette semaine</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-950">24</p>
            <p className="text-xs text-neutral-600">rendez-vous</p>
          </div>
          <div className="grid shrink-0 grid-cols-3 gap-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-sm ${i === 4 ? "bg-neutral-950" : "bg-neutral-300/80"}`}
              />
            ))}
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-neutral-200/80 bg-white p-4">
          <p className="text-xs font-medium text-neutral-950">Prochain créneau libre</p>
          <p className="mt-1 text-sm text-neutral-600">Mer · 11:30</p>
        </div>
      </div>
    </div>
  );
}
