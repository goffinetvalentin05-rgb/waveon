const clients = [
  { name: "Camille Renard", email: "camille.r@mail.fr" },
  { name: "Julien Petit", email: "j.petit@mail.fr" },
  { name: "Nora El Mansouri", email: "nora.e@mail.fr" },
  { name: "Antoine Vidal", email: "antoine.v@mail.fr" },
] as const;

/** Liste clients (étape 3). */
export function VisualClientsCard() {
  return (
    <div
      className="mx-auto w-full max-w-md rounded-3xl border border-neutral-200/90 bg-white shadow-[0_4px_24px_-6px_rgba(0,0,0,0.08)] transition-shadow duration-[420ms] ease-out hover:shadow-[0_10px_28px_-10px_rgba(0,0,0,0.09)]"
      aria-hidden
    >
      <div className="border-b border-neutral-100 bg-[#f5f5f5] px-5 py-3.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Clients</p>
        <p className="text-sm font-semibold text-neutral-950">Liste récente</p>
      </div>
      <ul className="landing-story-client-rows divide-y divide-neutral-100 px-2 py-1">
        {clients.map((c) => (
          <li key={c.email} className="flex items-center gap-3 px-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5f5f5] text-[10px] font-bold text-neutral-600 ring-1 ring-neutral-200">
              {c.name
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-950">{c.name}</p>
              <p className="truncate text-xs text-neutral-500">{c.email}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
