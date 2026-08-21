import { NextResponse } from "next/server";
import { getOrCreateSettings, requireUser } from "@/lib/crm/server";
import {
  CONTACT_CHANNELS,
  INTERACTION_LABELS,
  INTERACTION_TYPES,
  type InteractionType,
} from "@/lib/crm/types";
import { defaultNextActionFor, suggestedStatusAfterInteraction } from "@/lib/crm/next-action";
import { migrateProspectStatus } from "@/lib/crm/status";
import { logWorkspaceEvent } from "@/lib/workspace/events";
import { addDays, formatISO } from "date-fns";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const body = await request.json();

  const actionType = String(body.action_type ?? "note") as InteractionType;
  if (!INTERACTION_TYPES.includes(actionType)) {
    return NextResponse.json({ error: "Type d'interaction invalide" }, { status: 400 });
  }

  const description = String(body.description ?? "").trim() || null;
  const occurred = String(body.occurred_at ?? "").slice(0, 10);
  const occurredAt = occurred
    ? new Date(`${occurred}T12:00:00.000Z`).toISOString()
    : new Date().toISOString();
  const actorName =
    String(body.actor_name ?? "").trim() ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    null;
  const channelRaw = String(body.channel ?? "").trim();
  const channel = (CONTACT_CHANNELS as readonly string[]).includes(channelRaw) ? channelRaw : channelRaw || null;

  const title = description
    ? `${INTERACTION_LABELS[actionType]} — ${description.slice(0, 80)}`
    : INTERACTION_LABELS[actionType];

  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, club_name, project_id, status, next_action, next_follow_up, contact_channel")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { data, error } = await supabase
    .from("prospect_activities")
    .insert({
      user_id: user.id,
      prospect_id: id,
      action_type: actionType,
      title,
      description,
      occurred_at: occurredAt,
      actor_name: actorName,
      channel,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const currentStatus = migrateProspectStatus(prospect.status);
  const suggested = suggestedStatusAfterInteraction(actionType, currentStatus);
  const applyStatus = body.apply_status !== false;
  const nextStatus = suggested && applyStatus ? suggested : currentStatus;

  const settings = await getOrCreateSettings(supabase, user.id);
  const followDays =
    nextStatus === "Relance 2" || nextStatus === "Relance 3 / dernière relance"
      ? settings.delay_relance_3_days
      : nextStatus === "Relance 1"
        ? settings.delay_relance_2_days
        : settings.delay_relance_1_days;

  const nextAction =
    typeof body.next_action === "string"
      ? body.next_action.trim() || null
      : suggested && applyStatus
        ? defaultNextActionFor(nextStatus)
        : prospect.next_action;
  const nextFollowUp =
    "next_follow_up" in body
      ? (body.next_follow_up ? String(body.next_follow_up).slice(0, 10) : null)
      : suggested && applyStatus
        ? formatISO(addDays(new Date(occurredAt), followDays), { representation: "date" })
        : prospect.next_follow_up;

  const patch: Record<string, unknown> = {
    last_action: title,
    last_action_at: occurredAt,
    next_action: nextAction,
    next_follow_up: nextFollowUp,
  };
  if (channel) patch.contact_channel = channel;
  if (suggested && applyStatus) patch.status = nextStatus;

  await supabase.from("prospects").update(patch).eq("id", id).eq("user_id", user.id);

  await logWorkspaceEvent(supabase, user.id, {
    event_type: "interaction",
    title: `${INTERACTION_LABELS[actionType]} — ${prospect.club_name}`,
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
      suggestedStatus: suggested && suggested !== currentStatus ? suggested : null,
      appliedStatus: Boolean(suggested && applyStatus),
    },
    { status: 201 }
  );
}
