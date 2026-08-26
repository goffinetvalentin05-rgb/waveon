import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireUser } from "@/lib/crm/server";
import { requireProjectPermission } from "@/lib/projects/access";
import { isInvitableRole } from "@/lib/access/roles";
import { getAppBaseUrl } from "@/lib/brand/config";

type Params = { params: Promise<{ id: string }> };

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
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("project_invitations")
    .insert({
      project_id: id,
      email,
      token,
      role,
      created_by: user.id,
      expires_at: expiresAt,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    invitation: data,
    url: `${getAppBaseUrl()}/invite/${token}`,
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
      .eq("project_id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
