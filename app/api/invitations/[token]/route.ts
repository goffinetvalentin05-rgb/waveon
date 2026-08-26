import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { createAdminSupabaseClient, getSupabaseServiceRoleKey } from "@/lib/supabase/admin";
import { isInvitableRole } from "@/lib/access/roles";

type Params = { params: Promise<{ token: string }> };

function publicInvite(row: {
  token: string;
  role: string;
  email: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  project: { id: string; name: string; icon: string | null; color: string | null } | null;
}) {
  return {
    token: row.token,
    role: row.role,
    email: row.email,
    expires_at: row.expires_at,
    accepted: Boolean(row.accepted_at),
    revoked: Boolean(row.revoked_at),
    project: row.project,
  };
}

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  if (!getSupabaseServiceRoleKey()) {
    return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
  }
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("project_invitations")
    .select("token, role, email, expires_at, accepted_at, revoked_at, project:projects(id, name, icon, color)")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Invitation introuvable" }, { status: 404 });
  const project = Array.isArray(data.project) ? data.project[0] : data.project;
  return NextResponse.json({ invitation: publicInvite({ ...data, project }) });
}

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { user } = auth;
  const { token } = await params;

  if (!getSupabaseServiceRoleKey()) {
    return NextResponse.json({ error: "Configuration serveur manquante" }, { status: 500 });
  }
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("project_invitations")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: "Invitation introuvable" }, { status: 404 });
  if (data.revoked_at) return NextResponse.json({ error: "Invitation révoquée" }, { status: 410 });
  if (data.accepted_at) return NextResponse.json({ error: "Invitation déjà utilisée" }, { status: 410 });
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Invitation expirée" }, { status: 410 });
  }
  if (data.email && user.email && data.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "Cette invitation est liée à une autre adresse email." },
      { status: 403 }
    );
  }
  if (!isInvitableRole(data.role)) {
    return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Membre";

  const { error: memberError } = await admin.from("project_members").insert({
    project_id: data.project_id,
    user_id: user.id,
    role: data.role,
    email: user.email ?? data.email,
    display_name: displayName,
    created_by: data.created_by,
  });

  if (memberError && !memberError.message.toLowerCase().includes("duplicate")) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  await admin
    .from("project_invitations")
    .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq("id", data.id);

  return NextResponse.json({ ok: true, projectId: data.project_id });
}
