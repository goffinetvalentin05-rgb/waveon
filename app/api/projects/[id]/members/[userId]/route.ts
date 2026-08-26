import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { requireProjectPermission } from "@/lib/projects/access";
import { canLeaveProject, canManageMember } from "@/lib/access/permissions";
import { isProjectRole, type ProjectRole } from "@/lib/access/roles";

type Params = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id, userId } = await params;
  const access = await requireProjectPermission(supabase, id, user.id, "members.manage_roles");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json();
  const nextRole = body.role as string;
  if (!isProjectRole(nextRole) || nextRole === "owner") {
    return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
  }

  const { data: target } = await supabase
    .from("project_members")
    .select("user_id, role")
    .eq("project_id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
  if (!isProjectRole(target.role) || !canManageMember(access.role, target.role)) {
    return NextResponse.json({ error: "Impossible de modifier ce membre." }, { status: 403 });
  }

  const { error } = await supabase
    .from("project_members")
    .update({ role: nextRole })
    .eq("project_id", id)
    .eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, role: nextRole });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id, userId } = await params;

  const access = await requireProjectPermission(supabase, id, user.id, "project.view");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const leavingSelf = userId === user.id;
  if (leavingSelf) {
    if (!canLeaveProject(access.role)) {
      return NextResponse.json(
        { error: "L'owner ne peut pas quitter le projet. Transférez-le ou supprimez-le." },
        { status: 403 }
      );
    }
  } else if (!canManageMember(access.role, "member")) {
    return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
  }

  const { data: target } = await supabase
    .from("project_members")
    .select("user_id, role")
    .eq("project_id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "Membre introuvable" }, { status: 404 });
  const targetRole = target.role as ProjectRole;
  if (!leavingSelf && !canManageMember(access.role, targetRole)) {
    return NextResponse.json({ error: "Impossible de retirer ce membre." }, { status: 403 });
  }

  const { error } = await supabase.from("project_members").delete().eq("project_id", id).eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
