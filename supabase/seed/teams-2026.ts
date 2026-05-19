/**
 * 48 équipes — phase de groupes du tournoi mondial de football 2026.
 * country_code = code FIFA/ISO utilisé pour l'import CSV des matchs.
 */
export type TeamSeed = {
  name: string;
  slug: string;
  country_code: string;
  flag_emoji: string;
  group_name: string;
  display_order: number;
  is_outsider?: boolean;
};

export const TEAMS_2026: TeamSeed[] = [
  // Group A
  { name: "Mexico", slug: "mexico", country_code: "MEX", flag_emoji: "🇲🇽", group_name: "A", display_order: 1 },
  { name: "South Africa", slug: "south-africa", country_code: "RSA", flag_emoji: "🇿🇦", group_name: "A", display_order: 2 },
  { name: "Korea Republic", slug: "korea-republic", country_code: "KOR", flag_emoji: "🇰🇷", group_name: "A", display_order: 3 },
  { name: "Czechia", slug: "czechia", country_code: "CZE", flag_emoji: "🇨🇿", group_name: "A", display_order: 4 },
  // Group B
  { name: "Canada", slug: "canada", country_code: "CAN", flag_emoji: "🇨🇦", group_name: "B", display_order: 1 },
  { name: "Switzerland", slug: "switzerland", country_code: "SUI", flag_emoji: "🇨🇭", group_name: "B", display_order: 2 },
  { name: "Qatar", slug: "qatar", country_code: "QAT", flag_emoji: "🇶🇦", group_name: "B", display_order: 3 },
  { name: "Bosnia and Herzegovina", slug: "bosnia-and-herzegovina", country_code: "BIH", flag_emoji: "🇧🇦", group_name: "B", display_order: 4 },
  // Group C
  { name: "Brazil", slug: "brazil", country_code: "BRA", flag_emoji: "🇧🇷", group_name: "C", display_order: 1 },
  { name: "Morocco", slug: "morocco", country_code: "MAR", flag_emoji: "🇲🇦", group_name: "C", display_order: 2 },
  { name: "Haiti", slug: "haiti", country_code: "HAI", flag_emoji: "🇭🇹", group_name: "C", display_order: 3 },
  { name: "Scotland", slug: "scotland", country_code: "SCO", flag_emoji: "🏴", group_name: "C", display_order: 4 },
  // Group D
  { name: "United States", slug: "united-states", country_code: "USA", flag_emoji: "🇺🇸", group_name: "D", display_order: 1 },
  { name: "Australia", slug: "australia", country_code: "AUS", flag_emoji: "🇦🇺", group_name: "D", display_order: 2 },
  { name: "Paraguay", slug: "paraguay", country_code: "PAR", flag_emoji: "🇵🇾", group_name: "D", display_order: 3 },
  { name: "Türkiye", slug: "turkiye", country_code: "TUR", flag_emoji: "🇹🇷", group_name: "D", display_order: 4 },
  // Group E
  { name: "Germany", slug: "germany", country_code: "GER", flag_emoji: "🇩🇪", group_name: "E", display_order: 1 },
  { name: "Côte d'Ivoire", slug: "cote-divoire", country_code: "CIV", flag_emoji: "🇨🇮", group_name: "E", display_order: 2 },
  { name: "Ecuador", slug: "ecuador", country_code: "ECU", flag_emoji: "🇪🇨", group_name: "E", display_order: 3 },
  { name: "Curaçao", slug: "curacao", country_code: "CUW", flag_emoji: "🇨🇼", group_name: "E", display_order: 4, is_outsider: true },
  // Group F
  { name: "Netherlands", slug: "netherlands", country_code: "NED", flag_emoji: "🇳🇱", group_name: "F", display_order: 1 },
  { name: "Japan", slug: "japan", country_code: "JPN", flag_emoji: "🇯🇵", group_name: "F", display_order: 2 },
  { name: "Sweden", slug: "sweden", country_code: "SWE", flag_emoji: "🇸🇪", group_name: "F", display_order: 3 },
  { name: "Tunisia", slug: "tunisia", country_code: "TUN", flag_emoji: "🇹🇳", group_name: "F", display_order: 4 },
  // Group G
  { name: "Belgium", slug: "belgium", country_code: "BEL", flag_emoji: "🇧🇪", group_name: "G", display_order: 1 },
  { name: "IR Iran", slug: "ir-iran", country_code: "IRN", flag_emoji: "🇮🇷", group_name: "G", display_order: 2 },
  { name: "New Zealand", slug: "new-zealand", country_code: "NZL", flag_emoji: "🇳🇿", group_name: "G", display_order: 3, is_outsider: true },
  { name: "Egypt", slug: "egypt", country_code: "EGY", flag_emoji: "🇪🇬", group_name: "G", display_order: 4 },
  // Group H
  { name: "Uruguay", slug: "uruguay", country_code: "URU", flag_emoji: "🇺🇾", group_name: "H", display_order: 1 },
  { name: "Spain", slug: "spain", country_code: "ESP", flag_emoji: "🇪🇸", group_name: "H", display_order: 2 },
  { name: "Saudi Arabia", slug: "saudi-arabia", country_code: "KSA", flag_emoji: "🇸🇦", group_name: "H", display_order: 3 },
  { name: "Cabo Verde", slug: "cabo-verde", country_code: "CPV", flag_emoji: "🇨🇻", group_name: "H", display_order: 4, is_outsider: true },
  // Group I
  { name: "France", slug: "france", country_code: "FRA", flag_emoji: "🇫🇷", group_name: "I", display_order: 1 },
  { name: "Senegal", slug: "senegal", country_code: "SEN", flag_emoji: "🇸🇳", group_name: "I", display_order: 2 },
  { name: "Iraq", slug: "iraq", country_code: "IRQ", flag_emoji: "🇮🇶", group_name: "I", display_order: 3 },
  { name: "Norway", slug: "norway", country_code: "NOR", flag_emoji: "🇳🇴", group_name: "I", display_order: 4 },
  // Group J
  { name: "Argentina", slug: "argentina", country_code: "ARG", flag_emoji: "🇦🇷", group_name: "J", display_order: 1 },
  { name: "Algeria", slug: "algeria", country_code: "ALG", flag_emoji: "🇩🇿", group_name: "J", display_order: 2 },
  { name: "Austria", slug: "austria", country_code: "AUT", flag_emoji: "🇦🇹", group_name: "J", display_order: 3 },
  { name: "Jordan", slug: "jordan", country_code: "JOR", flag_emoji: "🇯🇴", group_name: "J", display_order: 4 },
  // Group K
  { name: "Portugal", slug: "portugal", country_code: "POR", flag_emoji: "🇵🇹", group_name: "K", display_order: 1 },
  { name: "DR Congo", slug: "dr-congo", country_code: "COD", flag_emoji: "🇨🇩", group_name: "K", display_order: 2 },
  { name: "Uzbekistan", slug: "uzbekistan", country_code: "UZB", flag_emoji: "🇺🇿", group_name: "K", display_order: 3, is_outsider: true },
  { name: "Colombia", slug: "colombia", country_code: "COL", flag_emoji: "🇨🇴", group_name: "K", display_order: 4 },
  // Group L
  { name: "England", slug: "england", country_code: "ENG", flag_emoji: "🏴", group_name: "L", display_order: 1 },
  { name: "Croatia", slug: "croatia", country_code: "CRO", flag_emoji: "🇭🇷", group_name: "L", display_order: 2 },
  { name: "Ghana", slug: "ghana", country_code: "GHA", flag_emoji: "🇬🇭", group_name: "L", display_order: 3 },
  { name: "Panama", slug: "panama", country_code: "PAN", flag_emoji: "🇵🇦", group_name: "L", display_order: 4, is_outsider: true },
];
