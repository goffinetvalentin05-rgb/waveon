import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { requireProjectPermission } from "@/lib/projects/access";

type Params = { params: Promise<{ id: string }> };

/** GET /api/projects/[id]/discussions/unread — nombre de messages non lus. */
export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const access = await requireProjectPermission(supabase, id, user.id, "records.view");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data: readRow } = await supabase
    .from("project_discussion_reads")
    .select("last_read_at")
    .eq("project_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  let query = supabase
    .from("project_messages")
    .select("id", { count: "exact", head: true })
    .eq("project_id", id)
    .neq("author_id", user.id);

  if (readRow?.last_read_at) {
    query = query.gt("created_at", readRow.last_read_at);
  }

  const { count, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ unread: count ?? 0 });
}

/** POST /api/projects/[id]/discussions/unread — marque la discussion comme lue. */
export async function POST(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const access = await requireProjectPermission(supabase, id, user.id, "records.view");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("project_discussion_reads").upsert(
    {
      project_id: id,
      user_id: user.id,
      last_read_at: now,
    },
    { onConflict: "project_id,user_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, last_read_at: now });
}
