import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { logWorkspaceEvent } from "@/lib/workspace/events";
import { normalizeProspectFromDb } from "@/lib/crm/prospect-payload";
import {
  hydrateMeeting,
  loadWritableProspect,
  meetingParticipantOptions,
  MEETING_BUCKET,
} from "@/lib/crm/meeting-server";
import {
  emptyMeetingReport,
  isMeetingType,
  meetingActionType,
  parseMeetingReport,
  parseParticipants,
  parseMeetingRow,
  type MeetingType,
} from "@/lib/crm/meetings";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase } = auth;
  const { id } = await params;

  const prospect = await loadWritableProspect(supabase, id);
  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { data, error } = await supabase
    .from("prospect_meetings")
    .select("*")
    .eq("prospect_id", id)
    .order("occurred_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const meetings = (data ?? []).map((row) => parseMeetingRow(row as Record<string, unknown>));
  const options = await meetingParticipantOptions(supabase, id, prospect.project_id);

  return NextResponse.json({
    meetings,
    participantOptions: options,
    clubName: prospect.club_name,
  });
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await params;

  const prospect = await loadWritableProspect(supabase, id);
  if (!prospect) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  if (!title) return NextResponse.json({ error: "Le titre est obligatoire." }, { status: 400 });

  const typeRaw = String(form.get("meeting_type") ?? "rencontre");
  if (!isMeetingType(typeRaw)) {
    return NextResponse.json({ error: "Type de rencontre invalide." }, { status: 400 });
  }
  const meetingType: MeetingType = typeRaw;

  const occurredRaw = String(form.get("occurred_at") ?? "").trim();
  const occurredAt = occurredRaw ? new Date(occurredRaw) : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    return NextResponse.json({ error: "Date invalide." }, { status: 400 });
  }

  let participants = parseParticipants([]);
  try {
    participants = parseParticipants(JSON.parse(String(form.get("participants") ?? "[]")));
  } catch {
    participants = [];
  }

  let report = emptyMeetingReport();
  try {
    report = parseMeetingReport(JSON.parse(String(form.get("report") ?? "{}")));
  } catch {
    report = emptyMeetingReport();
  }

  const notesFree = String(form.get("notes_free") ?? "").trim() || null;
  const extractedText = String(form.get("extracted_text") ?? "").trim() || null;

  const actionType = meetingActionType(meetingType);
  const { data: activity, error: activityError } = await supabase
    .from("prospect_activities")
    .insert({
      user_id: user.id,
      prospect_id: id,
      action_type: actionType,
      interaction_type: meetingType === "demo" ? "demo" : "meeting",
      title,
      description: JSON.stringify({
        meeting: true,
        note: report.summary || notesFree || title,
      }),
      occurred_at: occurredAt.toISOString(),
      actor_name:
        (user.user_metadata?.full_name as string | undefined) || user.email?.split("@")[0] || null,
      channel: "Rencontre",
    })
    .select("id")
    .single();

  if (activityError) return NextResponse.json({ error: activityError.message }, { status: 500 });

  const { data: meeting, error: meetingError } = await supabase
    .from("prospect_meetings")
    .insert({
      user_id: user.id,
      prospect_id: id,
      project_id: prospect.project_id,
      activity_id: activity?.id ?? null,
      title,
      meeting_type: meetingType,
      occurred_at: occurredAt.toISOString(),
      participants,
      notes_free: notesFree,
      report,
      extracted_text: extractedText,
    })
    .select("*")
    .single();

  if (meetingError || !meeting) {
    return NextResponse.json({ error: meetingError?.message ?? "Enregistrement impossible." }, { status: 500 });
  }

  if (activity?.id) {
    await supabase
      .from("prospect_activities")
      .update({
        description: JSON.stringify({
          meeting: true,
          meeting_id: meeting.id,
          note: report.summary || notesFree || title,
        }),
      })
      .eq("id", activity.id);
  }

  const files = form.getAll("photos").filter((item): item is File => item instanceof File && item.size > 0);
  for (const file of files.slice(0, 8)) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${id}/${meeting.id}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const upload = await supabase.storage.from(MEETING_BUCKET).upload(path, buffer, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
    if (upload.error) continue;
    await supabase.from("prospect_meeting_attachments").insert({
      user_id: user.id,
      meeting_id: meeting.id,
      storage_path: path,
      mime_type: file.type || "image/jpeg",
      file_name: file.name,
    });
  }

  await supabase
    .from("prospects")
    .update({
      last_action: title,
      last_action_at: occurredAt.toISOString(),
      contact_channel: prospect.contact_channel || "Rencontre",
    })
    .eq("id", id);

  await logWorkspaceEvent(supabase, user.id, {
    event_type: "meeting",
    title: `${title} — ${prospect.club_name}`,
    project_id: prospect.project_id,
    entity_type: "prospect",
    entity_id: id,
  });

  const hydrated = await hydrateMeeting(supabase, meeting as Record<string, unknown>);

  const { data: activities } = await supabase
    .from("prospect_activities")
    .select("*")
    .eq("prospect_id", id)
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });

  const { data: updated } = await supabase.from("prospects").select("*").eq("id", id).maybeSingle();

  return NextResponse.json(
    {
      meeting: hydrated,
      activities: activities ?? [],
      prospect: updated ? normalizeProspectFromDb(updated as Record<string, unknown>) : updated,
    },
    { status: 201 }
  );
}
