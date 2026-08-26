import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireUser } from "@/lib/crm/server";
import { requireProjectPermission } from "@/lib/projects/access";
import { isInvitableRole, PROJECT_ROLE_LABELS } from "@/lib/access/roles";
import { getAppBaseUrl } from "@/lib/brand/config";
import { sendProjectInviteEmail } from "@/lib/projects/invite-email";

type Params = { params: Promise<{ id: string }> };

function inviterName(user: { email?: string | null; user_metadata?: Record<string, unknown> }) {
  return (
    (user.user_metadata?.full_name as string | undefined)?.trim() ||
    user.email?.split("@")[0] ||
    "Un membre"
  );
}

function inviteUrl(token: string) {
  return `${getAppBaseUrl()}/invite/${token}`;
}

function newToken() {
  return randomBytes(24).toString("base64url");
}

function expiresInSevenDays() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const access = await requireProjectPermission(supabase, id, user.id, "members.view");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data, error } = await supabase
    .from("project_invitations")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ invitations: [] });
  return NextResponse.json({ invitations: data ?? [] });
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const access = await requireProjectPermission(supabase, id, user.id, "members.invite");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json();
  const role = body.role;
  if (!isInvitableRole(role)) {
    return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
  }
  const email =
    typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null;
  const token = newToken();
  const expiresAt = expiresInSevenDays();
  const name = inviterName(user);

  const { data: project } = await supabase.from("projects").select("name").eq("id", id).maybeSingle();

  const payload = {
    project_id: id,
    email,
    token,
    role,
    created_by: user.id,
    inviter_name: name,
    expires_at: expiresAt,
  };
  let { data, error } = await supabase.from("project_invitations").insert(payload).select("*").single();
  if (error && /inviter_name/i.test(error.message)) {
    const { inviter_name: _ignored, ...withoutName } = payload;
    void _ignored;
    const retry = await supabase.from("project_invitations").insert(withoutName).select("*").single();
    data = retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const url = inviteUrl(token);
  let emailSent = false;
  if (email) {
    const sent = await sendProjectInviteEmail({
      to: email,
      projectName: project?.name ?? "un projet",
      inviterName: name,
      roleLabel: PROJECT_ROLE_LABELS[role],
      url,
      expiresAt,
    });
    emailSent = sent.sent;
  }

  return NextResponse.json({
    invitation: data,
    url,
    emailSent,
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const access = await requireProjectPermission(supabase, id, user.id, "members.invite");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json();
  const inviteId = String(body.id ?? "");
  if (!inviteId) return NextResponse.json({ error: "Invitation requise" }, { status: 400 });

  if (body.revoke) {
    const { error } = await supabase
      .from("project_invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", inviteId)
      .eq("project_id", id)
      .is("accepted_at", null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.resend) {
    const { data: existing } = await supabase
      .from("project_invitations")
      .select("*")
      .eq("id", inviteId)
      .eq("project_id", id)
      .maybeSingle();
    if (!existing || existing.accepted_at || existing.revoked_at) {
      return NextResponse.json({ error: "Invitation inactive" }, { status: 400 });
    }
    const token = newToken();
    const expiresAt = expiresInSevenDays();
    const { data, error } = await supabase
      .from("project_invitations")
      .update({ token, expires_at: expiresAt, inviter_name: inviterName(user) })
      .eq("id", inviteId)
      .select("*")
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: error?.message ?? "Erreur" }, { status: 500 });

    const { data: project } = await supabase.from("projects").select("name").eq("id", id).maybeSingle();
    const url = inviteUrl(token);
    let emailSent = false;
    const resentRole = data.role;
    if (data.email && isInvitableRole(resentRole)) {
      const sent = await sendProjectInviteEmail({
        to: data.email,
        projectName: project?.name ?? "un projet",
        inviterName: inviterName(user),
        roleLabel: PROJECT_ROLE_LABELS[resentRole],
        url,
        expiresAt,
      });
      emailSent = sent.sent;
    }
    return NextResponse.json({ ok: true, invitation: data, url, emailSent });
  }

  return NextResponse.json({ ok: true });
}
