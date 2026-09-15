import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/brand/config";
import { parseCalendarFeedToken, prospectEventUrl } from "@/lib/calendar/feed";
import { buildProjectIcs } from "@/lib/calendar/ics";
import { createAdminSupabaseClient, getSupabaseServiceRoleKey } from "@/lib/supabase/admin";

type Params = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FEED_HEADERS = {
  "Content-Type": "text/calendar; charset=utf-8",
  "X-Robots-Tag": "noindex, nofollow",
  "Cache-Control": "private, max-age=120, must-revalidate",
} as const;

function notFound() {
  return new NextResponse("Not Found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    },
  });
}

function icsResponse(body: string, etag: string) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      ...FEED_HEADERS,
      ETag: etag,
      "Content-Disposition": 'inline; filename="waveone.ics"',
    },
  });
}

export async function GET(request: Request, { params }: Params) {
  const { token: raw } = await params;
  const token = parseCalendarFeedToken(raw);
  if (!token) return notFound();
  if (!getSupabaseServiceRoleKey()) return notFound();

  const admin = createAdminSupabaseClient();
  const { data: feed, error: feedError } = await admin
    .from("project_calendar_feeds")
    .select("project_id, enabled, updated_at, project:projects(name)")
    .eq("token", token)
    .maybeSingle();

  if (feedError || !feed || !feed.enabled) return notFound();

  const project = Array.isArray(feed.project) ? feed.project[0] : feed.project;
  const projectName = project?.name?.trim() || "Projet";
  const projectId = String(feed.project_id);

  const { data: events, error: eventsError } = await admin
    .from("calendar_events")
    .select("id, title, description, location, start_at, end_at, all_day, source, source_id, created_at, updated_at")
    .eq("project_id", projectId)
    .eq("scope", "project")
    .order("start_at", { ascending: true })
    .limit(2000);

  if (eventsError) {
    return new NextResponse("Calendar unavailable", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const rows = events ?? [];
  const latestEvent = rows.reduce((max, row) => {
    const value = row.updated_at || row.created_at || "";
    return value > max ? value : max;
  }, "");
  const etag = `"${createHash("sha1")
    .update(`${feed.updated_at}|${latestEvent}|${rows.length}|${projectName}`)
    .digest("hex")}"`;

  const incoming = request.headers.get("if-none-match");
  if (incoming && incoming === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ...FEED_HEADERS, ETag: etag },
    });
  }

  const baseUrl = getAppBaseUrl();
  const ics = buildProjectIcs({
    projectName,
    events: rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      location: row.location,
      startAt: row.start_at,
      endAt: row.end_at,
      allDay: Boolean(row.all_day),
      updatedAt: row.updated_at,
      createdAt: row.created_at,
      url: prospectEventUrl({
        baseUrl,
        projectId,
        source: row.source,
        sourceId: row.source_id,
      }),
    })),
  });

  return icsResponse(ics, etag);
}

export async function HEAD(request: Request, context: Params) {
  const response = await GET(request, context);
  return new NextResponse(null, { status: response.status, headers: response.headers });
}
