import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { actionTypeFromChannel } from "@/lib/crm/types";
import { logWorkspaceEvent } from "@/lib/workspace/events";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const body = await request.json();

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
  const channel = String(body.channel ?? "").trim() || null;
  const actionType = actionTypeFromChannel(channel);
  const title = channel || "Interaction";

  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, club_name, project_id")
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

  const lastAction = description || channel || "Interaction";
  const patch: Record<string, unknown> = {
    last_action: lastAction,
    last_action_at: occurredAt,
  };
  if (channel) patch.contact_channel = channel;

  await supabase.from("prospects").update(patch).eq("id", id).eq("user_id", user.id);

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
