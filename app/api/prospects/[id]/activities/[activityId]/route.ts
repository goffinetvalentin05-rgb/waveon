import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { recomputeProspectDerivatives } from "@/lib/crm/recompute-prospect";
import { nullIfEmpty } from "@/lib/crm/prospect-payload";

type Params = { params: Promise<{ id: string; activityId: string }> };

const EDITABLE_ACTION_TYPES = new Set([
  "mail_sent",
  "call_made",
  "demo_scheduled",
  "client",
  "refus",
  "status_change",
]);

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id, activityId } = await params;

  await supabase
    .from("prospect_activities")
    .delete()
    .eq("id", activityId)
    .eq("prospect_id", id)
    .eq("user_id", user.id);

  const recomputed = await recomputeProspectDerivatives(supabase, user.id, id);
  return NextResponse.json(
    { prospect: recomputed.prospect, activities: recomputed.activities },
    { status: 200 }
  );
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id, activityId } = await params;

  const body = await request.json();

  const nextActionType = String(body.action_type ?? "");
  if (!EDITABLE_ACTION_TYPES.has(nextActionType)) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  const actionDate = String(body.action_date ?? "");
  if (!actionDate) {
    return NextResponse.json({ error: "action_date requis" }, { status: 400 });
  }

  // Date (YYYY-MM-DD) => on fixe à midi UTC pour éviter les décalages.
  const createdAtIso = new Date(`${actionDate}T12:00:00.000Z`).toISOString();

  let description: string | null = null;
  if (nextActionType === "demo_scheduled") {
    const demoDate = String(body.demo_at ?? "");
    const demoAtIso = demoDate
      ? new Date(`${demoDate}T12:00:00.000Z`).toISOString()
      : createdAtIso;
    description = JSON.stringify({
      demoAt: demoAtIso,
      note: nullIfEmpty(body.note),
    });
  } else if (nextActionType === "status_change") {
    const toStatus = String(body.to_status ?? body.status ?? body.note ?? "").trim();
    description = toStatus
      ? JSON.stringify({
          to: toStatus,
          closed_reason: body.closed_reason ?? null,
          closed_note: body.closed_note ?? null,
        })
      : null;
  } else {
    description = nullIfEmpty(body.note);
  }

  await supabase
    .from("prospect_activities")
    .update({
      action_type: nextActionType,
      created_at: createdAtIso,
      description,
    })
    .eq("id", activityId)
    .eq("prospect_id", id)
    .eq("user_id", user.id);

  const recomputed = await recomputeProspectDerivatives(supabase, user.id, id);
  return NextResponse.json(
    { prospect: recomputed.prospect, activities: recomputed.activities },
    { status: 200 }
  );
}

