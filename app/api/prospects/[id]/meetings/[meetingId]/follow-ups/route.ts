import { NextResponse } from "next/server";
import { addHours } from "date-fns";
import { requireUser } from "@/lib/crm/server";
import { loadWritableProspect } from "@/lib/crm/meeting-server";
import { parseMeetingRow } from "@/lib/crm/meetings";
import { syncProspectFollowUpTask } from "@/lib/crm/sync-follow-up-task";
import { parseScopeInput } from "@/lib/workspace/scope";
import { logWorkspaceEvent } from "@/lib/workspace/events";

type Params = { params: Promise<{ id: string; meetingId: string }> };

type FollowUpItem = {
  kind: "task" | "follow_up" | "meeting";
  title: string;
  due?: string | null;
};

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id, meetingId } = await params;

  const prospect = await loadWritableProspect(supabase, id);
  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { data: meetingRow } = await supabase
    .from("prospect_meetings")
    .select("*")
    .eq("id", meetingId)
    .eq("prospect_id", id)
    .maybeSingle();
  if (!meetingRow) return NextResponse.json({ error: "Compte-rendu introuvable." }, { status: 404 });

  const body = await request.json();
  const items = (Array.isArray(body.items) ? body.items : [])
    .map((item: Record<string, unknown>) => {
      const kind = String(item.kind ?? "task");
      const title = String(item.title ?? item.text ?? "").trim();
      if (!title) return null;
      if (kind !== "task" && kind !== "follow_up" && kind !== "meeting") return null;
      return { kind, title, due: item.due ? String(item.due).slice(0, 10) : null } satisfies FollowUpItem;
    })
    .filter(Boolean) as FollowUpItem[];

  if (items.length === 0) {
    return NextResponse.json({ error: "Sélectionnez au moins une action." }, { status: 400 });
  }

  const scoped = parseScopeInput({
    project_id: prospect.project_id,
    scope: prospect.project_id ? "project" : "personal",
  });

  let created = 0;
  const followUpDates: string[] = [];

  for (const item of items) {
    if (item.kind === "follow_up" && item.due) followUpDates.push(item.due);

    if (item.kind === "meeting") {
      const start = item.due ? new Date(`${item.due}T10:00:00`) : addHours(new Date(), 24);
      const { error } = await supabase.from("calendar_events").insert({
        user_id: user.id,
        title: item.title,
        category: "appointment",
        start_at: start.toISOString(),
        end_at: addHours(start, 1).toISOString(),
        all_day: false,
        description: `Issu du compte-rendu « ${meetingRow.title} »`,
        color: "#d97732",
        source: "prospect_meeting",
        source_id: meetingId,
        project_id: scoped.project_id,
        scope: scoped.scope,
      });
      if (!error) created += 1;
      continue;
    }

    const { error } = await supabase.from("daily_tasks").insert({
      user_id: user.id,
      title: item.title,
      due_date: item.due || new Date().toISOString().slice(0, 10),
      prospect_id: id,
      project_id: scoped.project_id,
      scope: scoped.scope,
      task_kind: "custom",
      notes: `Issu du compte-rendu « ${meetingRow.title} »`,
    });
    if (!error) created += 1;
  }

  const nextFollowUp =
    followUpDates.sort()[0] ??
    (prospect.next_follow_up ? String(prospect.next_follow_up).slice(0, 10) : null);

  if (followUpDates.length > 0) {
    await supabase
      .from("prospects")
      .update({
        next_follow_up: nextFollowUp,
        next_action: items.find((i) => i.kind === "follow_up")?.title ?? prospect.next_action,
      })
      .eq("id", id);

    await syncProspectFollowUpTask(supabase, {
      userId: user.id,
      prospectId: id,
      clubName: prospect.club_name,
      status: prospect.status,
      nextFollowUp,
    });
  }

  await supabase
    .from("prospect_meetings")
    .update({ actions_created_count: Number(meetingRow.actions_created_count ?? 0) + created })
    .eq("id", meetingId);

  await logWorkspaceEvent(supabase, user.id, {
    event_type: "meeting_follow_ups",
    title: `${created} action(s) depuis « ${meetingRow.title} »`,
    project_id: prospect.project_id,
    entity_type: "prospect",
    entity_id: id,
  });

  const { data: refreshed } = await supabase
    .from("prospect_meetings")
    .select("*")
    .eq("id", meetingId)
    .maybeSingle();

  return NextResponse.json({
    created,
    meeting: refreshed ? parseMeetingRow(refreshed as Record<string, unknown>) : null,
  });
}
