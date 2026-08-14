import type { SupabaseClient } from "@supabase/supabase-js";
import { dateInTimezone, getUserTimezone } from "@/lib/calendar/timezone";
import type { CalendarEvent } from "@/lib/calendar/types";
import type { DailyTask, Prospect } from "@/lib/crm/types";
import { todayDateISO } from "@/lib/english/srs";
import { ensureTodayTasks } from "@/lib/crm/ensure-today-tasks";
import { normalizeProspectFromDb } from "@/lib/crm/prospect-payload";

export type CockpitData = {
  followUpsDue: number;
  meetingsToday: number;
  wordsDue: number;
  tasksLeft: number;
  prospects: Prospect[];
  events: CalendarEvent[];
  tasks: DailyTask[];
  english: {
    dueToday: number;
    streak: number;
    progress: number;
    reviewedToday: number;
  };
};

function startOfDayIso(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function endOfDayIso(date: string): string {
  return `${date}T23:59:59.999Z`;
}

function uniqueReviewDays(values: (string | null)[]): Set<string> {
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

export async function loadCockpitData(
  supabase: SupabaseClient,
  userId: string
): Promise<CockpitData> {
  const tz = await getUserTimezone(supabase, userId);
  const today = dateInTimezone(tz);
  const englishToday = todayDateISO(tz);

  await ensureTodayTasks(supabase, userId, today);

  const [
    followUpsRes,
    prospectsRes,
    eventsRes,
    tasksRes,
    dueEnglishRes,
    reviewedRes,
    reviewDatesRes,
  ] = await Promise.all([
    supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("archived_at", null)
      .lte("next_follow_up", today)
      .not("status", "in", '("Client","Refus","Pas intéressé")'),
    supabase
      .from("prospects")
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null)
      .lte("next_follow_up", today)
      .not("status", "in", '("Client","Refus","Pas intéressé")')
      .order("next_follow_up", { ascending: true })
      .limit(6),
    supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", userId)
      .lte("start_at", endOfDayIso(today))
      .gte("end_at", startOfDayIso(today))
      .order("start_at", { ascending: true }),
    supabase
      .from("daily_tasks")
      .select("*, prospect:prospects(id, club_name, status)")
      .eq("user_id", userId)
      .eq("due_date", today)
      .order("completed", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("english_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("status", "archived")
      .lte("next_review_at", englishToday),
    supabase
      .from("english_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("status", "archived")
      .gte("last_reviewed_at", `${englishToday}T00:00:00`)
      .lte("last_reviewed_at", `${englishToday}T23:59:59`),
    supabase
      .from("english_entries")
      .select("last_reviewed_at")
      .eq("user_id", userId)
      .not("last_reviewed_at", "is", null)
      .limit(500),
  ]);

  const tasks = tasksRes.error ? [] : ((tasksRes.data ?? []) as DailyTask[]);
  const dueToday = dueEnglishRes.error ? 0 : (dueEnglishRes.count ?? 0);
  const reviewedToday = reviewedRes.error ? 0 : (reviewedRes.count ?? 0);
  const denom = reviewedToday + dueToday;
  const progress = denom === 0 ? 100 : Math.round((reviewedToday / denom) * 100);
  const streak = reviewDatesRes.error
    ? 0
    : computeStreak(
        uniqueReviewDays((reviewDatesRes.data ?? []).map((r) => r.last_reviewed_at as string | null)),
        englishToday
      );

  return {
    followUpsDue: followUpsRes.error ? 0 : (followUpsRes.count ?? 0),
    meetingsToday: eventsRes.error ? 0 : (eventsRes.data?.length ?? 0),
    wordsDue: dueToday,
    tasksLeft: tasks.filter((t) => !t.completed).length,
    prospects: (prospectsRes.data ?? []).map(
      (p) => normalizeProspectFromDb(p as Record<string, unknown>) as Prospect
    ),
    events: (eventsRes.error ? [] : (eventsRes.data ?? [])) as CalendarEvent[],
    tasks,
    english: {
      dueToday,
      streak,
      progress,
      reviewedToday,
    },
  };
}
