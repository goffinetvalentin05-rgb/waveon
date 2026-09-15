"use client";

import { useCallback, useEffect, useState } from "react";
import { ui } from "@/lib/design/tokens";
import { can } from "@/lib/access/permissions";
import type { ProjectRole } from "@/lib/access/roles";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type FeedState = {
  enabled: boolean;
  url: string | null;
  webcal_url: string | null;
  calendar_name: string;
};

export function ProjectCalendarSyncCard({
  projectId,
  role,
}: {
  projectId: string;
  role: ProjectRole;
}) {
  const canEdit = can(role, "project.edit_settings");
  const [feed, setFeed] = useState<FeedState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"regenerate" | "disable" | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/calendar-feed`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Impossible de charger le calendrier.");
    setFeed({
      enabled: Boolean(data.enabled),
      url: data.url ?? null,
      webcal_url: data.webcal_url ?? null,
      calendar_name: data.calendar_name ?? "Waveone",
    });
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void load()
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Impossible de charger le calendrier.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const runAction = async (action: "enable" | "regenerate" | "disable") => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/calendar-feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action impossible.");
      setFeed({
        enabled: Boolean(data.enabled),
        url: data.url ?? null,
        webcal_url: data.webcal_url ?? null,
        calendar_name: data.calendar_name ?? "Waveone",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action impossible.");
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const copyLink = async () => {
    if (!feed?.url) return;
    await navigator.clipboard.writeText(feed.url);
    setMsg("Lien du calendrier copié");
    window.setTimeout(() => setMsg(null), 2000);
  };

  return (
    <section className={`${ui.card} p-6`}>
      <p className={ui.kicker}>Calendrier</p>
      <h2 className={`${ui.h2} mt-2 text-lg`}>Synchronisation externe</h2>

      <div className="mt-5">
        <p className="text-sm font-medium text-wo-text">Apple Calendar</p>
        <p className="mt-1 text-sm text-wo-muted">
          Abonnez-vous au calendrier de ce projet pour retrouver automatiquement vos rendez-vous dans
          Calendrier Apple.
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
            feed?.enabled
              ? "bg-emerald-50 text-emerald-800"
              : "bg-slate-100 text-wo-muted"
          }`}
        >
          {loading ? "…" : feed?.enabled ? "Calendrier actif" : "Non activé"}
        </span>
      </div>

      {feed?.enabled ? (
        <p className="mt-3 text-sm text-wo-muted">Nom dans Apple : {feed.calendar_name}</p>
      ) : null}

      {error ? <p className={`${ui.alertError} mt-4`}>{error}</p> : null}
      {msg ? <p className={`${ui.alertSuccess} mt-4`}>{msg}</p> : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {!feed?.enabled ? (
          canEdit ? (
            <button
              type="button"
              className={ui.btnPrimary}
              disabled={busy || loading}
              onClick={() => void runAction("enable")}
            >
              Activer le calendrier
            </button>
          ) : (
            <p className="text-sm text-wo-muted">
              Seuls l&apos;owner et les admins peuvent activer ce calendrier.
            </p>
          )
        ) : (
          <>
            <button type="button" className={ui.btnPrimary} disabled={!feed.url} onClick={() => void copyLink()}>
              Copier le lien du calendrier
            </button>
            {feed.webcal_url ? (
              <a href={feed.webcal_url} className={ui.btnSecondary}>
                Ajouter à Apple Calendar
              </a>
            ) : null}
            {canEdit ? (
              <>
                <button
                  type="button"
                  className={ui.btnGhost}
                  disabled={busy}
                  onClick={() => setConfirm("regenerate")}
                >
                  Régénérer le lien
                </button>
                <button
                  type="button"
                  className={ui.btnGhost}
                  disabled={busy}
                  onClick={() => setConfirm("disable")}
                >
                  Désactiver
                </button>
              </>
            ) : null}
          </>
        )}
      </div>

      {feed?.enabled ? (
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-medium text-wo-text">Instructions iPhone</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-wo-muted">
            <li>Copier le lien</li>
            <li>Ouvrir Calendrier sur l&apos;iPhone</li>
            <li>Ajouter un calendrier avec abonnement</li>
            <li>Coller le lien</li>
          </ol>
        </details>
      ) : null}

      <ConfirmModal
        open={confirm === "regenerate"}
        title="Régénérer le lien ?"
        description="L’ancien lien cessera de fonctionner immédiatement. Les iPhones déjà abonnés devront coller le nouveau lien."
        confirmLabel="Régénérer"
        onConfirm={() => void runAction("regenerate")}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmModal
        open={confirm === "disable"}
        title="Désactiver le calendrier ?"
        description="Le flux ne sera plus accessible. Vous pourrez le réactiver plus tard avec un nouveau lien."
        tone="danger"
        confirmLabel="Désactiver"
        onConfirm={() => void runAction("disable")}
        onCancel={() => setConfirm(null)}
      />
    </section>
  );
}
