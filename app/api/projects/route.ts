import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { logWorkspaceEvent } from "@/lib/workspace/events";
import { PROJECT_COLORS } from "@/lib/projects/types";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .order("status", { ascending: true })
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data ?? [] });
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

  await logWorkspaceEvent(supabase, user.id, {
    event_type: "project_created",
    title: `Projet créé : ${name}`,
    project_id: data.id,
    entity_type: "project",
    entity_id: data.id,
  });

  return NextResponse.json({ project: data }, { status: 201 });
}
