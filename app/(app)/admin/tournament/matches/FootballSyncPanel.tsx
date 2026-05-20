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
  raw_summary?: Record<string, unknown> | null;
};

export function FootballSyncPanel({
  lastSync,
  recentLogs,
  apiConfigured,
  matchesCount,
}: {
  lastSync: SyncLogRow | null;
  recentLogs: SyncLogRow[];
  apiConfigured: boolean;
  matchesCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [debugBusy, setDebugBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const loadDebug = async () => {
    setDebugBusy(true);
    setDebugInfo(null);
    try {
      const res = await fetch("/api/admin/debug-football-config");
      const j = (await res.json().catch(() => null)) as {
        config?: Record<string, string>;
        probe?: {
          recommendation?: string;
          season?: { normalizedCount?: number };
          league?: { normalizedCount?: number };
        };
        probeError?: string;
        database?: { matchesCount?: number };
      } | null;
      if (!res.ok) {
        setDebugInfo("Diagnostic indisponible.");
        return;
      }
      const lines = [
        j?.config
          ? Object.entries(j.config)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n")
          : "",
        j?.probe?.recommendation ? `Probe: ${j.probe.recommendation}` : "",
        j?.probe
          ? `season=${j.probe.season?.normalizedCount ?? "?"} · league=${j.probe.league?.normalizedCount ?? "?"}`
          : "",
        j?.probeError ? `Erreur probe: ${j.probeError}` : "",
        j?.database ? `Matchs en base: ${j.database.matchesCount ?? 0}` : "",
      ].filter(Boolean);
      setDebugInfo(lines.join("\n"));
    } finally {
      setDebugBusy(false);
    }
  };

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
        hints?: string[];
        matchesImported?: number;
        matchesUpdated?: number;
        scoresUpdated?: number;
        pointsRecalculated?: number;
        lastSync?: SyncLogRow | null;
      } | null;
      if (!res.ok) {
        const hint = j?.hints?.length ? ` (${j.hints.join(" ")})` : "";
        const err =
          j?.lastSync?.error_message ??
          j?.error ??
          j?.reason ??
          "Échec de la synchronisation.";
        setMessage(err + hint);
        return;
      }
      if (j?.skipped) {
        setMessage(j.reason ?? "Sync ignorée (clé API absente).");
        return;
      }
      if (j?.ok === false) {
        setMessage(
          j.lastSync?.error_message ??
            j.error ??
            "Synchronisation en erreur."
        );
        router.refresh();
        return;
      }
      setMessage(
        `Succès — ${j?.matchesImported ?? 0} importés, ${j?.matchesUpdated ?? 0} mis à jour, ${j?.scoresUpdated ?? 0} scores mis à jour.`
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
            {matchesCount} match{matchesCount !== 1 ? "s" : ""} en base ·{" "}
            {apiConfigured
              ? "Clé API et compétition configurées côté serveur."
              : "Mode manuel : FOOTBALL_API_KEY ou FOOTBALL_COMPETITION_ID manquant."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={debugBusy}
            onClick={loadDebug}
            className={ui.btnSecondary}
          >
            {debugBusy ? "Diagnostic…" : "Diagnostic config"}
          </button>
          <button
            type="button"
            disabled={busy || !apiConfigured}
            onClick={syncNow}
            className={ui.btnPrimary}
          >
            {busy ? "Synchronisation…" : "Synchroniser maintenant"}
          </button>
        </div>
      </div>

      {debugInfo ? (
        <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-3 text-[11px] text-white/60 whitespace-pre-wrap">
          {debugInfo}
        </pre>
      ) : null}

      {message ? (
        <p
          className={`rounded-lg border px-3 py-2 text-xs ${
            message.startsWith("Succès")
              ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
              : "border-rose-400/25 bg-rose-500/10 text-rose-100"
          }`}
        >
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
          {lastSync.raw_summary ? (
            <span className="block text-white/45 font-mono text-[10px] mt-1">
              {JSON.stringify(lastSync.raw_summary)}
            </span>
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
