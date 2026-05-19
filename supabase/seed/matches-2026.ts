/**
 * Modèle d'import des matchs du tournoi mondial 2026.
 *
 * Colonnes CSV attendues (admin /api/admin/matches/import) :
 * match_number, stage, group_name, home_team_code, away_team_code,
 * home_placeholder, away_placeholder, venue, city, country, kickoff_at
 *
 * - Si home_team_code / away_team_code est renseigné → liaison à teams.country_code
 * - Sinon → utiliser home_placeholder / away_placeholder (ex. "Winner Group A")
 *
 * Ajoute les matchs ici ou importe un CSV depuis /admin/tournament/matches.
 */
export type MatchSeed = {
  match_number: number;
  stage: string;
  group_name: string | null;
  home_team_code: string | null;
  away_team_code: string | null;
  home_placeholder: string | null;
  away_placeholder: string | null;
  venue: string | null;
  city: string | null;
  country: string | null;
  /** ISO 8601 UTC, ex. 2026-06-11T19:00:00Z */
  kickoff_at: string;
};

/** Exemples — compléter via CSV admin avant le tournoi. */
export const MATCHES_2026: MatchSeed[] = [
  // Phase de groupes — exemple Group A (à compléter)
  {
    match_number: 1,
    stage: "group",
    group_name: "A",
    home_team_code: "MEX",
    away_team_code: "RSA",
    home_placeholder: null,
    away_placeholder: null,
    venue: null,
    city: null,
    country: null,
    kickoff_at: "2026-06-11T19:00:00Z",
  },
  // Phases finales — placeholders
  {
    match_number: 73,
    stage: "round_of_32",
    group_name: null,
    home_team_code: null,
    away_team_code: null,
    home_placeholder: "Winner Group A",
    away_placeholder: "Runner-up Group B",
    venue: null,
    city: null,
    country: null,
    kickoff_at: "2026-07-01T17:00:00Z",
  },
  {
    match_number: 104,
    stage: "final",
    group_name: null,
    home_team_code: null,
    away_team_code: null,
    home_placeholder: "Winner Match 101",
    away_placeholder: "Winner Match 102",
    venue: null,
    city: null,
    country: null,
    kickoff_at: "2026-07-19T19:00:00Z",
  },
];

/** En-tête CSV pour export / modèle admin */
export const MATCHES_CSV_HEADER =
  "match_number,stage,group_name,home_team_code,away_team_code,home_placeholder,away_placeholder,venue,city,country,kickoff_at";
