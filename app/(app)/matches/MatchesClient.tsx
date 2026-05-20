"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconBallFootball } from "@tabler/icons-react";
import { PronoClashShell } from "@/components/dashboard/PronoClashShell";
import { LeagueContextSelector } from "@/components/pronoclash/LeagueContextSelector";
import type { LeagueContextOption } from "@/components/pronoclash/LeagueContextSelector";
import { TeamDisplay } from "@/components/pronoclash/TeamDisplay";
import { longStageLabel } from "@/lib/pronoclash/match-display";
import {
  isPredictionLocked,
  PREDICTION_LOCKED_MESSAGE,
} from "@/lib/pronoclash/prediction-lock";
import { MatchCardsPanel } from "@/components/pronoclash/MatchCardsPanel";
import {
  leagueContextFromParam,
  leagueContextToParam,
  predictionMapKey,
  type LeagueContextId,
} from "@/lib/pronoclash/league-context-url";

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

type CardInv = { league_id: string; card_id: string; quantity: number };
type CardPlay = { league_id: string; match_id: string; card_id: string };
type CardCatalog = { id: string; name: string; description: string };
type LeagueMember = { user_id: string; username: string | null };

type Props = {
  username?: string | null;
  email?: string | null;
  matches: Match[];
  predictions: Prediction[];
  leagues: League[];
  userId?: string | null;
  cardsCatalog?: CardCatalog[];
  cardInventory?: CardInv[];
  cardPlays?: CardPlay[];
  membersByLeague?: Record<string, LeagueMember[]>;
};

