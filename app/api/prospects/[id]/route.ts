import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { nullIfEmpty, normalizeProspectFromDb } from "@/lib/crm/prospect-payload";
import { recomputeProspectDerivatives } from "@/lib/crm/recompute-prospect";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const { data: prospect, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { data: activities } = await supabase
    .from("prospect_activities")
    .select("*")
    .eq("prospect_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({
    prospect: normalizeProspectFromDb(prospect as Record<string, unknown>),
    activities: activities ?? [],
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const body = await request.json();

  const allowed = [
    "club_name",
    "sport",
    "canton",
    "ville",
    "contact_name",
    "contact_function",
    "phone",
    "email",
    "website",
    "notes",
  ] as const;

  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      const val = body[key];
      if (typeof val === "string") {
        patch[key] = nullIfEmpty(val);
        if (key === "phone") {
          patch.phone_number = nullIfEmpty(val);
        }
      } else {
        patch[key] = val;
      }
    }
  }

  if ("club_name" in patch && !patch.club_name) {
    return NextResponse.json({ error: "Nom du club requis" }, { status: 400 });
  }

  if (patch.club_name && typeof patch.club_name === "string") {
    patch.name = patch.club_name;
  }

  const { data, error } = await supabase
    .from("prospects")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (body.notes !== undefined && typeof body.notes === "string" && body.notes.trim()) {
    // optional: don't spam history on every note save
  }

  // Mise à jour des données dérivées (tâches du jour, titres d'historique).
  const recomputed = await recomputeProspectDerivatives(supabase, user.id, id);
  return NextResponse.json({
    prospect: normalizeProspectFromDb(recomputed.prospect as Record<string, unknown>),
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const { error } = await supabase
    .from("prospects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
