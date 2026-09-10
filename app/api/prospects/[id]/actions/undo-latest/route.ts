import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { recomputeProspectDerivatives } from "@/lib/crm/recompute-prospect";
import { isInternalActivityType } from "@/lib/crm/interactions";

type Params = { params: Promise<{ id: string }> };

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
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(20);

  const target = (latest ?? []).find((row) => !isInternalActivityType(String(row.action_type)));

  if (!target) {
    return NextResponse.json({ error: "Aucune action à annuler" }, { status: 400 });
  }

  await supabase
    .from("prospect_activities")
    .delete()
    .eq("id", target.id)
    .eq("prospect_id", id)
    .eq("user_id", user.id);

  const recomputed = await recomputeProspectDerivatives(supabase, user.id, id);
  return NextResponse.json(
    { prospect: recomputed.prospect, activities: recomputed.activities },
    { status: 200 }
  );
}
