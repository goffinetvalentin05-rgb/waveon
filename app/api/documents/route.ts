import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { logWorkspaceEvent } from "@/lib/workspace/events";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase } = auth;
  const projectId = new URL(request.url).searchParams.get("project");
  if (!projectId) {
    return NextResponse.json({ error: "project requis" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("project_documents")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const body = await request.json();
  const projectId = String(body.project_id ?? "").trim();
  const title = String(body.title ?? "").trim();
  if (!projectId) return NextResponse.json({ error: "project_id requis" }, { status: 400 });
  if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });

  const { data, error } = await supabase
    .from("project_documents")
    .insert({
      user_id: user.id,
      project_id: projectId,
      title,
      url: String(body.url ?? "").trim() || null,
      notes: String(body.notes ?? "").trim() || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logWorkspaceEvent(supabase, user.id, {
    event_type: "document_created",
    title: `Document : ${title}`,
    project_id: projectId,
    entity_type: "document",
    entity_id: data.id,
  });

  return NextResponse.json({ document: data }, { status: 201 });
}
