import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { recomputeProspectDerivatives } from "@/lib/crm/recompute-prospect";

type Params = { params: Promise<{ id: string }> };

const UNDO_ACTION_TYPES = new Set([
  "mail_sent",
  "call_made",
  "demo_scheduled",
  "client",
  "refus",
  "status_change",
]);

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const { data: latest } = await supabase
    .from("prospect_activities")
    .select("id, action_type")
    .eq("user_id", user.id)
    .eq("prospect_id", id)
    .in("action_type", Array.from(UNDO_ACTION_TYPES))
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1);

  if (!latest?.length) {
    return NextResponse.json({ error: "Aucune action à annuler" }, { status: 400 });
  }

  const activityId = latest[0].id as string;

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

