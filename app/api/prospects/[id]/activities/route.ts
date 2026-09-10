import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { dateOnly } from "@/lib/crm/date-only";
import {
  applyInteraction,
  isInteractionKind,
  normalizeInteractionChannel,
} from "@/lib/crm/interactions";
import { defaultNextActionFor } from "@/lib/crm/next-action";
import { actionTypeFromChannel } from "@/lib/crm/types";
import { migrateProspectStatus } from "@/lib/crm/status";
import { syncProspectFollowUpTask } from "@/lib/crm/sync-follow-up-task";
import { logWorkspaceEvent } from "@/lib/workspace/events";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const body = await request.json();

  const description = String(body.description ?? "").trim() || null;
  const occurred = String(body.occurred_at ?? "").slice(0, 10) || dateOnly(new Date());
  const actorName =
    String(body.actor_name ?? "").trim() ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    null;
  const channelRaw = String(body.channel ?? "").trim() || null;
  const kindRaw = String(body.interaction_type ?? "").trim();
  const channel = normalizeInteractionChannel(channelRaw) ?? normalizeInteractionChannel(String(body.action_type ?? ""));
  const kind = isInteractionKind(kindRaw) ? kindRaw : "other";

  const { data: prospect } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const currentStatus = migrateProspectStatus(String(prospect.status ?? "À contacter"));

  if (channel) {
    const nextFollowUpAfter = body.next_follow_up ? String(body.next_follow_up).slice(0, 10) : null;
    const result = applyInteraction({
      currentStatus,
      nextFollowUp: prospect.next_follow_up ? String(prospect.next_follow_up).slice(0, 10) : null,
      channel,
      kind,
      occurredOn: occurred,
      description,
      nextFollowUpAfter,
    });

    const { data, error } = await supabase
      .from("prospect_activities")
      .insert({
        user_id: user.id,
        prospect_id: id,
        action_type: result.actionType,
        interaction_type: kind,
        title: result.title,
        description: result.description,
        occurred_at: `${occurred}T12:00:00.000Z`,
        actor_name: actorName,
        channel: result.channelLabel,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await supabase
      .from("prospects")
      .update({
        status: result.status,
        last_action: result.lastAction,
        last_action_at: result.lastActionAt,
        contact_channel: result.contactChannel,
        next_follow_up: result.nextFollowUp,
        next_action:
          result.status !== currentStatus ? defaultNextActionFor(result.status) : prospect.next_action,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    await supabase
      .from("daily_tasks")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("prospect_id", id)
      .eq("user_id", user.id)
      .eq("completed", false)
      .in("task_kind", ["follow_up", "first_contact"]);

    await syncProspectFollowUpTask(supabase, {
      userId: user.id,
      prospectId: id,
      clubName: prospect.club_name,
      status: result.status,
      nextFollowUp: result.nextFollowUp,
    });

    await logWorkspaceEvent(supabase, user.id, {
      event_type: "interaction",
      title: `${result.title} — ${prospect.club_name}`,
      project_id: prospect.project_id,
      entity_type: "prospect",
      entity_id: id,
    });

    const { data: updated } = await supabase
      .from("prospects")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: activities } = await supabase
      .from("prospect_activities")
      .select("*")
      .eq("prospect_id", id)
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false });

    return NextResponse.json(
      { activity: data, activities: activities ?? [], prospect: updated },
      { status: 201 }
    );
  }

  const actionType = actionTypeFromChannel(channelRaw);
  const title = channelRaw || "Interaction";

  const { data, error } = await supabase
    .from("prospect_activities")
    .insert({
      user_id: user.id,
      prospect_id: id,
      action_type: actionType,
      title,
      description,
      occurred_at: `${occurred}T12:00:00.000Z`,
      actor_name: actorName,
      channel: channelRaw,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("prospects")
    .update({
      last_action: description || channelRaw || "Interaction",
      last_action_at: `${occurred}T12:00:00.000Z`,
      next_follow_up: null,
      ...(channelRaw ? { contact_channel: channelRaw } : {}),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  await logWorkspaceEvent(supabase, user.id, {
    event_type: "interaction",
    title: `${title} — ${prospect.club_name}`,
    project_id: prospect.project_id,
    entity_type: "prospect",
    entity_id: id,
  });

  const { data: updated } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: activities } = await supabase
    .from("prospect_activities")
    .select("*")
    .eq("prospect_id", id)
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });

  return NextResponse.json(
    {
      activity: data,
      activities: activities ?? [],
      prospect: updated,
    },
    { status: 201 }
  );
}
