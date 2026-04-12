import type { ReactNode } from "react";

const cardShell =
  "group relative overflow-hidden rounded-3xl border border-neutral-200/70 " +
  "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_-6px_rgba(0,0,0,0.08),0_24px_48px_-12px_rgba(0,0,0,0.06)] " +
  "transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] " +
  "hover:-translate-y-1.5 hover:border-neutral-300/85 " +
  "hover:shadow-[0_4px_12px_rgba(0,0,0,0.05),0_18px_40px_-8px_rgba(0,0,0,0.12),0_40px_72px_-20px_rgba(0,0,0,0.1)] " +
  "active:translate-y-0 active:scale-[0.995] " +
  "motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 " +
  "motion-reduce:hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_-6px_rgba(0,0,0,0.08)]";

/** Léger éclat en bordure haute au survol — donne du volume sans bouger le contenu. */
function CardDepthSheen() {
  return (
    <>
      <span
        className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-neutral-950/[0.04] via-transparent to-transparent opacity-100"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 motion-reduce:group-hover:opacity-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, transparent 42%, transparent 100%), linear-gradient(to bottom, rgba(0,0,0,0.03), transparent 35%)",
        }}
        aria-hidden
      />
    </>
  );
}

function HeroBentoCard({
  variant,
  className,
  children,
}: {
  variant: "white" | "muted";
  className?: string;
  children: ReactNode;
}) {
  const bg = variant === "muted" ? "bg-[#f5f5f5]" : "bg-white";
  return (
    <div className={`${cardShell} ${bg} ${className ?? ""}`}>
      <CardDepthSheen />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

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
      <HeroBentoCard variant="white" className="p-5 md:col-span-7 md:p-6">
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
              className={`flex h-9 flex-1 items-center justify-center rounded-lg text-[11px] font-medium transition-colors duration-200 ${
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
          className="mt-5 w-full rounded-xl bg-neutral-950 py-3 text-center text-sm font-medium text-white transition-[transform,box-shadow] duration-200 group-hover:shadow-[0_6px_20px_-4px_rgba(0,0,0,0.35)] motion-reduce:group-hover:shadow-none"
        >
          Confirmer le créneau
        </div>
      </HeroBentoCard>

      {/* Agenda du jour */}
      <HeroBentoCard variant="white" className="p-5 md:col-span-5 md:p-6">
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
      </HeroBentoCard>

      {/* Clients */}
      <HeroBentoCard variant="white" className="p-5 md:col-span-6 md:p-6">
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
      </HeroBentoCard>

      {/* Mini calendrier + résumé */}
      <HeroBentoCard variant="muted" className="p-5 md:col-span-6 md:p-6">
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
                className={`h-2 w-2 rounded-sm transition-transform duration-200 group-hover:scale-110 motion-reduce:group-hover:scale-100 ${i === 4 ? "bg-neutral-950" : "bg-neutral-300/80"}`}
              />
            ))}
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] transition-[transform,box-shadow] duration-200 group-hover:border-neutral-200 group-hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.1)] motion-reduce:group-hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-medium text-neutral-950">Prochain créneau libre</p>
          <p className="mt-1 text-sm text-neutral-600">Mer · 11:30</p>
        </div>
      </HeroBentoCard>
    </div>
  );
}
