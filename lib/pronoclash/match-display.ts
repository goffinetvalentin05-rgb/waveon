export function shortStageLabel(stage: string, groupName: string | null) {
  if (groupName) return `G ${groupName}`;
  const map: Record<string, string> = {
    group: "Grp",
    round_of_32: "1/16",
    round_of_16: "1/8",
    quarter_final: "1/4",
    semi_final: "1/2",
    third_place: "3e",
    final: "Finale",
  };
  return map[stage] ?? stage;
}

export function longStageLabel(stage: string, groupName: string | null) {
  if (groupName) return `Groupe ${groupName}`;
  const map: Record<string, string> = {
    group: "Phase de groupes",
    round_of_32: "16es de finale",
    round_of_16: "8es de finale",
    quarter_final: "Quart de finale",
    semi_final: "Demi-finale",
    third_place: "Match pour la 3ème place",
    final: "Finale",
  };
  return map[stage] ?? stage;
}

export function teamCode(name: string | null | undefined, countryCode: string | null | undefined) {
  if (countryCode) return countryCode.toUpperCase().slice(0, 3);
  if (name) return name.slice(0, 2).toUpperCase();
  return "—";
}

export const MATCH_SELECT_WITH_TEAMS =
  "id, match_number, kickoff_at, locked_at, status, stage, group_name, venue, city, country, home_score, away_score, home_placeholder, away_placeholder, home:home_team_id(id, name, country_code, flag_emoji), away:away_team_id(id, name, country_code, flag_emoji)" as const;
