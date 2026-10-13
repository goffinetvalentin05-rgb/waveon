import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { countProspectWork } from "@/lib/crm/counters";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const url = new URL(request.url);
  const projectId = url.searchParams.get("project")?.trim() ?? "";
  const assigned = url.searchParams.get("assigned")?.trim() ?? "";

  let query = supabase
    .from("prospects")
    .select("status, next_follow_up")
    .is("archived_at", null);

  if (projectId === "unassigned") {
    query = query.is("project_id", null).eq("user_id", user.id);
  } else if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    query = query.eq("user_id", user.id);
  }

  if (assigned === "me") {
    query = query.eq("assigned_user_id", user.id);
  } else if (assigned === "unassigned") {
    query = query.is("assigned_user_id", null);
  } else if (assigned) {
    query = query.eq("assigned_user_id", assigned);
  }

  const { data, error } = await query.limit(8000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10);
  return NextResponse.json({ counts: countProspectWork(data ?? [], today), today });
}
