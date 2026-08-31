import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { nullIfEmpty } from "@/lib/crm/prospect-payload";
import { syncPrimaryOntoProspect } from "@/lib/crm/sync-primary-contact";

type Params = { params: Promise<{ id: string; contactId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase } = auth;
  const { id, contactId } = await params;
  const body = await request.json();

  const { data: existing } = await supabase
    .from("prospect_contacts")
    .select("*")
    .eq("id", contactId)
    .eq("prospect_id", id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("first_name" in body) {
    const first = String(body.first_name ?? "").trim();
    if (!first) return NextResponse.json({ error: "Prénom requis" }, { status: 400 });
    patch.first_name = first;
  }
  if ("last_name" in body) patch.last_name = nullIfEmpty(body.last_name);
  if ("job_title" in body) patch.job_title = nullIfEmpty(body.job_title);
  if ("email" in body) patch.email = nullIfEmpty(body.email);
  if ("phone" in body) patch.phone = nullIfEmpty(body.phone);
  if ("linkedin_url" in body) patch.linkedin_url = nullIfEmpty(body.linkedin_url);

  const makePrimary = body.is_primary === true;
  if (makePrimary) {
    await supabase.from("prospect_contacts").update({ is_primary: false }).eq("prospect_id", id);
    patch.is_primary = true;
  } else if (body.is_primary === false && existing.is_primary) {
    return NextResponse.json({ error: "Désignez un autre contact principal." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("prospect_contacts")
    .update(patch)
    .eq("id", contactId)
    .eq("prospect_id", id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await syncPrimaryOntoProspect(supabase, id);
  return NextResponse.json({ contact: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase } = auth;
  const { id, contactId } = await params;

  const { data: existing } = await supabase
    .from("prospect_contacts")
    .select("id, is_primary")
    .eq("id", contactId)
    .eq("prospect_id", id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { error } = await supabase.from("prospect_contacts").delete().eq("id", contactId).eq("prospect_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (existing.is_primary) {
    const { data: next } = await supabase
      .from("prospect_contacts")
      .select("id")
      .eq("prospect_id", id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) {
      await supabase.from("prospect_contacts").update({ is_primary: true }).eq("id", next.id);
    }
    await syncPrimaryOntoProspect(supabase, id);
  }

  return NextResponse.json({ ok: true });
}
