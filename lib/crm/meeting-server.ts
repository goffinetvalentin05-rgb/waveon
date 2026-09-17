import type { SupabaseClient } from "@supabase/supabase-js";
import { parseMeetingRow, type MeetingAttachment, type ProspectMeeting } from "@/lib/crm/meetings";
import { contactDisplayName } from "@/lib/crm/contacts";
import type { MeetingParticipantOption } from "@/lib/crm/meetings";

export const MEETING_BUCKET = "prospect-meetings";

export async function loadWritableProspect(
  supabase: SupabaseClient,
  prospectId: string
) {
  const { data } = await supabase
    .from("prospects")
    .select("id, user_id, project_id, club_name, status, next_follow_up, next_action, contact_channel")
    .eq("id", prospectId)
    .maybeSingle();
  return data;
}

export async function signedAttachmentUrls(
  supabase: SupabaseClient,
  attachments: { id: string; storage_path: string; mime_type: string | null; file_name: string | null; created_at: string }[]
): Promise<MeetingAttachment[]> {
  const out: MeetingAttachment[] = [];
  for (const file of attachments) {
    const { data } = await supabase.storage.from(MEETING_BUCKET).createSignedUrl(file.storage_path, 60 * 60);
    out.push({
      id: file.id,
      storage_path: file.storage_path,
      mime_type: file.mime_type,
      file_name: file.file_name,
      created_at: file.created_at,
      url: data?.signedUrl ?? null,
    });
  }
  return out;
}

export async function hydrateMeeting(
  supabase: SupabaseClient,
  row: Record<string, unknown>
): Promise<ProspectMeeting> {
  const meeting = parseMeetingRow(row);
  const { data: files } = await supabase
    .from("prospect_meeting_attachments")
    .select("id, storage_path, mime_type, file_name, created_at")
    .eq("meeting_id", meeting.id)
    .order("created_at", { ascending: true });
  meeting.attachments = await signedAttachmentUrls(supabase, files ?? []);
  return meeting;
}

export async function meetingParticipantOptions(
  supabase: SupabaseClient,
  prospectId: string,
  projectId: string | null
): Promise<MeetingParticipantOption[]> {
  const options: MeetingParticipantOption[] = [];
  const { data: contacts } = await supabase
    .from("prospect_contacts")
    .select("id, first_name, last_name, is_primary")
    .eq("prospect_id", prospectId)
    .order("is_primary", { ascending: false });
  for (const contact of contacts ?? []) {
    options.push({
      kind: "contact",
      id: String(contact.id),
      name: contactDisplayName(contact),
    });
  }

  if (projectId) {
    const { data: members } = await supabase
      .from("project_members")
      .select("user_id, display_name, email")
      .eq("project_id", projectId);
    for (const member of members ?? []) {
      const name = String(member.display_name || member.email || "").trim();
      if (!name) continue;
      options.push({
        kind: "member",
        id: String(member.user_id),
        name,
      });
    }
  }

  return options;
}
