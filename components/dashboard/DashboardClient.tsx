"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format, isToday, isTomorrow } from "date-fns";
import { fr } from "date-fns/locale";
import { IconChevronRight } from "@tabler/icons-react";
import { LeagueContextSelector } from "@/components/pronoclash/LeagueContextSelector";
import { TeamDisplay } from "@/components/pronoclash/TeamDisplay";
import {
  leagueContextToParam,
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
    <>
      <div className="pc-section-head">
        <h2 className="pc-section-title">Prochains matchs</h2>
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
          <div className="pc-match-list pc-glass">
            {group.items.map((m, idx) => {
              const pred = predByKey.get(predictionMapKey(m.id, activeLeague));
              return (
                <div
                  key={m.id}
                  className={`pc-match-preview${idx < group.items.length - 1 ? " bordered" : ""}`}
                >
                  <div className="pc-match-preview-teams">
                    <TeamDisplay
                      name={m.homeName}
                      country_code={m.homeCountryCode}
                      flag_emoji={m.homeFlag}
                      placeholder={m.homePlaceholder}
                      size="sm"
                    />
                    <div className="pc-match-center">
                      <span className="pc-match-time">{formatMatchTime(m.kickoffAt)}</span>
                      <span className="pc-match-stage">{m.compLabel}</span>
                      {pred ? (
                        <span className="pc-prono-badge">
                          {pred.predicted_home_score} – {pred.predicted_away_score}
                        </span>
                      ) : (
                        <span className="pc-prono-badge empty">Pas encore de prono</span>
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
                    className="pc-btn ghost sm block"
                  >
                    {pred ? "Modifier mon prono" : "Pronostiquer"}
                  </Link>
                </div>
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
    </>
  );
}
