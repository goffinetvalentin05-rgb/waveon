import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { recomputeProspectDerivatives } from "@/lib/crm/recompute-prospect";

type Params = { params: Promise<{ id: string }> };

const PROTECTED_ACTION_TYPES = new Set(["created", "imported"]);

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
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1);

  if (!latest?.length || PROTECTED_ACTION_TYPES.has(String(latest[0].action_type))) {
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
