import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { requireProjectPermission } from "@/lib/projects/access";
import { generateJoinCode } from "@/lib/projects/join-code";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const access = await requireProjectPermission(supabase, id, user.id, "members.invite");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data: project } = await supabase.from("projects").select("name").eq("id", id).maybeSingle();
  let joinCode = generateJoinCode(project?.name ?? "WON");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("projects")
      .update({ join_code: joinCode })
      .eq("id", id)
      .select("join_code")
      .maybeSingle();
    if (!error && data) {
      return NextResponse.json({ join_code: data.join_code });
    }
    joinCode = generateJoinCode(project?.name ?? "WON");
  }

  return NextResponse.json({ error: "Impossible de régénérer le code" }, { status: 500 });
}
