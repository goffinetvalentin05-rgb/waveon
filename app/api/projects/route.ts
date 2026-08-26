import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { logWorkspaceEvent } from "@/lib/workspace/events";
import { DEFAULT_PROJECT_COLOR } from "@/lib/projects/logo";
import { fetchProjects, replaceProjectModules } from "@/lib/projects/server";
import { generateJoinCode } from "@/lib/projects/join-code";
import { normalizeModules, PROJECT_TEMPLATES, type ProjectTemplateId } from "@/lib/projects/modules";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const projects = await fetchProjects(supabase, user.id, true);
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  const color = DEFAULT_PROJECT_COLOR;
  const logoUrl =
    typeof body.logo_url === "string" && body.logo_url.trim() ? body.logo_url.trim() : null;

  const templateId = body.template as ProjectTemplateId | undefined;
  const template = PROJECT_TEMPLATES.find((t) => t.id === templateId);
  const modules = normalizeModules(body.modules ?? template?.modules);

  const row = {
    user_id: user.id,
    name,
    description: String(body.description ?? "").trim() || null,
    icon: String(body.icon ?? "").trim() || null,
    logo_url: logoUrl,
    color,
    status: body.status === "archived" ? "archived" : "active",
    join_code: generateJoinCode(name),
  };
  let { data, error } = await supabase.from("projects").insert(row).select("*").single();
  if (error && /logo_url/i.test(error.message)) {
    const { logo_url: logo, ...withoutLogo } = row;
    const retry = await supabase
      .from("projects")
      .insert({ ...withoutLogo, icon: logo || withoutLogo.icon })
      .select("*")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) return NextResponse.json({ error: error?.message ?? "Erreur" }, { status: 500 });

  const enabledModules = await replaceProjectModules(supabase, user.id, data.id, modules);

  await supabase.from("project_members").upsert(
    {
      project_id: data.id,
      user_id: user.id,
      role: "owner",
      email: user.email ?? null,
      display_name:
        (user.user_metadata?.full_name as string | undefined)?.trim() ||
        user.email?.split("@")[0] ||
        "Owner",
      created_by: user.id,
    },
    { onConflict: "project_id,user_id" }
  );

  await logWorkspaceEvent(supabase, user.id, {
    event_type: "project_created",
    title: `Projet créé : ${name}`,
    project_id: data.id,
    entity_type: "project",
    entity_id: data.id,
  });

  return NextResponse.json({ project: { ...data, enabledModules } }, { status: 201 });
}
