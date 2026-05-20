"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/design/tokens";

export type SyncLogRow = {
  id: string;
  provider: string;
  sync_type: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  matches_imported: number;
  matches_updated: number;
  scores_updated: number;
  points_recalculated: number;
  error_message: string | null;
};

export function FootballSyncPanel({
  lastSync,
  recentLogs,
  apiConfigured,
}: {
  lastSync: SyncLogRow | null;
  recentLogs: SyncLogRow[];
  apiConfigured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const syncNow = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/sync-football-now", { method: "POST" });
      const j = (await res.json().catch(() => null)) as {
        ok?: boolean;
        skipped?: boolean;
        reason?: string;
        error?: string;
        matchesImported?: number;
        matchesUpdated?: number;
        scoresUpdated?: number;
        pointsRecalculated?: number;
      } | null;
      if (!res.ok) {
        setMessage(j?.error ?? j?.reason ?? "Échec de la synchronisation.");
        return;
      }
      if (j?.skipped) {
        setMessage(j.reason ?? "Sync ignorée (clé API absente).");
        return;
      }
      setMessage(
        `OK — ${j?.matchesImported ?? 0} importés, ${j?.matchesUpdated ?? 0} mis à jour, ${j?.scoresUpdated ?? 0} scores, ${j?.pointsRecalculated ?? 0} recalculs.`
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-indigo-200/90">
            API football (Sportmonks)
          </h2>
          <p className="mt-1 text-xs text-white/50">
            {apiConfigured
              ? "Clé API et compétition configurées côté serveur."
              : "Mode manuel : FOOTBALL_API_KEY ou FOOTBALL_COMPETITION_ID manquant."}
          </p>
        </div>
        <button
          type="button"
          disabled={busy || !apiConfigured}
          onClick={syncNow}
          className={ui.btnPrimary}
        >
          {busy ? "Synchronisation…" : "Synchroniser maintenant"}
        </button>
      </div>

      {message ? (
        <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
          {message}
        </p>
      ) : null}

      {lastSync ? (
        <div className="text-xs text-white/55">
          <span className="text-white/70">Dernier sync</span> · {lastSync.provider} ·{" "}
          <span
            className={
              lastSync.status === "success"
                ? "text-emerald-300"
                : lastSync.status === "error"
                  ? "text-rose-300"
                  : "text-amber-300"
            }
          >
            {lastSync.status}
          </span>{" "}
          · {new Date(lastSync.started_at).toLocaleString("fr-CH")}
          {lastSync.finished_at
            ? ` → ${new Date(lastSync.finished_at).toLocaleString("fr-CH")}`
            : ""}
          <br />
          {lastSync.matches_imported} importés · {lastSync.matches_updated} MAJ ·{" "}
          {lastSync.scores_updated} scores · {lastSync.points_recalculated} recalculs
          {lastSync.error_message ? (
            <span className="block text-rose-300">{lastSync.error_message}</span>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-white/40">Aucune synchronisation enregistrée.</p>
      )}

      {recentLogs.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] text-white/55">
            <thead>
              <tr className="border-b border-white/10 text-white/40">
                <th className="py-1 pr-3">Date</th>
                <th className="py-1 pr-3">Type</th>
                <th className="py-1 pr-3">Statut</th>
                <th className="py-1 pr-3">Import</th>
                <th className="py-1 pr-3">MAJ</th>
                <th className="py-1">Pts</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log.id} className="border-b border-white/5">
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    {new Date(log.started_at).toLocaleString("fr-CH", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-1.5 pr-3">{log.sync_type}</td>
                  <td className="py-1.5 pr-3">{log.status}</td>
                  <td className="py-1.5 pr-3">{log.matches_imported}</td>
                  <td className="py-1.5 pr-3">{log.matches_updated}</td>
                  <td className="py-1.5">{log.points_recalculated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
