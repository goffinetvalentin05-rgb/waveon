import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import type { ProspectStatus } from "@/lib/crm/types";
import { PROSPECT_STATUSES } from "@/lib/crm/types";
import { recomputeProspectDerivatives } from "@/lib/crm/recompute-prospect";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const body = await request.json();
  const nextStatus = body.status as ProspectStatus;

  if (!PROSPECT_STATUSES.includes(nextStatus)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const { data: prospect, error } = await supabase
    .from("prospects")
    .select("id, club_name, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const fromStatus = prospect.status as ProspectStatus;

  await supabase.from("prospect_activities").insert({
    user_id: user.id,
    prospect_id: id,
    action_type: "status_change",
    title: `Statut modifié de ${fromStatus} à ${nextStatus}`,
    description: nextStatus,
  });

  const recomputed = await recomputeProspectDerivatives(supabase, user.id, id);
  return NextResponse.json(
    {
      prospect: recomputed.prospect,
      activities: recomputed.activities,
    },
    { status: 200 }
  );
}

