import { TEAMS_2026 } from "@/supabase/seed/teams-2026";

/** Codes FIFA 3 lettres (seed / Sportmonks) → nom français + emoji */
const FIFA_MAP = new Map(
  TEAMS_2026.map((t) => [t.country_code.toUpperCase(), { name: t.name, flag: t.flag_emoji }])
);

/** Codes ISO alpha-2 courants (Sportmonks) → FIFA 3 lettres du seed */
const ISO2_TO_FIFA: Record<string, string> = {
  MX: "MEX",
  ZA: "RSA",
  KR: "KOR",
  CZ: "CZE",
  CA: "CAN",
  CH: "SUI",
  QA: "QAT",
  BA: "BIH",
  BR: "BRA",
  MA: "MAR",
  HT: "HAI",
  GB: "ENG",
  US: "USA",
  AU: "AUS",
  PY: "PAR",
  TR: "TUR",
  DE: "GER",
  CI: "CIV",
  EC: "ECU",
  CW: "CUW",
  NL: "NED",
  JP: "JPN",
  SE: "SWE",
  TN: "TUN",
  BE: "BEL",
  IR: "IRN",
  NZ: "NZL",
  EG: "EGY",
  UY: "URU",
  ES: "ESP",
  SA: "KSA",
  CV: "CPV",
  FR: "FRA",
  SN: "SEN",
  IQ: "IRQ",
  NO: "NOR",
  AR: "ARG",
  DZ: "ALG",
  AT: "AUT",
  JO: "JOR",
  PT: "POR",
  CD: "COD",
  UZ: "UZB",
  CO: "COL",
  HR: "CRO",
  GH: "GHA",
  PA: "PAN",
};

function flagFromIso2(iso2: string): string | null {
  const c = iso2.toUpperCase();
  if (c.length !== 2 || !/^[A-Z]{2}$/.test(c)) return null;
  const cp = [...c].map((ch) => 0x1f1e6 - 65 + ch.charCodeAt(0));
  return String.fromCodePoint(...cp);
}

function normalizeFifaCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const raw = code.trim().toUpperCase();
  if (!raw) return null;
  if (raw.length === 3 && FIFA_MAP.has(raw)) return raw;
  if (raw.length === 2 && ISO2_TO_FIFA[raw]) return ISO2_TO_FIFA[raw];
  if (raw.length === 3) return raw;
  return null;
}

export type TeamDisplayInfo = {
  flag: string;
  countryName: string;
  teamName: string;
};

export function resolveTeamDisplay(input: {
  name: string | null | undefined;
  country_code?: string | null;
  flag_emoji?: string | null;
  placeholder?: string | null;
}): TeamDisplayInfo {
  if (!input.name) {
    const ph = input.placeholder ?? "À déterminer";
    return { flag: "🏳️", countryName: ph, teamName: ph };
  }

  const fifa = normalizeFifaCode(input.country_code);
  const meta = fifa ? FIFA_MAP.get(fifa) : undefined;
  const iso2 =
    input.country_code && input.country_code.trim().length === 2
      ? input.country_code.trim().toUpperCase()
      : null;

  const flag =
    input.flag_emoji ??
    meta?.flag ??
    (iso2 ? flagFromIso2(iso2) : null) ??
    "🏳️";

  const countryName = meta?.name ?? input.name;

  return {
    flag,
    countryName,
    teamName: input.name,
  };
}
