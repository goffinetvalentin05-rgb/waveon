import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { requireProjectPermission } from "@/lib/projects/access";
import { listProjectMembers, memberLabel } from "@/lib/projects/assignee";

type Params = { params: Promise<{ id: string }> };

/** GET /api/projects/[id]/members — membres du projet (pour assignation / filtres). */
export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const access = await requireProjectPermission(supabase, id, user.id, "members.view");
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const members = await listProjectMembers(supabase, id);
  return NextResponse.json({
    members: members.map((m) => ({
      user_id: m.user_id,
      role: m.role,
      email: m.email,
      display_name: m.display_name,
      name: memberLabel(m),
    })),
    currentUserId: user.id,
  });
}
