import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { createAdminSupabaseClient, getSupabaseServiceRoleKey } from "@/lib/supabase/admin";
import { normalizeJoinCode } from "@/lib/projects/join-code";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { user } = auth;
  const body = await request.json();
  const code = normalizeJoinCode(String(body.code ?? ""));
  if (!code) return NextResponse.json({ error: "Code requis" }, { status: 400 });

  if (!getSupabaseServiceRoleKey()) {
    return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
  }

  const admin = createAdminSupabaseClient();
  const { data: project, error } = await admin
    .from("projects")
    .select("id, name, status")
    .eq("join_code", code)
    .maybeSingle();

  if (error || !project) {
    return NextResponse.json({ error: "Code invalide" }, { status: 404 });
  }
  if (project.status === "archived") {
    return NextResponse.json({ error: "Ce projet n'accepte plus de membres." }, { status: 410 });
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Membre";

  const { error: memberError } = await admin.from("project_members").insert({
    project_id: project.id,
    user_id: user.id,
    role: "member",
    email: user.email ?? null,
    display_name: displayName,
    created_by: user.id,
  });

  if (memberError && !memberError.message.toLowerCase().includes("duplicate")) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, projectId: project.id, name: project.name });
}
