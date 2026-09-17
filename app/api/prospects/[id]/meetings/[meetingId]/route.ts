import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { hydrateMeeting, loadWritableProspect } from "@/lib/crm/meeting-server";
import { parseMeetingReport, parseParticipants } from "@/lib/crm/meetings";

type Params = { params: Promise<{ id: string; meetingId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase } = auth;
  const { id, meetingId } = await params;

  const prospect = await loadWritableProspect(supabase, id);
  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { data, error } = await supabase
    .from("prospect_meetings")
    .select("*")
    .eq("id", meetingId)
    .eq("prospect_id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Compte-rendu introuvable." }, { status: 404 });

  return NextResponse.json({
    meeting: await hydrateMeeting(supabase, data as Record<string, unknown>),
    clubName: prospect.club_name,
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase } = auth;
  const { id, meetingId } = await params;

  const prospect = await loadWritableProspect(supabase, id);
  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { data: current } = await supabase
    .from("prospect_meetings")
    .select("*")
    .eq("id", meetingId)
    .eq("prospect_id", id)
    .maybeSingle();
  if (!current) return NextResponse.json({ error: "Compte-rendu introuvable." }, { status: 404 });

  const body = await request.json();
  const patch: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim();
  if (typeof body.notes_free === "string") patch.notes_free = body.notes_free.trim() || null;
  if (body.report) patch.report = parseMeetingReport(body.report);
  if (body.participants) patch.participants = parseParticipants(body.participants);
  if (typeof body.occurred_at === "string" && !Number.isNaN(Date.parse(body.occurred_at))) {
    patch.occurred_at = new Date(body.occurred_at).toISOString();
  }

  const revisions = Array.isArray(current.revisions) ? [...current.revisions] : [];
  revisions.push({ at: new Date().toISOString(), note: "Compte-rendu modifié" });
  patch.revisions = revisions.slice(-12);

  const { data, error } = await supabase
    .from("prospect_meetings")
    .update(patch)
    .eq("id", meetingId)
    .eq("prospect_id", id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Mise à jour impossible." }, { status: 400 });

  if (current.activity_id && (patch.title || patch.report)) {
    const report = parseMeetingReport(data.report);
    await supabase
      .from("prospect_activities")
      .update({
        title: String(data.title),
        description: JSON.stringify({
          meeting: true,
          meeting_id: data.id,
          note: report.summary || data.notes_free || data.title,
        }),
      })
      .eq("id", current.activity_id);
  }

  return NextResponse.json({
    meeting: await hydrateMeeting(supabase, data as Record<string, unknown>),
  });
}
