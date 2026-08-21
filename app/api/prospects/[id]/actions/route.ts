import { NextResponse } from "next/server";
import { resolveQuickActionAt, QUICK_ACTION_LABELS } from "@/lib/crm/actions";
import type { ProspectStatus, QuickAction } from "@/lib/crm/types";
import { getOrCreateSettings, requireUser, todayISO } from "@/lib/crm/server";
import { defaultNextActionFor } from "@/lib/crm/next-action";

type Params = { params: Promise<{ id: string }> };

const VALID_ACTIONS = new Set<QuickAction>([
  "mail_sent",
  "call_made",
  "demo_scheduled",
  "client",
  "refus",
]);

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const body = await request.json();
  const action = body.action as QuickAction;
  if (!VALID_ACTIONS.has(action)) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  const { data: prospect, error: fetchError } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const settings = await getOrCreateSettings(supabase, user.id);
  const actionDate = new Date();
  const demoAt = action === "demo_scheduled" && body.demo_at ? new Date(body.demo_at) : null;
  const result = resolveQuickActionAt(
    action,
    prospect.status as ProspectStatus,
    settings,
    prospect.club_name,
    actionDate,
    demoAt
  );

  const updatePayload: Record<string, unknown> = {
    status: result.status,
    last_action: result.lastAction,
    last_action_at: new Date().toISOString(),
    next_follow_up: result.nextFollowUp,
    next_action: defaultNextActionFor(result.status),
  };

  if (action === "demo_scheduled") {
    updatePayload.demo_at = body.demo_at || new Date().toISOString();
  }

  const { data: updated, error: updateError } = await supabase
    .from("prospects")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from("prospect_activities").insert({
    user_id: user.id,
    prospect_id: id,
    action_type: action,
    title: result.activityTitle,
    description:
      action === "demo_scheduled"
        ? JSON.stringify({
            demoAt: body.demo_at || updatePayload.demo_at,
            note: body.note?.trim() || null,
          })
        : body.note?.trim() || null,
  });

  // Programmer tâche pour la date de relance
  if (result.taskTitle && result.taskKind && result.nextFollowUp) {
    await supabase.from("daily_tasks").insert({
      user_id: user.id,
      prospect_id: id,
      title: result.taskTitle,
      due_date: result.nextFollowUp,
      task_kind: result.taskKind,
      completed: false,
    });
  }

  // Si client/refus : marquer tâches ouvertes comme terminées
  if (action === "client" || action === "refus") {
    await supabase
      .from("daily_tasks")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("prospect_id", id)
      .eq("user_id", user.id)
      .eq("completed", false);
  }

  return NextResponse.json({
    prospect: updated,
    action: QUICK_ACTION_LABELS[action],
    today: todayISO(),
  });
}
