import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { countProspectWork } from "@/lib/crm/counters";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const url = new URL(request.url);
  const projectId = url.searchParams.get("project")?.trim() ?? "";

  let query = supabase
    .from("prospects")
    .select("status, next_follow_up")
    .eq("user_id", user.id)
    .is("archived_at", null);

  if (projectId === "unassigned") {
    query = query.is("project_id", null);
  } else if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query.limit(8000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10);
  return NextResponse.json({ counts: countProspectWork(data ?? [], today), today });
}
