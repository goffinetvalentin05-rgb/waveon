"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconBallFootball } from "@tabler/icons-react";
import { PronoClashShell } from "@/components/dashboard/PronoClashShell";
import { longStageLabel } from "@/lib/pronoclash/match-display";

type TeamSide = {
  id: string;
  name: string;
  country_code: string | null;
  flag_emoji: string | null;
} | null;

type Match = {
  id: string;
  match_number: number | null;
  kickoff_at: string;
  locked_at: string;
  status: "scheduled" | "live" | "finished" | "postponed";
  stage: string;
  group_name: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  home_score: number | null;
  away_score: number | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  home: TeamSide;
  away: TeamSide;
};

type Prediction = {
  id: string;
  match_id: string;
  league_id: string | null;
  predicted_home_score: number;
  predicted_away_score: number;
  points: number;
  is_locked: boolean;
};

type League = { id: string; slug: string; name: string; kind: string };

type Props = {
  username?: string | null;
  email?: string | null;
  matches: Match[];
  predictions: Prediction[];
  leagues: League[];
};

export function MatchesClient({ username, email, matches, predictions, leagues }: Props) {
  const router = useRouter();
  const [activeLeague, setActiveLeague] = useState<string | null>(null);

  const predByKey = useMemo(() => {
    const map = new Map<string, Prediction>();
    for (const p of predictions) {
      const key = `${p.match_id}::${p.league_id ?? "global"}`;
      map.set(key, p);
    }
    return map;
  }, [predictions]);

  const now = Date.now();
  const isLocked = (m: Match) =>
    new Date(m.locked_at).getTime() <= now || new Date(m.kickoff_at).getTime() <= now;
  const finished = matches.filter((m) => m.status === "finished");
  const locked = matches.filter(
    (m) => m.status !== "finished" && m.status !== "postponed" && isLocked(m)
  );
  const upcoming = matches.filter(
    (m) =>
      (m.status === "scheduled" || m.status === "live") && !isLocked(m)
  );

  return (
    <PronoClashShell pageTitle="Matchs" username={username} email={email}>
      <p className="pc-body-text">
        Score exact = +5 pts. Bon vainqueur ou bon nul = +3 pts. Bon écart de buts = +1 bonus. Tu peux
        modifier ton prono jusqu&apos;au coup d&apos;envoi.
      </p>

      {matches.length === 0 ? (
        <div className="pc-empty pc-glass">
          <IconBallFootball size={28} stroke={1.5} className="pc-empty-icon" />
          <p>Les matchs du tournoi seront bientôt disponibles.</p>
        </div>
      ) : (
        <>
          <LeagueTabs leagues={leagues} active={activeLeague} onChange={setActiveLeague} />

          <div className="pc-section-head" style={{ marginTop: 8 }}>
            <h2 className="pc-section-title">À venir</h2>
          </div>
          {upcoming.length === 0 ? (
            <div className="pc-empty pc-glass">
              <p>Aucun match à venir pour le moment.</p>
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
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

          {locked.length > 0 ? (
            <>
              <div className="pc-section-head">
                <h2 className="pc-section-title">Pronostics verrouillés</h2>
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {locked.map((m) => (
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
            </>
          ) : null}

          {finished.length > 0 ? (
            <>
              <div className="pc-section-head">
                <h2 className="pc-section-title">Terminés</h2>
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
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
            </>
          ) : null}
        </>
      )}
    </PronoClashShell>
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
    <div className="pc-league-tabs">
      <button
        type="button"
        className={`pc-league-tab${active === null ? " active" : ""}`}
        onClick={() => onChange(null)}
      >
        Ligue générale
      </button>
      {leagues
        .filter((l) => l.kind !== "global")
        .map((l) => (
          <button
            key={l.id}
            type="button"
            className={`pc-league-tab${active === l.id ? " active" : ""}`}
            onClick={() => onChange(l.id)}
          >
            {l.name}
          </button>
        ))}
    </div>
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
  const [home, setHome] = useState<number>(prediction?.predicted_home_score ?? 0);
  const [away, setAway] = useState<number>(prediction?.predicted_away_score ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const kickoffPast = new Date(match.kickoff_at).getTime() <= Date.now();
  const lockedPast = new Date(match.locked_at).getTime() <= Date.now();
  const hasTeams = !!match.home && !!match.away;
  const locked =
    readonly || kickoffPast || lockedPast || match.status !== "scheduled" || !hasTeams;

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

  const stageLabel = longStageLabel(match.stage, match.group_name);
  const statusLabel =
    match.status === "live"
      ? "LIVE"
      : match.status === "finished"
        ? "Terminé"
        : match.status === "postponed"
          ? "Reporté"
          : "À venir";

  return (
    <li className="pc-match-card pc-glass">
      <div className="pc-match-card-head">
        <span>
          {match.match_number ? `#${match.match_number} · ` : ""}
          {new Date(match.kickoff_at).toLocaleString("fr-CH", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {" · "}
          {stageLabel}
        </span>
        <span
          className={`pc-status-pill ${
            match.status === "live" ? "live" : "upcoming"
          }`}
          style={
            match.status === "finished"
              ? { background: "rgba(255,255,255,0.08)", border: "1px solid var(--pc-border)", color: "#94a3b8" }
              : undefined
          }
        >
          {match.status === "live" ? <span className="pc-live-dot" /> : null}
          {statusLabel}
        </span>
      </div>

      {match.venue || match.city ? (
        <div style={{ fontSize: 11, color: "var(--pc-muted)", marginBottom: 12 }}>
          {[match.venue, match.city, match.country].filter(Boolean).join(" — ")}
        </div>
      ) : null}

      <div className="pc-featured-teams" style={{ margin: "0 0 12px" }}>
        <TeamView team={match.home} placeholder={match.home_placeholder} align="left" />
        <span style={{ fontSize: 11, color: "var(--pc-muted)", textTransform: "uppercase" }}>vs</span>
        <TeamView team={match.away} placeholder={match.away_placeholder} align="right" />
      </div>

      {match.status === "finished" &&
      match.home_score !== null &&
      match.away_score !== null ? (
        <div
          style={{
            textAlign: "center",
            padding: "12px",
            borderRadius: 12,
            border: "1px solid rgba(52, 211, 153, 0.25)",
            background: "rgba(52, 211, 153, 0.08)",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 10, textTransform: "uppercase", color: "#6ee7b7" }}>
            Score final
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>
            {match.home_score} – {match.away_score}
          </div>
        </div>
      ) : !hasTeams ? (
        <p style={{ fontSize: 12, color: "var(--pc-muted)", textAlign: "center", margin: "0 0 12px" }}>
          Équipes pas encore qualifiées
        </p>
      ) : match.status === "live" &&
        match.home_score !== null &&
        match.away_score !== null ? (
        <div style={{ textAlign: "center", marginBottom: 12, fontSize: 24, fontWeight: 800 }}>
          {match.home_score} – {match.away_score}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <ScoreInput value={home} onChange={setHome} disabled={locked} />
          <ScoreInput value={away} onChange={setAway} disabled={locked} />
        </div>
      )}

      {locked && prediction ? (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid var(--pc-border)",
            background: "rgba(0,0,0,0.2)",
            fontSize: 13,
          }}
        >
          <span style={{ color: "var(--pc-muted)", fontSize: 11 }}>Mon pronostic · verrouillé</span>
          <div style={{ fontWeight: 700, marginTop: 4 }}>
            {prediction.predicted_home_score} – {prediction.predicted_away_score}
            {match.status === "finished" ? (
              <span style={{ marginLeft: 10, color: "#a5b4fc" }}>
                {prediction.points} pt{prediction.points !== 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {!locked && hasTeams && match.status === "scheduled" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--pc-muted)" }}>
            {savedAt ? "Pronostic enregistré ✓" : "Modifiable jusqu'au coup d'envoi"}
          </span>
          <button type="button" onClick={save} disabled={saving} className="pc-btn primary">
            {saving ? "Enregistrement…" : prediction ? "Mettre à jour" : "Verrouiller mon prono"}
          </button>
        </div>
      ) : locked && !prediction ? (
        <p style={{ fontSize: 12, color: "var(--pc-muted)" }}>Pronostic verrouillé — aucun prono enregistré.</p>
      ) : null}

      {error ? (
        <p
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "#fca5a5",
            padding: "8px 10px",
            borderRadius: 8,
            background: "rgba(244, 63, 94, 0.1)",
          }}
        >
          {error}
        </p>
      ) : null}
    </li>
  );
}

function TeamView({
  team,
  placeholder,
  align,
}: {
  team: TeamSide;
  placeholder: string | null;
  align: "left" | "right";
}) {
  if (!team) {
    return (
      <div
        className="pc-featured-team"
        style={align === "right" ? { alignItems: "flex-end" } : undefined}
      >
        <span className="pc-team-badge" style={{ width: 40, height: 40, fontSize: 12 }}>
          ?
        </span>
        <span style={{ fontSize: 11, color: "var(--pc-muted)" }}>{placeholder ?? "À déterminer"}</span>
      </div>
    );
  }
  return (
    <div
      className="pc-featured-team"
      style={align === "right" ? { alignItems: "flex-end" } : undefined}
    >
      <span className="pc-team-badge" style={{ width: 40, height: 40, fontSize: 18 }}>
        {team.flag_emoji ?? "🏳️"}
      </span>
      <span style={{ fontSize: 12, fontWeight: 600 }}>{team.name}</span>
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px",
        borderRadius: 12,
        border: "1px solid var(--pc-border)",
        background: "rgba(0,0,0,0.25)",
      }}
    >
      <button
        type="button"
        onClick={dec}
        disabled={disabled}
        className="pc-icon-btn sm"
        style={{ width: 36, height: 36 }}
      >
        −
      </button>
      <span style={{ fontSize: 24, fontWeight: 800 }}>{value}</span>
      <button
        type="button"
        onClick={inc}
        disabled={disabled}
        className="pc-icon-btn sm"
        style={{ width: 36, height: 36 }}
      >
        +
      </button>
    </div>
  );
}
