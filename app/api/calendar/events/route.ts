import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { validateEventInput } from "@/lib/calendar/helpers";
import { CALENDAR_CATEGORY_COLORS } from "@/lib/calendar/types";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const scope = url.searchParams.get("scope");
  const projectId = url.searchParams.get("project");

  let query = supabase
    .from("calendar_events")
    .select("*")
    .order("start_at", { ascending: true });

  if (scope === "personal") {
    query = query.eq("user_id", user.id).eq("scope", "personal");
  } else if (projectId === "unassigned") {
    query = query.eq("user_id", user.id).eq("scope", "project").is("project_id", null);
  } else if (projectId) {
    query = query.eq("scope", "project").eq("project_id", projectId);
  } else {
    query = query.eq("user_id", user.id);
  }

  if (from) query = query.gte("end_at", from);
  if (to) query = query.lte("start_at", to);

  const { data, error } = await query.limit(1000);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ events: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const body = await request.json();
  const parsed = validateEventInput(body);
  if (parsed.error || !parsed.data) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const color =
    parsed.data.color ??
    CALENDAR_CATEGORY_COLORS[parsed.data.category] ??
    "#2563eb";

  // Deduplicate CRM-linked events
  if (parsed.data.source && parsed.data.source_id) {
    const { data: existing } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", user.id)
      .eq("source", parsed.data.source)
      .eq("source_id", parsed.data.source_id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ event: existing, deduped: true });
    }
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      category: parsed.data.category,
      start_at: parsed.data.start_at,
      end_at: parsed.data.end_at,
      all_day: parsed.data.all_day ?? false,
      description: parsed.data.description ?? null,
      color,
      location: parsed.data.location ?? null,
      source: parsed.data.source ?? null,
      source_id: parsed.data.source_id ?? null,
      project_id: parsed.data.project_id ?? null,
      scope: parsed.data.scope ?? "personal",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ event: data }, { status: 201 });
}
