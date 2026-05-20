"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format, isToday, isTomorrow } from "date-fns";
import { fr } from "date-fns/locale";
import { IconChevronRight } from "@tabler/icons-react";
import { LeagueContextSelector } from "@/components/pronoclash/LeagueContextSelector";
import { TeamDisplay } from "@/components/pronoclash/TeamDisplay";
import { isPredictionLocked } from "@/lib/pronoclash/prediction-lock";
import {
  matchesPageHref,
  predictionMapKey,
  type LeagueContextId,
} from "@/lib/pronoclash/league-context-url";
import type { LeagueContextOption } from "@/components/pronoclash/LeagueContextSelector";

export type DashboardPrediction = {
  match_id: string;
  league_id: string | null;
  predicted_home_score: number;
  predicted_away_score: number;
};

export type DashboardPreviewMatch = {
  id: string;
  kickoffAt: string;
  compLabel: string;
  status: string;
  lockedAt: string | null;
  venueLabel: string | null;
  homeName: string | null;
  awayName: string | null;
  homeCountryCode: string | null;
  awayCountryCode: string | null;
  homeFlag: string | null;
  awayFlag: string | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
};

type Props = {
  leagueOptions: LeagueContextOption[];
  predictions: DashboardPrediction[];
  upcomingMatches: DashboardPreviewMatch[];
};

function formatMatchTime(iso: string) {
  return format(new Date(iso), "HH:mm", { locale: fr });
}

function formatDateGroup(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Aujourd'hui";
  if (isTomorrow(d)) return "Demain";
  return format(d, "EEEE d MMMM", { locale: fr });
}

function groupMatchesByDate(matches: DashboardPreviewMatch[]) {
  const map = new Map<string, DashboardPreviewMatch[]>();
  for (const m of matches) {
    const key = format(new Date(m.kickoffAt), "yyyy-MM-dd");
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }
  return Array.from(map.entries()).map(([dateKey, items]) => ({
    dateKey,
    label: formatDateGroup(items[0].kickoffAt),
    items,
  }));
}

type MatchStatusKey = "upcoming" | "locked" | "finished";

function resolveMatchStatus(m: DashboardPreviewMatch): { key: MatchStatusKey; label: string } {
  if (m.status === "finished") return { key: "finished", label: "Terminé" };
  if (
    m.status === "live" ||
    isPredictionLocked(m.lockedAt, m.kickoffAt)
  ) {
    return { key: "locked", label: "Verrouillé" };
  }
  return { key: "upcoming", label: "À venir" };
}

export function DashboardUpcomingSection({
  leagueOptions,
  predictions,
  upcomingMatches,
}: Props) {
  const [activeLeague, setActiveLeague] = useState<LeagueContextId>(null);

  const predByKey = useMemo(() => {
    const map = new Map<string, DashboardPrediction>();
    for (const p of predictions) {
      map.set(predictionMapKey(p.match_id, p.league_id), p);
    }
    return map;
  }, [predictions]);

  const activeLabel =
    leagueOptions.find((o) => o.id === activeLeague)?.name ?? "Ligue générale";

  const matchGroups = groupMatchesByDate(upcomingMatches);
  const matchesHref = matchesPageHref(activeLeague);

  if (upcomingMatches.length === 0) return null;

  return (
    <section className="pc-animate-in-delay-3" aria-label="Prochains matchs">
      <div className="pc-section-head">
        <div>
          <h2 className="pc-section-title">Prochains duels</h2>
          <p className="pc-section-desc">
            Choisis ta ligue, fais ton prono, verrouille ton intuition.
          </p>
        </div>
        <Link href={matchesHref} className="pc-link">
          Tout voir
          <IconChevronRight size={14} />
        </Link>
      </div>

      <LeagueContextSelector
        options={leagueOptions}
        active={activeLeague}
        onChange={setActiveLeague}
        hint={`Pronostics affichés pour : ${activeLabel}. Chaque ligue a ses propres pronos.`}
      />

      {matchGroups.map((group) => (
        <section key={group.dateKey} className="pc-date-block">
          <h3 className="pc-date-label">{group.label}</h3>
          <div className="pc-match-cards">
            {group.items.map((m, idx) => {
              const pred = predByKey.get(predictionMapKey(m.id, activeLeague));
              const status = resolveMatchStatus(m);
              const isFirst = idx === 0;
              return (
                <article
                  key={m.id}
                  className={`pc-match-card-game pc-glass${isFirst ? " spotlight" : ""}`}
                >
                  <div className="pc-match-card-head">
                    {m.venueLabel ? (
                      <span className="pc-match-venue">{m.venueLabel}</span>
                    ) : (
                      <span className="pc-match-venue">{m.compLabel}</span>
                    )}
                    <span className={`pc-match-status ${status.key}`}>{status.label}</span>
                  </div>
                  <div className="pc-match-card-teams">
                    <TeamDisplay
                      name={m.homeName}
                      country_code={m.homeCountryCode}
                      flag_emoji={m.homeFlag}
                      placeholder={m.homePlaceholder}
                      size="sm"
                    />
                    <div className="pc-match-card-center">
                      <span className="pc-match-card-time">{formatMatchTime(m.kickoffAt)}</span>
                      <span className="pc-match-card-stage">{m.compLabel}</span>
                      {pred ? (
                        <span className="pc-prono-chip">
                          {pred.predicted_home_score} – {pred.predicted_away_score}
                        </span>
                      ) : (
                        <span className="pc-prono-chip empty">Pas encore de prono</span>
                      )}
                    </div>
                    <TeamDisplay
                      name={m.awayName}
                      country_code={m.awayCountryCode}
                      flag_emoji={m.awayFlag}
                      placeholder={m.awayPlaceholder}
                      align="right"
                      size="sm"
                    />
                  </div>
                  <Link
                    href={`${matchesHref}&focus=${m.id}`}
                    className="pc-btn primary block"
                  >
                    {pred ? "Modifier mon prono" : "Pronostiquer"}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <div className="pc-match-preview-actions">
        <Link href={matchesHref} className="pc-btn primary block">
          Pronostiquer dans {activeLabel}
        </Link>
      </div>
    </section>
  );
}
