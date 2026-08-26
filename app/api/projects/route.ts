import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { logWorkspaceEvent } from "@/lib/workspace/events";
import { PROJECT_COLORS } from "@/lib/projects/types";
import { fetchProjects, replaceProjectModules } from "@/lib/projects/server";
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

  const color =
    typeof body.color === "string" && body.color
      ? body.color
      : PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];

  const templateId = body.template as ProjectTemplateId | undefined;
  const template = PROJECT_TEMPLATES.find((t) => t.id === templateId);
  const modules = normalizeModules(body.modules ?? template?.modules);

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name,
      description: String(body.description ?? "").trim() || null,
      icon: String(body.icon ?? "").trim() || null,
      color,
      status: body.status === "archived" ? "archived" : "active",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
