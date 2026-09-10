import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { dateOnly } from "@/lib/crm/date-only";
import {
  applyInteraction,
  isInteractionChannel,
  isInteractionKind,
} from "@/lib/crm/interactions";
import { defaultNextActionFor } from "@/lib/crm/next-action";
import { normalizeProspectFromDb } from "@/lib/crm/prospect-payload";
import { migrateProspectStatus } from "@/lib/crm/status";
import { syncProspectFollowUpTask } from "@/lib/crm/sync-follow-up-task";
import { logWorkspaceEvent } from "@/lib/workspace/events";
import type { ProspectStatus } from "@/lib/crm/types";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const body = await request.json();

  const channelRaw = String(body.channel ?? "").trim().toLowerCase();
  const kindRaw = String(body.interaction_type ?? body.kind ?? "").trim();
  if (!isInteractionChannel(channelRaw)) {
    return NextResponse.json({ error: "Canal invalide." }, { status: 400 });
  }
  if (!isInteractionKind(kindRaw)) {
    return NextResponse.json({ error: "Type d'interaction invalide." }, { status: 400 });
  }

  const occurred = String(body.occurred_at ?? body.date ?? "").slice(0, 10) || dateOnly(new Date());
  const description = String(body.description ?? "").trim() || null;
  const nextFollowUpAfter = body.next_follow_up
    ? String(body.next_follow_up).slice(0, 10)
    : null;

  const { data: prospect, error: fetchError } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const currentStatus = migrateProspectStatus(String(prospect.status ?? "À contacter"));
  const result = applyInteraction({
    currentStatus,
    nextFollowUp: prospect.next_follow_up ? String(prospect.next_follow_up).slice(0, 10) : null,
    channel: channelRaw,
    kind: kindRaw,
    occurredOn: occurred,
    description,
    nextFollowUpAfter,
  });

  const actorName =
    String(body.actor_name ?? "").trim() ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    null;

  const { data: activity, error: insertError } = await supabase
    .from("prospect_activities")
    .insert({
      user_id: user.id,
      prospect_id: id,
      action_type: result.actionType,
      interaction_type: kindRaw,
      title: result.title,
      description: result.description,
      occurred_at: `${occurred}T12:00:00.000Z`,
      actor_name: actorName,
      channel: result.channelLabel,
    })
    .select("*")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const nextAction =
    result.status !== currentStatus
      ? defaultNextActionFor(result.status as ProspectStatus)
      : prospect.next_action;

  const { data: updated, error: updateError } = await supabase
    .from("prospects")
    .update({
      status: result.status,
      last_action: result.lastAction,
      last_action_at: result.lastActionAt,
      contact_channel: result.contactChannel,
      next_follow_up: result.nextFollowUp,
      next_action: nextAction,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

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

  const { data: activities } = await supabase
    .from("prospect_activities")
    .select("*")
    .eq("prospect_id", id)
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });

  return NextResponse.json(
    {
      activity,
      activities: activities ?? [],
      prospect: updated ? normalizeProspectFromDb(updated as Record<string, unknown>) : updated,
    },
    { status: 201 }
  );
}
