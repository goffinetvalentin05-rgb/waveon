import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { isProspectStatus, type ProspectStatus } from "@/lib/crm/types";
import { isClosedProspectStatus, parseClosedReason } from "@/lib/crm/closed";
import { defaultNextActionFor } from "@/lib/crm/next-action";
import { encodeStatusChangeDescription, migrateProspectStatus } from "@/lib/crm/status";
import { normalizeProspectFromDb } from "@/lib/crm/prospect-payload";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const body = await request.json();
  const nextStatus = migrateProspectStatus(String(body.status ?? ""));

  if (!isProspectStatus(nextStatus)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const closedReason = nextStatus === "Fermé" ? parseClosedReason(body.closed_reason) : null;
  const closedNote =
    nextStatus === "Fermé" && closedReason === "Autre"
      ? String(body.closed_note ?? "").trim() || null
      : null;

  if (nextStatus === "Fermé" && !closedReason) {
    return NextResponse.json({ error: "Indiquez pourquoi ce prospect est fermé." }, { status: 400 });
  }

  const { data: prospect, error } = await supabase
    .from("prospects")
    .select("id, club_name, status, next_action, next_follow_up")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const fromStatus = prospect.status as ProspectStatus;
  const nextAction =
    typeof body.next_action === "string"
      ? body.next_action.trim() || null
      : isClosedProspectStatus(nextStatus)
        ? null
        : nextStatus === "Relais"
          ? defaultNextActionFor("Relais")
          : prospect.next_action || defaultNextActionFor(nextStatus);
  const nextFollowUp =
    "next_follow_up" in body
      ? (body.next_follow_up ? String(body.next_follow_up).slice(0, 10) : null)
      : isClosedProspectStatus(nextStatus)
        ? null
        : prospect.next_follow_up;

  await supabase
    .from("prospects")
    .update({
      status: nextStatus,
      next_action: nextAction,
      next_follow_up: nextFollowUp,
      last_action: `Statut : ${nextStatus}`,
      last_action_at: new Date().toISOString(),
      closed_reason: closedReason,
      closed_note: closedNote,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  await supabase.from("prospect_activities").insert({
    user_id: user.id,
    prospect_id: id,
    action_type: "status_change",
    title: `Statut modifié : ${fromStatus} → ${nextStatus}`,
    description: encodeStatusChangeDescription({
      to: nextStatus,
      from: fromStatus,
      closed_reason: closedReason,
      closed_note: closedNote,
    }),
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
      prospect: updated ? normalizeProspectFromDb(updated as Record<string, unknown>) : updated,
      activities: activities ?? [],
    },
    { status: 200 }
  );
}
