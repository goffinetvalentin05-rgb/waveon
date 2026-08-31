import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { nullIfEmpty } from "@/lib/crm/prospect-payload";
import { type ProspectContactInput } from "@/lib/crm/contacts";
import { syncPrimaryOntoProspect } from "@/lib/crm/sync-primary-contact";

type Params = { params: Promise<{ id: string }> };

async function loadProspect(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], id: string) {
  const { data } = await supabase.from("prospects").select("id, user_id, project_id").eq("id", id).maybeSingle();
  return data;
}

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase } = auth;
  const { id } = await params;

  const prospect = await loadProspect(supabase, id);
  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { data, error } = await supabase
    .from("prospect_contacts")
    .select("*")
    .eq("prospect_id", id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contacts: data ?? [] });
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const body = (await request.json()) as ProspectContactInput;

  const prospect = await loadProspect(supabase, id);
  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const firstName = String(body.first_name ?? "").trim();
  if (!firstName) {
    return NextResponse.json({ error: "Prénom requis" }, { status: 400 });
  }

  const { count } = await supabase
    .from("prospect_contacts")
    .select("id", { count: "exact", head: true })
    .eq("prospect_id", id);
  const isPrimary = Boolean(body.is_primary) || (count ?? 0) === 0;

  if (isPrimary) {
    await supabase.from("prospect_contacts").update({ is_primary: false }).eq("prospect_id", id);
  }

  const { data, error } = await supabase
    .from("prospect_contacts")
    .insert({
      user_id: user.id,
      prospect_id: id,
      first_name: firstName,
      last_name: nullIfEmpty(body.last_name),
      job_title: nullIfEmpty(body.job_title),
      email: nullIfEmpty(body.email),
      phone: nullIfEmpty(body.phone),
      linkedin_url: nullIfEmpty(body.linkedin_url),
      is_primary: isPrimary,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (isPrimary) await syncPrimaryOntoProspect(supabase, id);

  return NextResponse.json({ contact: data }, { status: 201 });
}
