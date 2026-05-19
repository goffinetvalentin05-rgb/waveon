"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/design/tokens";

export type ContestSettings = {
  id: string;
  prize_title: string;
  prize_description: string;
  prize_value_chf: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  rules_url: string | null;
  tie_break_rules: string[] | null;
};

export type ContestParticipant = {
  id: string;
  username: string | null;
  email: string | null;
  total_points: number;
  consent_marketing_app: boolean;
  consent_partner_offers: boolean;
  consent_created_at: string | null;
};

export function ContestAdmin({
  settings,
  participants,
}: {
  settings: ContestSettings | null;
  participants: ContestParticipant[];
}) {
  const router = useRouter();
  const [prizeTitle, setPrizeTitle] = useState(settings?.prize_title ?? "");
  const [prizeDesc, setPrizeDesc] = useState(settings?.prize_description ?? "");
  const [prizeValue, setPrizeValue] = useState<string>(
    String(settings?.prize_value_chf ?? 120)
  );
  const [startsAt, setStartsAt] = useState(
    settings?.starts_at ? toLocalDatetime(settings.starts_at) : ""
  );
  const [endsAt, setEndsAt] = useState(
    settings?.ends_at ? toLocalDatetime(settings.ends_at) : ""
  );
  const [isActive, setIsActive] = useState(settings?.is_active ?? true);
  const [rulesUrl, setRulesUrl] = useState(settings?.rules_url ?? "");
  const [tieBreak, setTieBreak] = useState<string>(
    (settings?.tie_break_rules ?? [
      "exact_scores_count",
      "correct_winners_count",
      "predictions_count",
      "manual_draw",
    ]).join(",")
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  const stats = useMemo(() => {
    const total = participants.length;
    const mkt = participants.filter((p) => p.consent_marketing_app).length;
    const partner = participants.filter((p) => p.consent_partner_offers).length;
    return { total, mkt, partner };
  }, [participants]);

  const saveSettings = async () => {
    setSaving(true);
    setFeedback(null);
    const payload = {
      prize_title: prizeTitle.trim(),
      prize_description: prizeDesc.trim(),
      prize_value_chf: Number(prizeValue) || 0,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      is_active: isActive,
      rules_url: rulesUrl.trim() || null,
      tie_break_rules: tieBreak
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const res = await fetch("/api/admin/contest/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      setFeedback("Paramètres mis à jour.");
      router.refresh();
    } else {
      setFeedback("Erreur.");
    }
  };

  const recompute = async () => {
    setRecomputing(true);
    const res = await fetch("/api/admin/contest/compute", { method: "POST" });
    setRecomputing(false);
    if (res.ok) {
      setFeedback("Classement et candidats recalculés.");
      router.refresh();
    } else {
      setFeedback("Erreur de recalcul.");
    }
  };

  const designateWinner = async (userId: string) => {
    if (!confirm("Désigner manuellement ce joueur comme gagnant ?")) return;
    const res = await fetch("/api/admin/contest/winner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, manual: true }),
    });
    if (res.ok) {
      setFeedback("Gagnant désigné manuellement.");
      router.refresh();
    } else {
      setFeedback("Erreur.");
    }
  };

  const exportCsv = (filter: "all" | "mkt" | "partner") => {
    const rows = participants.filter((p) => {
      if (filter === "mkt") return p.consent_marketing_app;
      if (filter === "partner") return p.consent_partner_offers;
      return true;
    });
    const header = ["email", "username", "total_points", "marketing_app", "partner_offers", "consent_at"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.email ?? "",
          r.username ?? "",
          r.total_points,
          r.consent_marketing_app ? "yes" : "no",
          r.consent_partner_offers ? "yes" : "no",
          r.consent_created_at ?? "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `concours-${filter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Paramètres du concours */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Paramètres du concours</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={ui.label}>Titre du lot</label>
            <input className={ui.input} value={prizeTitle} onChange={(e) => setPrizeTitle(e.target.value)} />
          </div>
          <div>
            <label className={ui.label}>Valeur max CHF</label>
            <input
              type="number"
              className={ui.input}
              value={prizeValue}
              onChange={(e) => setPrizeValue(e.target.value)}
              min={0}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={ui.label}>Description du lot</label>
            <textarea
              className={`${ui.input} min-h-[70px]`}
              value={prizeDesc}
              onChange={(e) => setPrizeDesc(e.target.value)}
            />
          </div>
          <div>
            <label className={ui.label}>Début</label>
            <input
              type="datetime-local"
              className={ui.input}
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div>
            <label className={ui.label}>Fin (deadline classement)</label>
            <input
              type="datetime-local"
              className={ui.input}
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={ui.label}>Règles de départage (ordre)</label>
            <input
              className={`${ui.input} font-mono text-xs`}
              value={tieBreak}
              onChange={(e) => setTieBreak(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-white/40">
              Ordre appliqué : <code>exact_scores_count</code>, <code>correct_winners_count</code>,{" "}
              <code>predictions_count</code>, <code>manual_draw</code>.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className={ui.label}>URL des règles publiques</label>
            <input className={ui.input} value={rulesUrl} onChange={(e) => setRulesUrl(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            Concours actif
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={saveSettings} disabled={saving} className={ui.btnPrimary}>
            {saving ? "Enregistrement…" : "Enregistrer les paramètres"}
          </button>
          <button type="button" onClick={recompute} disabled={recomputing} className={ui.btnSecondary}>
            {recomputing ? "Recalcul…" : "Recalculer classement & candidats"}
          </button>
          {feedback ? <span className="text-xs text-white/60">{feedback}</span> : null}
        </div>
      </section>

      {/* Participants */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Participants</h2>
        <p className="text-sm text-white/55">
          {stats.total} joueurs · {stats.mkt} consentent aux emails de Prono Clash · {stats.partner}{" "}
          aux offres partenaires (séparé).
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportCsv("all")} className={ui.btnSecondary}>
            Exporter tous les participants
          </button>
          <button onClick={() => exportCsv("mkt")} className={ui.btnSecondary}>
            Export emails marketing app
          </button>
          <button onClick={() => exportCsv("partner")} className={ui.btnSecondary}>
            Export emails partenaires
          </button>
        </div>
        <p className="text-[11px] text-white/40">
          L&apos;export &laquo; partenaires &raquo; ne contient QUE les emails qui ont coché cette case spécifique.
        </p>
        <div className="mt-4 max-h-[480px] overflow-y-auto rounded-xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-black/60 text-xs uppercase tracking-wider text-white/40">
              <tr>
                <th className="px-3 py-2 text-left">Rang</th>
                <th className="px-3 py-2 text-left">Pseudo</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-right">Points</th>
                <th className="px-3 py-2 text-center">App</th>
                <th className="px-3 py-2 text-center">Partenaires</th>
                <th className="px-3 py-2 text-right">Désigner gagnant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/85">
              {participants.map((p, i) => (
                <tr key={p.id}>
                  <td className="px-3 py-2 text-white/50">#{i + 1}</td>
                  <td className="px-3 py-2 font-semibold text-white">{p.username ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{p.email ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.total_points}</td>
                  <td className="px-3 py-2 text-center">{p.consent_marketing_app ? "✓" : ""}</td>
                  <td className="px-3 py-2 text-center">{p.consent_partner_offers ? "✓" : ""}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => designateWinner(p.id)}
                      className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-2 py-1 text-[11px] text-violet-200 hover:bg-violet-500/20"
                    >
                      Gagnant
                    </button>
                  </td>
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
