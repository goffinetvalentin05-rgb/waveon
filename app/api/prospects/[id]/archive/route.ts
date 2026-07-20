import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { normalizeProspectFromDb } from "@/lib/crm/prospect-payload";

type Params = { params: Promise<{ id: string }> };

/** POST /api/prospects/[id]/archive — archive ou restaure un prospect. */
export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const archived = body?.archived !== false;

  const { data: existing, error: fetchError } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const alreadyArchived = Boolean(existing.archived_at);
  if (archived && alreadyArchived) {
    return NextResponse.json({
      prospect: normalizeProspectFromDb(existing as Record<string, unknown>),
      message: "Ce prospect est déjà archivé.",
    });
  }
  if (!archived && !alreadyArchived) {
    return NextResponse.json({
      prospect: normalizeProspectFromDb(existing as Record<string, unknown>),
      message: "Ce prospect n’est pas archivé.",
    });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("prospects")
    .update({
      archived_at: archived ? now : null,
      updated_at: now,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (archived) {
    // Retirer les tâches du jour liées (le prospect reste, l'historique aussi)
    await supabase.from("daily_tasks").delete().eq("prospect_id", id).eq("user_id", user.id);
  }

  await supabase.from("prospect_activities").insert({
    user_id: user.id,
    prospect_id: id,
    action_type: archived ? "archived" : "restored",
    title: archived ? "Prospect archivé" : "Prospect restauré",
  });

  const { data: activities } = await supabase
    .from("prospect_activities")
    .select("*")
    .eq("prospect_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    prospect: normalizeProspectFromDb(data as Record<string, unknown>),
    activities: activities ?? [],
    message: archived ? "Le prospect a été archivé." : "Le prospect a été restauré.",
  });
}
