import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { isClosedProspectStatus } from "@/lib/crm/closed";
import {
  DEMO_REMINDER_TITLE_PREFIX,
  inferReminderPreset,
  isDemoReminderPreset,
  isoToLocalDate,
  isoToLocalTime,
  parseDemoScheduleDescription,
  resolveDemoSchedule,
  serializeDemoScheduleDescription,
  validateDemoScheduleInput,
  type DemoReminderPresetId,
} from "@/lib/crm/demo-schedule";
import {
  completeDemoReminderTasks,
  deleteCrmDemoEvent,
  eventDurationMinutes,
  findCrmDemoEvent,
  syncDemoArtifactsForStatus,
  upsertCrmDemoEvent,
  upsertDemoReminderTask,
} from "@/lib/crm/sync-demo-schedule";
import { normalizeProspectFromDb } from "@/lib/crm/prospect-payload";
import { migrateProspectStatus } from "@/lib/crm/status";
import { syncProspectFollowUpTask } from "@/lib/crm/sync-follow-up-task";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const { data: prospect } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { data: activity } = await supabase
    .from("prospect_activities")
    .select("description")
    .eq("prospect_id", id)
    .eq("user_id", user.id)
    .eq("action_type", "demo_scheduled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const parsed = parseDemoScheduleDescription(activity?.description ?? null);
  const event = await findCrmDemoEvent(supabase, user.id, id);
  const { data: reminder } = await supabase
    .from("daily_tasks")
    .select("id, due_date, completed, title")
    .eq("user_id", user.id)
    .eq("prospect_id", id)
    .ilike("title", `${DEMO_REMINDER_TITLE_PREFIX}%`)
    .eq("completed", false)
    .order("due_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  const demoAt = event?.start_at || parsed.demoAt || prospect.demo_at;
  const durationMin = event
    ? eventDurationMinutes(event.start_at, event.end_at)
    : parsed.durationMin;
  const reminderOn = reminder?.due_date ?? parsed.reminderOn ?? null;
  const demoDate = demoAt ? isoToLocalDate(String(demoAt)) : "";
  const demoTime = demoAt ? isoToLocalTime(String(demoAt)) : "14:00";

  return NextResponse.json({
    scheduled: Boolean(demoAt),
    demo_date: demoDate,
    demo_time: demoTime,
    duration_min: durationMin,
    reminder_date: reminderOn,
    reminder_preset: inferReminderPreset(demoDate, reminderOn),
    note: parsed.note,
    reminder_task_id: reminder?.id ?? null,
  });
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const body = await request.json();

  const reminderPreset = String(body.reminder_preset ?? "none");
  const input = {
    demoDate: String(body.demo_date ?? "").slice(0, 10),
    demoTime: String(body.demo_time ?? "").slice(0, 5),
    durationMin: Number(body.duration_min ?? 30),
    reminderPreset: (isDemoReminderPreset(reminderPreset) ? reminderPreset : "none") as DemoReminderPresetId,
    reminderDate: body.reminder_date ? String(body.reminder_date).slice(0, 10) : null,
    note: typeof body.note === "string" ? body.note : null,
  };

  const invalid = validateDemoScheduleInput(input);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const schedule = resolveDemoSchedule(input);

  const { data: prospect, error: fetchError } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const currentStatus = migrateProspectStatus(String(prospect.status ?? "À contacter"));
  if (isClosedProspectStatus(currentStatus)) {
    return NextResponse.json({ error: "Ce prospect est déjà clos." }, { status: 400 });
  }

  try {
    await upsertCrmDemoEvent(supabase, user.id, prospect, schedule);
    await upsertDemoReminderTask(supabase, user.id, prospect, schedule);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de synchroniser le calendrier.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("prospects")
    .update({
      status: "Démo",
      last_action: "Démo planifiée",
      last_action_at: new Date().toISOString(),
      demo_at: schedule.demoAt,
      next_follow_up: schedule.nextFollowUp,
      next_action: schedule.nextAction,
      closed_reason: null,
      closed_note: null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  await syncProspectFollowUpTask(supabase, {
    userId: user.id,
    prospectId: id,
    clubName: prospect.club_name,
    status: "Démo",
    nextFollowUp: schedule.nextFollowUp,
  });

  const { data: existingActivity } = await supabase
    .from("prospect_activities")
    .select("id")
    .eq("prospect_id", id)
    .eq("user_id", user.id)
    .eq("action_type", "demo_scheduled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const activityPayload = {
    title: "Démonstration planifiée",
    description: serializeDemoScheduleDescription(schedule),
    occurred_at: schedule.demoAt,
  };

  if (existingActivity && currentStatus === "Démo") {
    await supabase
      .from("prospect_activities")
      .update(activityPayload)
      .eq("id", existingActivity.id)
      .eq("user_id", user.id);
  } else {
    await supabase.from("prospect_activities").insert({
      user_id: user.id,
      prospect_id: id,
      action_type: "demo_scheduled",
      ...activityPayload,
    });
  }

  const { data: activities } = await supabase
    .from("prospect_activities")
    .select("*")
    .eq("prospect_id", id)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });

  return NextResponse.json({
    prospect: updated ? normalizeProspectFromDb(updated as Record<string, unknown>) : updated,
    activities: activities ?? [],
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const { data: prospect } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await deleteCrmDemoEvent(supabase, user.id, id);
  await completeDemoReminderTasks(supabase, user.id, id);
  await supabase
    .from("daily_tasks")
    .delete()
    .eq("user_id", user.id)
    .eq("prospect_id", id)
    .ilike("title", `${DEMO_REMINDER_TITLE_PREFIX}%`)
    .eq("completed", false);

  const fromStatus = migrateProspectStatus(String(prospect.status ?? "À contacter"));
  const nextStatus = fromStatus === "Démo" ? "En discussion" : fromStatus;

  await supabase
    .from("prospects")
    .update({
      status: nextStatus,
      demo_at: null,
      next_follow_up: nextStatus === "En discussion" ? null : prospect.next_follow_up,
      next_action: nextStatus === "En discussion" ? "Relancer" : prospect.next_action,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  await supabase.from("prospect_activities").insert({
    user_id: user.id,
    prospect_id: id,
    action_type: "note",
    title: "Démonstration annulée",
    description: "La démo planifiée a été annulée. L’événement calendrier et le rappel associé ont été retirés.",
  });

  await syncDemoArtifactsForStatus(supabase, user.id, id, nextStatus);
  await syncProspectFollowUpTask(supabase, {
    userId: user.id,
    prospectId: id,
    clubName: prospect.club_name,
    status: nextStatus,
    nextFollowUp: nextStatus === "En discussion" ? null : prospect.next_follow_up,
  });

  const { data: updated } = await supabase.from("prospects").select("*").eq("id", id).maybeSingle();
  const { data: activities } = await supabase
    .from("prospect_activities")
    .select("*")
    .eq("prospect_id", id)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });

  return NextResponse.json({
    prospect: updated ? normalizeProspectFromDb(updated as Record<string, unknown>) : updated,
    activities: activities ?? [],
  });
}
