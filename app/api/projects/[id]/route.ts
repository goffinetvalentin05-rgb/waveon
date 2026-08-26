import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { requireProjectPermission } from "@/lib/projects/access";
import { replaceProjectModules } from "@/lib/projects/server";
import { normalizeModules, type ProjectModuleKey } from "@/lib/projects/modules";
import { can } from "@/lib/access/permissions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const access = await requireProjectPermission(supabase, id, user.id, "project.view");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ project: { ...data, myRole: access.role } });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;
  const body = await request.json();

  const access = await requireProjectPermission(supabase, id, user.id, "project.view");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const patch: Record<string, unknown> = {};
  if ("name" in body || "description" in body || "icon" in body || "logo_url" in body || "color" in body || "modules" in body) {
    if (!can(access.role, "project.edit_settings")) {
      return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
    }
  }
  if ("status" in body && !can(access.role, "project.archive")) {
    return NextResponse.json({ error: "Seul l'owner peut archiver ou restaurer." }, { status: 403 });
  }

  if ("name" in body) {
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
    patch.name = name;
  }
  if ("description" in body) patch.description = String(body.description ?? "").trim() || null;
  if ("icon" in body) patch.icon = String(body.icon ?? "").trim() || null;
  if ("logo_url" in body) {
    const logo = typeof body.logo_url === "string" ? body.logo_url.trim() : "";
    patch.logo_url = logo || null;
  }
  if ("color" in body) patch.color = String(body.color ?? "").trim() || null;
  if ("status" in body) patch.status = body.status === "archived" ? "archived" : "active";

  let { data, error } = await supabase
    .from("projects")
    .update(Object.keys(patch).length ? patch : { updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error && /logo_url/i.test(error.message)) {
    const fallback = { ...patch };
    if ("logo_url" in fallback) {
      fallback.icon = fallback.logo_url || fallback.icon || null;
      delete fallback.logo_url;
    }
    const retry = await supabase
      .from("projects")
      .update(fallback)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    data = retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  let enabledModules: ProjectModuleKey[] | undefined;
  if ("modules" in body) {
    try {
      enabledModules = await replaceProjectModules(supabase, user.id, id, normalizeModules(body.modules));
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Impossible d'enregistrer les modules" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ project: { ...data, enabledModules, myRole: access.role } });
}

export async function DELETE(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const access = await requireProjectPermission(supabase, id, user.id, "project.delete");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  let confirmName = "";
  try {
    const body = await request.json();
    confirmName = typeof body?.confirm_name === "string" ? body.confirm_name.trim() : "";
  } catch {
    confirmName = "";
  }

  const { data: project } = await supabase.from("projects").select("id, name").eq("id", id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!confirmName || confirmName !== project.name) {
    return NextResponse.json(
      { error: "Saisissez le nom exact du projet pour confirmer la suppression." },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
