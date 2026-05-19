import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/pronoclash/admin-guard";

export const runtime = "nodejs";

const REQUIRED = [
  "match_number",
  "stage",
  "group_name",
  "home_team_code",
  "away_team_code",
  "home_placeholder",
  "away_placeholder",
  "venue",
  "city",
  "country",
  "kickoff_at",
];

type Row = Record<string, string>;

function parseCSV(input: string): { header: string[]; rows: Row[] } {
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { header: [], rows: [] };
  const header = splitLine(lines[0]).map((s) => s.trim());
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const row: Row = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = (cells[j] ?? "").trim();
    }
    rows.push(row);
  }
  return { header, rows };
}

function splitLine(line: string): string[] {
  // Split CSV simple (gère les " enquoted commas).
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === "," && !inQuote) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const text = await req.text();
  if (!text.trim()) {
    return NextResponse.json({ error: "Corps CSV vide." }, { status: 400 });
  }

  const { header, rows } = parseCSV(text);
  if (rows.length === 0) {
    return NextResponse.json({ error: "Aucune ligne trouvée." }, { status: 400 });
  }
  const missingCols = REQUIRED.filter((c) => !header.includes(c));
  if (missingCols.length > 0) {
    return NextResponse.json(
      { error: `Colonnes manquantes : ${missingCols.join(", ")}` },
      { status: 400 }
    );
  }

  // Pré-charger les équipes par country_code
  const { data: teamsData } = await guard.admin
    .from("teams")
    .select("id, country_code");
  const teamsByCode = new Map<string, string>();
  for (const t of (teamsData ?? []) as { id: string; country_code: string | null }[]) {
    if (t.country_code) teamsByCode.set(t.country_code.toUpperCase(), t.id);
  }

  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const r of rows) {
    const matchNumberRaw = r.match_number;
    const matchNumber = matchNumberRaw ? Number(matchNumberRaw) : null;
    const stage = r.stage || "group";
    const groupName = r.group_name || null;
    const homeCode = (r.home_team_code || "").toUpperCase() || null;
    const awayCode = (r.away_team_code || "").toUpperCase() || null;
    const homeTeamId = homeCode ? (teamsByCode.get(homeCode) ?? null) : null;
    const awayTeamId = awayCode ? (teamsByCode.get(awayCode) ?? null) : null;
    const homePlaceholder = r.home_placeholder || null;
    const awayPlaceholder = r.away_placeholder || null;
    const venue = r.venue || null;
    const city = r.city || null;
    const country = r.country || null;
    const kickoffAt = r.kickoff_at;

    if (!kickoffAt) {
      errors.push(`#${matchNumberRaw || "?"} : kickoff_at manquant`);
      continue;
    }
    if (homeCode && !homeTeamId) {
      errors.push(`#${matchNumberRaw || "?"} : home_team_code ${homeCode} inconnu`);
      continue;
    }
    if (awayCode && !awayTeamId) {
      errors.push(`#${matchNumberRaw || "?"} : away_team_code ${awayCode} inconnu`);
      continue;
    }

    const payload = {
      match_number: matchNumber,
      stage,
      group_name: groupName,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      home_placeholder: homePlaceholder,
      away_placeholder: awayPlaceholder,
      venue,
      city,
      country,
      kickoff_at: kickoffAt,
      locked_at: kickoffAt,
    };

    if (matchNumber == null) {
      // pas de match_number → insert toujours
      const { error } = await guard.admin.from("matches").insert({ ...payload, status: "scheduled" });
      if (error) {
        errors.push(`#? : ${error.message}`);
        continue;
      }
      inserted++;
    } else {
      // Upsert on match_number
      const { data: existing } = await guard.admin
        .from("matches")
        .select("id")
        .eq("match_number", matchNumber)
        .maybeSingle();
      if (existing) {
        const { error } = await guard.admin
          .from("matches")
          .update(payload)
          .eq("id", (existing as { id: string }).id);
        if (error) {
          errors.push(`#${matchNumber} : ${error.message}`);
          continue;
        }
        updated++;
      } else {
        const { error } = await guard.admin
          .from("matches")
          .insert({ ...payload, status: "scheduled" });
        if (error) {
          errors.push(`#${matchNumber} : ${error.message}`);
          continue;
        }
        inserted++;
      }
    }
  }

  return NextResponse.json({ ok: true, inserted, updated, errors });
}