export function MatchesClient({
  username,
  email,
  matches,
  predictions,
  leagues,
  userId = null,
  cardsCatalog = [],
  cardInventory = [],
  cardPlays = [],
  membersByLeague = {},
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const validIds = useMemo(
    () => new Set(leagues.filter((l) => l.kind !== "global").map((l) => l.id)),
    [leagues]
  );

  const activeLeague = useMemo((): LeagueContextId => {
    const fromUrl = leagueContextFromParam(searchParams.get("league"));
    return fromUrl && validIds.has(fromUrl) ? fromUrl : null;
  }, [searchParams, validIds]);

  const leagueOptions: LeagueContextOption[] = useMemo(
    () => [
      { id: null, name: "Ligue générale", kind: "general" },
      ...leagues
        .filter((l) => l.kind !== "global")
        .map((l) => ({
          id: l.id,
          name: l.name,
          kind: (l.kind === "pro" ? "pro" : "private") as "pro" | "private",
        })),
    ],
    [leagues]
  );

  const handleLeagueChange = (id: LeagueContextId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("league", leagueContextToParam(id));
    router.replace(`/matches?${params.toString()}`, { scroll: false });
  };

  const predByKey = useMemo(() => {
    const map = new Map<string, Prediction>();
    for (const p of predictions) {
      map.set(predictionMapKey(p.match_id, p.league_id), p);
    }
    return map;
  }, [predictions]);

  const activeLabel =
    leagueOptions.find((o) => o.id === activeLeague)?.name ?? "Ligue générale";

  const varPlaysForLeague = useMemo(() => {
    const set = new Set<string>();
    if (!activeLeague) return set;
    for (const p of cardPlays) {
      if (p.league_id === activeLeague && p.card_id === "var") set.add(p.match_id);
    }
    return set;
  }, [cardPlays, activeLeague]);

  const isLocked = (m: Match, varActive = false) =>
    m.status !== "scheduled" ||
    isPredictionLocked(m.locked_at, m.kickoff_at, new Date(), { varActive });

  const leagueInventory = useMemo(() => {
    if (!activeLeague) return [];
    return cardInventory.filter((i) => i.league_id === activeLeague);
  }, [cardInventory, activeLeague]);

  const playedMatchIds = useMemo(() => {
    if (!activeLeague) return new Set<string>();
    return new Set(
      cardPlays.filter((p) => p.league_id === activeLeague).map((p) => p.match_id)
    );
  }, [cardPlays, activeLeague]);
  const finished = matches.filter((m) => m.status === "finished");
  const locked = matches.filter(
    (m) =>
      m.status !== "finished" &&
      m.status !== "postponed" &&
      isLocked(m, varPlaysForLeague.has(m.id))
  );
  const upcoming = matches.filter(
    (m) =>
      (m.status === "scheduled" || m.status === "live") &&
      !isLocked(m, varPlaysForLeague.has(m.id))
  );

  return (
    <PronoClashShell pageTitle="Matchs" username={username} email={email}>
      <p className="pc-body-text">
        Score exact = +5 pts. Bon vainqueur ou bon nul = +3 pts. Bon écart de buts = +1 bonus. Les
        pronos de la <strong>ligue générale</strong> et de chaque <strong>ligue privée</strong>{" "}
        sont indépendants.
      </p>

      {matches.length === 0 ? (
        <div className="pc-empty pc-glass">
          <IconBallFootball size={28} stroke={1.5} className="pc-empty-icon" />
          <p>Les matchs du tournoi seront bientôt disponibles.</p>
        </div>
      ) : (
        <>
          <LeagueContextSelector
            options={leagueOptions}
            active={activeLeague}
            onChange={handleLeagueChange}
            hint={`Contexte actif : ${activeLabel}. Seuls les pronos de cette ligue sont affichés et enregistrés.`}
          />

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
                  prediction={predByKey.get(predictionMapKey(m.id, activeLeague))}
                  leagueId={activeLeague}
                  leagueLabel={activeLabel}
                  varActive={varPlaysForLeague.has(m.id)}
                  showCards={!!activeLeague}
                  cardsCatalog={cardsCatalog}
                  leagueInventory={leagueInventory}
                  leagueMembers={
                    activeLeague ? (membersByLeague[activeLeague] ?? []) : []
                  }
                  playedOnMatch={playedMatchIds.has(m.id)}
                  currentUserId={userId}
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
                    prediction={predByKey.get(predictionMapKey(m.id, activeLeague))}
                    leagueId={activeLeague}
                    leagueLabel={activeLabel}
                    varActive={varPlaysForLeague.has(m.id)}
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
                    prediction={predByKey.get(predictionMapKey(m.id, activeLeague))}
                    leagueId={activeLeague}
                    leagueLabel={activeLabel}
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

function MatchRow({
  match,
  prediction,
  leagueId,
  leagueLabel,
  readonly = false,
  varActive = false,
  showCards = false,
  cardsCatalog = [],
  leagueInventory = [],
  leagueMembers = [],
  playedOnMatch = false,
  currentUserId = null,
  onSaved,
}: {
  match: Match;
  prediction?: Prediction;
  leagueId: LeagueContextId;
  leagueLabel: string;
  readonly?: boolean;
  varActive?: boolean;
  showCards?: boolean;
  cardsCatalog?: CardCatalog[];
  leagueInventory?: CardInv[];
  leagueMembers?: LeagueMember[];
  playedOnMatch?: boolean;
  currentUserId?: string | null;
  onSaved: () => void;
}) {
  const [home, setHome] = useState<number | null>(
    prediction ? prediction.predicted_home_score : null
  );
  const [away, setAway] = useState<number | null>(
    prediction ? prediction.predicted_away_score : null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const hasTeams = !!match.home && !!match.away;
  const locked =
    readonly ||
    match.status !== "scheduled" ||
    isPredictionLocked(match.locked_at, match.kickoff_at, new Date(), { varActive }) ||
    !hasTeams;

  useEffect(() => {
    if (prediction) {
      setHome(prediction.predicted_home_score);
      setAway(prediction.predicted_away_score);
    } else {
      setHome(null);
      setAway(null);
    }
    setError(null);
    setSuccessMsg(null);
  }, [
    match.id,
    leagueId,
    prediction?.predicted_home_score,
    prediction?.predicted_away_score,
    prediction?.id,
  ]);

  const save = async () => {
    if (home === null || away === null) {
      setError("Indique un score pour les deux équipes.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
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
      const j = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
      } | null;
      if (!res.ok) {
        setError(j?.error ?? "Erreur d'enregistrement.");
        return;
      }
      setSuccessMsg(j?.message ?? (prediction ? "Pronostic mis à jour" : "Pronostic enregistré"));
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
              ? {
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid var(--pc-border)",
                  color: "#94a3b8",
                }
              : undefined
          }
        >
          {match.status === "live" ? <span className="pc-live-dot" /> : null}
          {statusLabel}
        </span>
      </div>

      <p className="pc-match-league-tag">Prono · {leagueLabel}</p>

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
        <div className="pc-final-score-box">
          <div className="pc-final-score-label">Score final</div>
          <div className="pc-final-score-value">
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
        <div className="pc-locked-prono">
          <span className="pc-locked-prono-label">Mon pronostic · verrouillé</span>
          <div className="pc-locked-prono-score">
            {prediction.predicted_home_score} – {prediction.predicted_away_score}
            {match.status === "finished" ? (
              <span className="pc-locked-prono-pts">
                {prediction.points} pt{prediction.points !== 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {!locked && hasTeams && match.status === "scheduled" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--pc-muted)" }}>
            Modifiable jusqu&apos;au coup d&apos;envoi · {leagueLabel}
          </span>
          <button type="button" onClick={save} disabled={saving} className="pc-btn primary block">
            {saving ? "Enregistrement…" : prediction ? "Mettre à jour" : "Enregistrer"}
          </button>
        </div>
      ) : locked && !prediction ? (
        <p style={{ fontSize: 12, color: "var(--pc-muted)" }}>{PREDICTION_LOCKED_MESSAGE}</p>
      ) : null}

      {successMsg && !locked ? (
        <p style={{ marginTop: 8, fontSize: 12, color: "#6ee7b7" }}>{successMsg}</p>
      ) : null}

      {error ? (
        <p className="pc-inline-error">{error}</p>
      ) : null}

      {showCards && leagueId && currentUserId ? (
        <MatchCardsPanel
          leagueId={leagueId}
          matchId={match.id}
          kickoffAt={match.kickoff_at}
          lockedAt={match.locked_at}
          matchStatus={match.status}
          inventory={leagueInventory}
          cards={cardsCatalog}
          members={leagueMembers}
          playedOnMatch={playedOnMatch}
          currentUserId={currentUserId}
        />
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
      <TeamDisplay
        name={null}
        placeholder={placeholder}
        align={align}
        size="md"
      />
    );
  }
  return (
    <TeamDisplay
      name={team.name}
      country_code={team.country_code}
      flag_emoji={team.flag_emoji}
      align={align}
      size="md"
    />
  );
}

function ScoreInput({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
}) {
  const dec = () => {
    if (value === null) return;
    onChange(Math.max(0, value - 1));
  };
  const inc = () => onChange(Math.min(20, (value ?? 0) + 1));
  return (
    <div className="pc-score-input">
      <button
        type="button"
        onClick={dec}
        disabled={disabled || value === null}
        className="pc-icon-btn sm"
        style={{ width: 36, height: 36 }}
      >
        −
      </button>
      <span className={`pc-score-value${value === null ? " empty" : ""}`}>
        {value === null ? "—" : value}
      </span>
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
