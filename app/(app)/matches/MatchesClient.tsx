"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/design/tokens";

type Match = {
  id: string;
  kickoff_at: string;
  status: "scheduled" | "live" | "finished" | "cancelled";
  stage: string;
  home_score: number | null;
  away_score: number | null;
  home: { id: string; name: string; short_code: string | null; color: string | null } | null;
  away: { id: string; name: string; short_code: string | null; color: string | null } | null;
};

type Prediction = {
  id: string;
  match_id: string;
  league_id: string | null;
  predicted_home_score: number;
  predicted_away_score: number;
};

type League = { id: string; slug: string; name: string; kind: string };

type Props = {
  matches: Match[];
  predictions: Prediction[];
  leagues: League[];
};

export function MatchesClient({ matches, predictions, leagues }: Props) {
  const router = useRouter();
  // null = global
  const [activeLeague, setActiveLeague] = useState<string | null>(null);

  // Map prediction key → prediction (matchId + leagueId)
  const predByKey = useMemo(() => {
    const map = new Map<string, Prediction>();
    for (const p of predictions) {
      const key = `${p.match_id}::${p.league_id ?? "global"}`;
      map.set(key, p);
    }
    return map;
  }, [predictions]);

  const upcoming = matches.filter((m) => m.status === "scheduled" || m.status === "live");
  const finished = matches.filter((m) => m.status === "finished");

  return (
    <div className="space-y-6">
      <LeagueTabs leagues={leagues} active={activeLeague} onChange={setActiveLeague} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
          À venir
        </h2>
        {upcoming.length === 0 ? (
          <div className={`${ui.glassCard} p-6 text-center text-sm text-white/55`}>
            Aucun match à venir.
          </div>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                prediction={predByKey.get(`${m.id}::${activeLeague ?? "global"}`)}
                leagueId={activeLeague}
                onSaved={() => router.refresh()}
              />
            ))}
          </ul>
        )}
      </section>

      {finished.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
            Terminés
          </h2>
          <ul className="space-y-3">
            {finished.map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                prediction={predByKey.get(`${m.id}::${activeLeague ?? "global"}`)}
                leagueId={activeLeague}
                readonly
                onSaved={() => router.refresh()}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function LeagueTabs({
  leagues,
  active,
  onChange,
}: {
  leagues: League[];
  active: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <TabBtn
        label="Ligue globale"
        active={active === null}
        onClick={() => onChange(null)}
      />
      {leagues
        .filter((l) => l.kind !== "global")
        .map((l) => (
          <TabBtn
            key={l.id}
            label={l.name}
            active={active === l.id}
            onClick={() => onChange(l.id)}
          />
        ))}
    </div>
  );
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
        active
          ? "bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-[0_10px_25px_-10px_rgba(99,102,241,0.7)]"
          : "border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

function MatchRow({
  match,
  prediction,
  leagueId,
  readonly = false,
  onSaved,
}: {
  match: Match;
  prediction?: Prediction;
  leagueId: string | null;
  readonly?: boolean;
  onSaved: () => void;
}) {
  const [home, setHome] = useState<number>(prediction?.predicted_home_score ?? 1);
  const [away, setAway] = useState<number>(prediction?.predicted_away_score ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const kickoffPast = new Date(match.kickoff_at).getTime() <= Date.now();
  const locked = readonly || kickoffPast || match.status !== "scheduled";

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          leagueId,
          homeScore: home,
          awayScore: away,
        }),
      });
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(j?.error ?? "Erreur d'enregistrement.");
        return;
      }
      setSavedAt(Date.now());
      onSaved();
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className={`${ui.glassCard} p-4 sm:p-5`}>
      <div className="flex items-center justify-between text-xs text-white/45">
        <span>
          {new Date(match.kickoff_at).toLocaleString("fr-CH", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {" · "}
          {match.stage}
        </span>
        {locked ? (
          <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/60">
            verrouillé
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        <Team team={match.home} align="left" />
        <div className="text-xs uppercase tracking-widest text-white/30">vs</div>
        <Team team={match.away} align="right" />
      </div>

      {match.status === "finished" ? (
        <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-4 py-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-emerald-200/70">Score final</div>
          <div className="mt-1 font-display text-2xl font-bold text-white">
            {match.home_score} – {match.away_score}
          </div>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 items-center gap-3">
          <ScoreInput value={home} onChange={setHome} disabled={locked} />
          <ScoreInput value={away} onChange={setAway} disabled={locked} />
        </div>
      )}

      {!locked ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] text-white/40">
            {savedAt ? "Pronostic enregistré ✓" : "Modifiable jusqu'au coup d'envoi"}
          </span>
          <button type="button" onClick={save} disabled={saving} className={ui.btnPrimary}>
            {saving ? "Enregistrement…" : prediction ? "Mettre à jour" : "Verrouiller mon prono"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}
    </li>
  );
}

function Team({
  team,
  align,
}: {
  team: Match["home"];
  align: "left" | "right";
}) {
  const initials = team?.short_code ?? team?.name?.slice(0, 3).toUpperCase() ?? "—";
  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/40 to-violet-500/40 text-xs font-bold text-white">
        {initials}
      </span>
      <span className="truncate text-sm font-semibold text-white">{team?.name ?? "—"}</span>
    </div>
  );
}

function ScoreInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const dec = () => onChange(Math.max(0, value - 1));
  const inc = () => onChange(Math.min(20, value + 1));
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-2 py-2">
      <button
        type="button"
        onClick={dec}
        disabled={disabled}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-lg text-white disabled:opacity-40"
      >
        −
      </button>
      <span className="font-display text-2xl font-bold text-white tabular-nums">{value}</span>
      <button
        type="button"
        onClick={inc}
        disabled={disabled}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-lg text-white disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
