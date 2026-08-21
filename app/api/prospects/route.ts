import { NextResponse } from "next/server";
import { getOrCreateSettings, requireUser } from "@/lib/crm/server";
import {
  buildProspectInsertPayload,
  normalizeProspectFromDb,
} from "@/lib/crm/prospect-payload";
import { fetchProspectList } from "@/lib/crm/prospect-query";
import { parseProspectListParams } from "@/lib/crm/prospect-list-params";
import { logWorkspaceEvent } from "@/lib/workspace/events";
import { enrichProspects } from "@/lib/crm/enrich-prospects";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const url = new URL(request.url);
  const params = parseProspectListParams(url.searchParams);

  const { data, error, count } = await fetchProspectList(supabase, user.id, params);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    prospects: await enrichProspects(supabase, user.id, (data ?? []) as Record<string, unknown>[]),
    total: count ?? 0,
    page: params.page,
    pageSize: params.pageSize,
  });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const body = await request.json();

  try {
    await getOrCreateSettings(supabase, user.id);

    const { data, error } = await supabase
      .from("prospects")
      .insert(buildProspectInsertPayload(user.id, body))
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("prospect_activities").insert({
      user_id: user.id,
      prospect_id: data.id,
      action_type: "created",
      title: "Prospect créé",
    });

    await logWorkspaceEvent(supabase, user.id, {
      event_type: "prospect_created",
      title: `Prospect ajouté : ${data.club_name}`,
      project_id: data.project_id,
      entity_type: "prospect",
      entity_id: data.id,
    });

    return NextResponse.json({ prospect: normalizeProspectFromDb(data) }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Données invalides";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
