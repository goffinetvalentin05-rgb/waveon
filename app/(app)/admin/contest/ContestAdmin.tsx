"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/design/tokens";

type Entry = {
  id: string;
  email: string;
  created_at: string;
  champion_team_id: string | null;
  top_scorer_id: string | null;
  consent_marketing_app: boolean;
  consent_partner_offers: boolean;
  team: { name: string | null } | null;
  player: { full_name: string | null } | null;
};

export function ContestAdmin({
  deadlineIso,
  entries,
}: {
  deadlineIso: string | null;
  entries: Entry[];
}) {
  const router = useRouter();
  const [deadline, setDeadline] = useState(() =>
    deadlineIso ? toLocalDatetime(deadlineIso) : ""
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = entries.length;
    const mkt = entries.filter((e) => e.consent_marketing_app).length;
    const partner = entries.filter((e) => e.consent_partner_offers).length;
    return { total, mkt, partner };
  }, [entries]);

  const saveDeadline = async () => {
    setSaving(true);
    setFeedback(null);
    const iso = deadline ? new Date(deadline).toISOString() : null;
    const res = await fetch("/api/admin/contest/deadline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deadline: iso }),
    });
    setSaving(false);
    if (res.ok) {
      setFeedback("Deadline mise à jour.");
      router.refresh();
    } else {
      setFeedback("Erreur.");
    }
  };

  const exportCsv = (filter: "all" | "mkt" | "partner") => {
    const rows = entries.filter((e) => {
      if (filter === "mkt") return e.consent_marketing_app;
      if (filter === "partner") return e.consent_partner_offers;
      return true;
    });
    const header = ["email", "champion", "top_scorer", "marketing_app", "partner_offers", "created_at"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([
        r.email,
        r.team?.name ?? "",
        r.player?.full_name ?? "",
        r.consent_marketing_app ? "yes" : "no",
        r.consent_partner_offers ? "yes" : "no",
        r.created_at,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contest-${filter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-white">Deadline</h2>
        <p className="mt-1 text-sm text-white/55">
          Date après laquelle les prédictions champion + buteur sont verrouillées.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <input
            type="datetime-local"
            className={ui.input}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
          <button type="button" onClick={saveDeadline} disabled={saving} className={ui.btnPrimary}>
            {saving ? "…" : "Enregistrer"}
          </button>
          {feedback ? <span className="text-xs text-white/60">{feedback}</span> : null}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white">Participants</h2>
        <p className="mt-1 text-sm text-white/55">
          {stats.total} entrées · {stats.mkt} ont accepté nos emails · {stats.partner} acceptent les
          offres partenaires.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => exportCsv("all")} className={ui.btnSecondary}>Exporter tout</button>
          <button onClick={() => exportCsv("mkt")} className={ui.btnSecondary}>Exporter (App marketing)</button>
          <button onClick={() => exportCsv("partner")} className={ui.btnSecondary}>Exporter (Offres partenaires)</button>
        </div>
        <p className="mt-2 text-[11px] text-white/40">
          Les exports respectent le consentement séparé : l&apos;export &laquo; partenaires &raquo; ne contient QUE les emails qui ont coché cette case spécifique.
        </p>
        <div className="mt-4 max-h-96 overflow-y-auto rounded-xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-black/60 text-xs uppercase tracking-wider text-white/40">
              <tr>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Champion</th>
                <th className="px-3 py-2 text-left">Buteur</th>
                <th className="px-3 py-2 text-center">App</th>
                <th className="px-3 py-2 text-center">Partenaires</th>
                <th className="px-3 py-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/85">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-3 py-2">{e.email}</td>
                  <td className="px-3 py-2">{e.team?.name ?? "—"}</td>
                  <td className="px-3 py-2">{e.player?.full_name ?? "—"}</td>
                  <td className="px-3 py-2 text-center">{e.consent_marketing_app ? "✓" : ""}</td>
                  <td className="px-3 py-2 text-center">{e.consent_partner_offers ? "✓" : ""}</td>
                  <td className="px-3 py-2 text-xs text-white/50">{new Date(e.created_at).toLocaleString("fr-CH")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
