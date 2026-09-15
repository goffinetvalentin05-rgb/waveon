import { CALENDAR_CATEGORY_COLORS } from "@/lib/calendar/types";
import { isDemoScheduledStatus } from "@/lib/crm/closed";
import {
  DEMO_CALENDAR_SOURCE,
  DEMO_REMINDER_TASK_KIND,
  DEMO_REMINDER_TITLE_PREFIX,
  demoEventTitle,
  demoReminderTitle,
  formatDemoEventDescription,
  isoToLocalDate,
  type ResolvedDemoSchedule,
} from "@/lib/crm/demo-schedule";
import { migrateProspectStatus } from "@/lib/crm/status";
import type { SupabaseClient } from "@supabase/supabase-js";

type ProspectRow = {
  id: string;
  club_name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  ville?: string | null;
  project_id?: string | null;
  status?: string | null;
  demo_at?: string | null;
  next_follow_up?: string | null;
  next_action?: string | null;
};

function eventScope(projectId: string | null | undefined): {
  scope: "personal" | "project";
  project_id: string | null;
} {
  if (projectId) return { scope: "project", project_id: projectId };
  return { scope: "personal", project_id: null };
}

export async function findCrmDemoEvent(
  supabase: SupabaseClient,
  userId: string,
  prospectId: string
) {
  const { data } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", userId)
    .eq("source", DEMO_CALENDAR_SOURCE)
    .eq("source_id", prospectId)
    .maybeSingle();
  return data;
}

export async function upsertCrmDemoEvent(
  supabase: SupabaseClient,
  userId: string,
  prospect: ProspectRow,
  schedule: ResolvedDemoSchedule
) {
  const scoped = eventScope(prospect.project_id);
  const payload = {
    title: demoEventTitle(prospect.club_name),
    category: "demo" as const,
    start_at: schedule.demoAt,
    end_at: schedule.endAt,
    all_day: false,
    description: formatDemoEventDescription({
      clubName: prospect.club_name,
      contactName: prospect.contact_name,
      phone: prospect.phone,
      email: prospect.email,
      durationMin: schedule.durationMin,
      note: schedule.note,
    }),
    color: CALENDAR_CATEGORY_COLORS.demo,
    location: prospect.ville ?? null,
    source: DEMO_CALENDAR_SOURCE,
    source_id: prospect.id,
    project_id: scoped.project_id,
    scope: scoped.scope,
  };

  const existing = await findCrmDemoEvent(supabase, userId, prospect.id);
  if (existing) {
    const { data, error } = await supabase
      .from("calendar_events")
      .update(payload)
      .eq("id", existing.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({ user_id: userId, ...payload })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteCrmDemoEvent(
  supabase: SupabaseClient,
  userId: string,
  prospectId: string
) {
  await supabase
    .from("calendar_events")
    .delete()
    .eq("user_id", userId)
    .eq("source", DEMO_CALENDAR_SOURCE)
    .eq("source_id", prospectId);
}

async function findOpenDemoReminder(
  supabase: SupabaseClient,
  userId: string,
  prospectId: string
) {
  const { data } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("prospect_id", prospectId)
    .eq("completed", false)
    .ilike("title", `${DEMO_REMINDER_TITLE_PREFIX}%`)
    .order("due_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function upsertDemoReminderTask(
  supabase: SupabaseClient,
  userId: string,
  prospect: ProspectRow,
  schedule: ResolvedDemoSchedule
) {
  if (!schedule.reminderOn) {
    await supabase
      .from("daily_tasks")
      .delete()
      .eq("user_id", userId)
      .eq("prospect_id", prospect.id)
      .eq("completed", false)
      .ilike("title", `${DEMO_REMINDER_TITLE_PREFIX}%`);
    return null;
  }

  const scoped = eventScope(prospect.project_id);
  const payload = {
    title: demoReminderTitle(prospect.club_name),
    description: schedule.note,
    due_date: schedule.reminderOn,
    due_time: null as string | null,
    prospect_id: prospect.id,
    project_id: scoped.project_id,
    scope: scoped.scope,
    task_kind: DEMO_REMINDER_TASK_KIND,
    completed: false,
    status: "À faire",
    notes: schedule.note,
  };

  const existing = await findOpenDemoReminder(supabase, userId, prospect.id);
  if (existing) {
    const { data, error } = await supabase
      .from("daily_tasks")
      .update(payload)
      .eq("id", existing.id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from("daily_tasks")
    .insert({ user_id: userId, ...payload })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function completeDemoReminderTasks(
  supabase: SupabaseClient,
  userId: string,
  prospectId: string
) {
  await supabase
    .from("daily_tasks")
    .update({ completed: true, completed_at: new Date().toISOString(), status: "Terminé" })
    .eq("user_id", userId)
    .eq("prospect_id", prospectId)
    .eq("completed", false)
    .ilike("title", `${DEMO_REMINDER_TITLE_PREFIX}%`);
}

/** Après un changement de statut : ne laisse pas d’événement / rappel orphelins. */
export async function syncDemoArtifactsForStatus(
  supabase: SupabaseClient,
  userId: string,
  prospectId: string,
  nextStatus: string
) {
  const status = migrateProspectStatus(nextStatus);
  if (isDemoScheduledStatus(status)) return;

  await completeDemoReminderTasks(supabase, userId, prospectId);

  if (status === "Décision en attente" || status === "Client") return;

  await deleteCrmDemoEvent(supabase, userId, prospectId);
}

export async function syncProspectFromCalendarDemoEvent(
  supabase: SupabaseClient,
  userId: string,
  event: { source?: string | null; source_id?: string | null; start_at: string; end_at: string }
) {
  if (event.source !== DEMO_CALENDAR_SOURCE || !event.source_id) return;

  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, demo_at, next_follow_up, next_action, status")
    .eq("id", event.source_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!prospect || !isDemoScheduledStatus(String(prospect.status ?? ""))) return;

  const oldDate = prospect.demo_at ? isoToLocalDate(prospect.demo_at) : null;

  const patch: Record<string, unknown> = { demo_at: event.start_at };
  if (prospect.next_follow_up === oldDate) {
    const next = nextActionAfterMovedDemo(event.start_at);
    patch.next_follow_up = next.nextFollowUp;
    patch.next_action = next.nextAction;
  }

  await supabase.from("prospects").update(patch).eq("id", prospect.id).eq("user_id", userId);
}

function nextActionAfterMovedDemo(demoAt: string) {
  const time = isoToLocalDate(demoAt);
  const hours = new Date(demoAt);
  const hh = String(hours.getHours()).padStart(2, "0");
  const mm = String(hours.getMinutes()).padStart(2, "0");
  return {
    nextFollowUp: time,
    nextAction: `Démo planifiée · ${hh}:${mm}`,
  };
}

export function eventDurationMinutes(startAt: string, endAt: string): number {
  const minutes = Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000);
  return minutes > 0 ? minutes : 30;
}
