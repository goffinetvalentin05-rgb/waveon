"use client";

type CampaignCardProps = {
  name: string;
  objectiveLabel?: string;
  status: "active" | "inactive";
  targetUrl?: string | null;
  slug: string;
  createdAt: string;
  detailHref?: string;
  onActivate?: () => void;
  onDeactivate?: () => void;
  isBusy?: boolean;
};

const statusStyles = {
  active: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  inactive: "border-white/10 bg-white/5 text-slate-300",
};

export default function CampaignCard({
  name,
  objectiveLabel,
  status,
  targetUrl,
  slug,
  createdAt,
  detailHref,
  onActivate,
  onDeactivate,
  isBusy,
}: CampaignCardProps) {
  const created = new Date(createdAt).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.35)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-white">{name}</p>
          <p className="mt-1 text-sm text-slate-300">
            {objectiveLabel ?? "Objectif non défini"} • {created}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[status]}`}
        >
          {status === "active" ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-300">
        <p>
          Page QR :{" "}
          <span className="font-medium text-slate-100">/{slug}</span>
        </p>
        <p className="truncate">
          Lien cible :{" "}
          <span className="font-medium text-slate-100">
            {targetUrl || "Non renseigné"}
          </span>
        </p>
      </div>

      {(onActivate || onDeactivate) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {detailHref ? (
            <a
              href={detailHref}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:border-white/30"
            >
              Voir le dashboard
            </a>
          ) : null}
          {onActivate ? (
            <button
              type="button"
              onClick={onActivate}
              disabled={isBusy}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:border-white/30 disabled:opacity-60"
            >
              Activer
            </button>
          ) : null}
          {onDeactivate ? (
            <button
              type="button"
              onClick={onDeactivate}
              disabled={isBusy}
              className="rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-500 px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-110 disabled:opacity-60"
            >
              Désactiver
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

