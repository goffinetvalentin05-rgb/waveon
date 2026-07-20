import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { fetchProspectFilterOptions } from "@/lib/crm/prospect-query";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const url = new URL(request.url);
  const clientsOnly = url.searchParams.get("clients") === "1";

  try {
    const options = await fetchProspectFilterOptions(supabase, user.id, clientsOnly);
    return NextResponse.json(options);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
