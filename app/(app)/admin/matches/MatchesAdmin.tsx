"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/design/tokens";

type Match = {
  id: string;
  kickoff_at: string;
  stage: string;
  status: "scheduled" | "live" | "finished" | "cancelled";
  home_score: number | null;
  away_score: number | null;
  home_team_id: string;
  away_team_id: string;
  home: { name: string | null } | null;
  away: { name: string | null } | null;
};
type Team = { id: string; name: string };

export function MatchesAdmin({ matches, teams }: { matches: Match[]; teams: Team[] }) {
  const router = useRouter();
  const [home, setHome] = useState(teams[0]?.id ?? "");
  const [away, setAway] = useState(teams[1]?.id ?? "");
  const [kickoff, setKickoff] = useState("");
  const [stage, setStage] = useState("group");
  const [submitting, setSubmitting] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!home || !away || home === away || !kickoff) return;
    setSubmitting(true);
    await fetch("/api/admin/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        homeTeamId: home,
        awayTeamId: away,
        kickoffAt: new Date(kickoff).toISOString(),
        stage,
      }),
    });
    setKickoff("");
    setSubmitting(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_120px_auto]">
        <select className={ui.input} value={home} onChange={(e) => setHome(e.target.value)}>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select className={ui.input} value={away} onChange={(e) => setAway(e.target.value)}>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          className={ui.input}
          value={kickoff}
          onChange={(e) => setKickoff(e.target.value)}
          required
        />
        <select className={ui.input} value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="group">Groupes</option>
          <option value="r16">8e finale</option>
          <option value="qf">Quart</option>
          <option value="sf">Demi</option>
          <option value="final">Finale</option>
          <option value="third">3e place</option>
        </select>
        <button type="submit" disabled={submitting} className={ui.btnPrimary}>
          {submitting ? "…" : "Ajouter"}
        </button>
      </form>

      <ul className="space-y-2">
        {matches.length === 0 ? (
          <li className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-white/55">
            Aucun match créé.
          </li>
        ) : (
          matches.map((m) => <MatchAdminRow key={m.id} match={m} />)
        )}
      </ul>
    </div>
  );
}

function MatchAdminRow({ match }: { match: Match }) {
  const router = useRouter();
  const [home, setHome] = useState<number>(match.home_score ?? 0);
  const [away, setAway] = useState<number>(match.away_score ?? 0);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const finalize = async () => {
    setSaving(true);
    setFeedback(null);
    const res = await fetch(`/api/admin/matches/${match.id}/finalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ homeScore: home, awayScore: away }),
    });
    const j = (await res.json().catch(() => null)) as { updated?: number; error?: string } | null;
    setSaving(false);
    if (!res.ok) {
      setFeedback(j?.error ?? "Erreur");
      return;
    }
    setFeedback(`OK — ${j?.updated ?? 0} pronostics scorés`);
    router.refresh();
  };

  const remove = async () => {
    if (!confirm("Supprimer ce match ?")) return;
    await fetch(`/api/admin/matches/${match.id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3 text-sm">
        <div>
          <span className="font-semibold text-white">{match.home?.name ?? "—"}</span>
          <span className="mx-2 text-white/40">vs</span>
          <span className="font-semibold text-white">{match.away?.name ?? "—"}</span>
          <span className="ml-3 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-white/60">
            {match.stage}
          </span>
        </div>
        <div className="text-xs text-white/50">
          {new Date(match.kickoff_at).toLocaleString("fr-CH")}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          type="number"
          min={0}
          max={20}
          className={`${ui.input} w-20`}
          value={home}
          onChange={(e) => setHome(Number(e.target.value))}
        />
        <span className="text-white/40">–</span>
        <input
          type="number"
          min={0}
          max={20}
          className={`${ui.input} w-20`}
          value={away}
          onChange={(e) => setAway(Number(e.target.value))}
        />
        <button type="button" onClick={finalize} disabled={saving} className={ui.btnPrimary}>
          {saving ? "Calcul…" : match.status === "finished" ? "Recalculer" : "Entrer le score final"}
        </button>
        <button
          type="button"
          onClick={remove}
          className="ml-auto rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/20"
        >
          Supprimer
        </button>
      </div>
      {feedback ? (
        <p className="mt-2 text-xs text-white/55">{feedback}</p>
      ) : null}
      {match.status === "finished" ? (
        <p className="mt-2 text-xs text-emerald-300">
          Score final : {match.home_score} – {match.away_score}
        </p>
      ) : null}
    </li>
  );
}
