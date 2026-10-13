import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { requireProjectPermission } from "@/lib/projects/access";
import { listProjectMembers, memberLabel } from "@/lib/projects/assignee";
import type { ProjectMessage } from "@/lib/discussions/types";

type Params = { params: Promise<{ id: string }> };

const PAGE_SIZE = 100;

function mapMessages(
  rows: {
    id: string;
    project_id: string;
    author_id: string;
    body: string;
    client_id: string | null;
    created_at: string;
  }[],
  nameByUser: Map<string, string>
): ProjectMessage[] {
  return rows.map((row) => ({
    id: row.id,
    project_id: row.project_id,
    author_id: row.author_id,
    body: row.body,
    client_id: row.client_id,
    created_at: row.created_at,
    author_name: nameByUser.get(row.author_id) ?? "Membre",
  }));
}

/** GET /api/projects/[id]/discussions — historique des messages. */
export async function GET(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const access = await requireProjectPermission(supabase, id, user.id, "records.view");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const url = new URL(request.url);
  const before = url.searchParams.get("before")?.trim() || null;
  const limit = Math.min(
    PAGE_SIZE,
    Math.max(1, Number(url.searchParams.get("limit") ?? PAGE_SIZE) || PAGE_SIZE)
  );

  let query = supabase
    .from("project_messages")
    .select("id, project_id, author_id, body, client_id, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const members = await listProjectMembers(supabase, id);
  const nameByUser = new Map(members.map((m) => [m.user_id, memberLabel(m)]));
  const chronological = mapMessages([...(data ?? [])].reverse(), nameByUser);

  return NextResponse.json({
    messages: chronological,
    currentUserId: user.id,
  });
}

/** POST /api/projects/[id]/discussions — envoie un message. */
export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const access = await requireProjectPermission(supabase, id, user.id, "records.comment");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: { body?: unknown; client_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "Message vide" }, { status: 400 });
  }
  if (text.length > 8000) {
    return NextResponse.json({ error: "Message trop long" }, { status: 400 });
  }

  const clientId =
    typeof body.client_id === "string" && body.client_id.trim()
      ? body.client_id.trim()
      : null;

  if (clientId) {
    const { data: existing } = await supabase
      .from("project_messages")
      .select("id, project_id, author_id, body, client_id, created_at")
      .eq("project_id", id)
      .eq("client_id", clientId)
      .maybeSingle();

    if (existing) {
      const members = await listProjectMembers(supabase, id);
      const nameByUser = new Map(members.map((m) => [m.user_id, memberLabel(m)]));
      return NextResponse.json({
        message: mapMessages([existing], nameByUser)[0],
        deduped: true,
      });
    }
  }

  const { data, error } = await supabase
    .from("project_messages")
    .insert({
      project_id: id,
      author_id: user.id,
      body: text,
      client_id: clientId,
    })
    .select("id, project_id, author_id, body, client_id, created_at")
    .single();

  if (error) {
    if (error.code === "23505" && clientId) {
      const { data: existing } = await supabase
        .from("project_messages")
        .select("id, project_id, author_id, body, client_id, created_at")
        .eq("project_id", id)
        .eq("client_id", clientId)
        .maybeSingle();
      if (existing) {
        const members = await listProjectMembers(supabase, id);
        const nameByUser = new Map(members.map((m) => [m.user_id, memberLabel(m)]));
        return NextResponse.json({
          message: mapMessages([existing], nameByUser)[0],
          deduped: true,
        });
      }
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const members = await listProjectMembers(supabase, id);
  const nameByUser = new Map(members.map((m) => [m.user_id, memberLabel(m)]));

  return NextResponse.json(
    { message: mapMessages([data], nameByUser)[0], deduped: false },
    { status: 201 }
  );
}
