import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/pronoclash/admin-guard";

export const runtime = "nodejs";

/**
 * Recalcule contest_results à partir des pronostics globaux (league_id IS NULL).
 * - global_points = profiles.total_points
 * - exact_scores_count, correct_winners_count, predictions_count = agrégat sur
 *   les pronostics du joueur dans la ligue générale uniquement
 * - rank = par global_points DESC, puis tie-break dans cet ordre
 */
export async function POST() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const admin = guard.admin;

  const { data: settings } = await admin
    .from("contest_settings")
    .select("tie_break_rules")
    .limit(1)
    .maybeSingle();
  const tieBreak = ((settings?.tie_break_rules as string[] | null) ?? [
    "exact_scores_count",
    "correct_winners_count",
    "predictions_count",
    "manual_draw",
  ]) as string[];

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, total_points");
  type Profile = { id: string; total_points: number };
  const list = (profiles ?? []) as Profile[];

  type Row = {
    user_id: string;
    global_points: number;
    exact_scores_count: number;
    correct_winners_count: number;
    predictions_count: number;
  };
  const rows: Row[] = [];

  for (const p of list) {
    const { data: preds } = await admin
      .from("predictions")
      .select("exact_score, correct_winner")
      .eq("user_id", p.id)
      .is("league_id", null);
    type PredRow = { exact_score: boolean; correct_winner: boolean };
    const pl = (preds ?? []) as PredRow[];
    rows.push({
      user_id: p.id,
      global_points: p.total_points ?? 0,
      exact_scores_count: pl.filter((x) => x.exact_score).length,
      correct_winners_count: pl.filter((x) => x.correct_winner).length,
      predictions_count: pl.length,
    });
  }

  // Tri : points DESC puis tie-break configuré
  rows.sort((a, b) => {
    if (b.global_points !== a.global_points) return b.global_points - a.global_points;
    for (const rule of tieBreak) {
      if (rule === "exact_scores_count" && a.exact_scores_count !== b.exact_scores_count) {
        return b.exact_scores_count - a.exact_scores_count;
      }
      if (rule === "correct_winners_count" && a.correct_winners_count !== b.correct_winners_count) {
        return b.correct_winners_count - a.correct_winners_count;
      }
      if (rule === "predictions_count" && a.predictions_count !== b.predictions_count) {
        return b.predictions_count - a.predictions_count;
      }
    }
    return 0;
  });

  // Upsert contest_results
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    await admin
      .from("contest_results")
      .upsert(
        {
          user_id: r.user_id,
          global_points: r.global_points,
          exact_scores_count: r.exact_scores_count,
          correct_winners_count: r.correct_winners_count,
          predictions_count: r.predictions_count,
          rank: i + 1,
        },
        { onConflict: "user_id" }
      );
  }

  return NextResponse.json({ ok: true, processed: rows.length });
}
