import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/crm/server";
import { requireProjectPermission } from "@/lib/projects/access";
import { can } from "@/lib/access/permissions";
import {
  calendarFeedCalendarName,
  calendarFeedHttpsUrl,
  calendarFeedWebcalUrl,
  generateCalendarFeedToken,
} from "@/lib/calendar/feed";

type Params = { params: Promise<{ id: string }> };

type FeedRow = {
  token: string;
  enabled: boolean;
};

function publicFeedPayload(projectName: string, feed: FeedRow | null) {
  const calendarName = calendarFeedCalendarName(projectName);
  if (!feed?.enabled) {
    return {
      enabled: false,
      url: null as string | null,
      webcal_url: null as string | null,
      calendar_name: calendarName,
    };
  }
  const url = calendarFeedHttpsUrl(feed.token);
  return {
    enabled: true,
    url,
    webcal_url: calendarFeedWebcalUrl(url),
    calendar_name: calendarName,
  };
}

async function loadFeed(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("project_calendar_feeds")
    .select("token, enabled")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as FeedRow | null) ?? null;
}

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const access = await requireProjectPermission(supabase, id, user.id, "project.view");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const { data: project } = await supabase.from("projects").select("name").eq("id", id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  try {
    const feed = await loadFeed(supabase, id);
    return NextResponse.json(publicFeedPayload(project.name, feed));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de lire le calendrier.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const access = await requireProjectPermission(supabase, id, user.id, "project.view");
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!can(access.role, "project.edit_settings")) {
    return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 });
  }

  let action = "enable";
  try {
    const body = await request.json();
    if (body && typeof body.action === "string") action = body.action;
  } catch {
    action = "enable";
  }

  if (action !== "enable" && action !== "regenerate" && action !== "disable") {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  const { data: project } = await supabase.from("projects").select("name").eq("id", id).maybeSingle();
  if (!project) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  try {
    const existing = await loadFeed(supabase, id);

    if (action === "disable") {
      if (existing) {
        const { error } = await supabase
          .from("project_calendar_feeds")
          .update({ enabled: false })
          .eq("project_id", id);
        if (error) throw new Error(error.message);
      }
      return NextResponse.json(publicFeedPayload(project.name, { token: "", enabled: false }));
    }

    if (action === "enable" && existing?.enabled) {
      return NextResponse.json(publicFeedPayload(project.name, existing));
    }

    const token = generateCalendarFeedToken();
    const { data, error } = await supabase
      .from("project_calendar_feeds")
      .upsert(
        {
          project_id: id,
          token,
          enabled: true,
          created_by: user.id,
        },
        { onConflict: "project_id" }
      )
      .select("token, enabled")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Impossible d’enregistrer le flux.");
    return NextResponse.json(publicFeedPayload(project.name, data as FeedRow));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Impossible de mettre à jour le calendrier.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
