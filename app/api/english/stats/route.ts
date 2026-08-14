import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { todayDateISO } from "@/lib/english/srs";

function uniqueDays(values: (string | null)[]): Set<string> {
  const days = new Set<string>();
  for (const v of values) {
    if (v) days.add(v.slice(0, 10));
  }
  return days;
}

function computeStreak(days: Set<string>, today: string): number {
  if (days.size === 0) return 0;
  let cursor = today;
  if (!days.has(cursor)) {
    const y = new Date(`${today}T12:00:00`);
    y.setDate(y.getDate() - 1);
    cursor = y.toISOString().slice(0, 10);
    if (!days.has(cursor)) return 0;
  }
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    const d = new Date(`${cursor}T12:00:00`);
    d.setDate(d.getDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }
  return streak;
}

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const today = todayDateISO();

  const [
    { count: total },
    { count: dueToday },
    { count: known },
    { count: review },
    { count: reviewedToday },
    { data: reviewDates },
  ] = await Promise.all([
    supabase
      .from("english_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "archived"),
    supabase
      .from("english_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "archived")
      .lte("next_review_at", today),
    supabase
      .from("english_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "known"),
    supabase
      .from("english_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "review"),
    supabase
      .from("english_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "archived")
      .gte("last_reviewed_at", `${today}T00:00:00`)
      .lte("last_reviewed_at", `${today}T23:59:59`),
    supabase
      .from("english_entries")
      .select("last_reviewed_at")
      .eq("user_id", user.id)
      .not("last_reviewed_at", "is", null)
      .limit(500),
  ]);

  const due = dueToday ?? 0;
  const reviewed = reviewedToday ?? 0;
  const denom = due + reviewed;
  const progressToday = denom === 0 ? 100 : Math.round((reviewed / denom) * 100);

  return NextResponse.json({
    stats: {
      total: total ?? 0,
      dueToday: due,
      known: known ?? 0,
      review: review ?? 0,
      streak: computeStreak(
        uniqueDays((reviewDates ?? []).map((r) => r.last_reviewed_at as string | null)),
        today
      ),
      progressToday,
    },
  });
}
