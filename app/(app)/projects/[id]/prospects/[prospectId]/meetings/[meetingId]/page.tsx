import { notFound } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { MeetingDetailView } from "@/components/crm/MeetingDetailView";
import { hydrateMeeting, loadWritableProspect } from "@/lib/crm/meeting-server";

type Props = { params: Promise<{ id: string; prospectId: string; meetingId: string }> };

export default async function ProjectMeetingPage({ params }: Props) {
  const { id, prospectId, meetingId } = await params;
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const prospect = await loadWritableProspect(supabase, prospectId);
  if (!prospect || prospect.project_id !== id) notFound();

  const { data } = await supabase
    .from("prospect_meetings")
    .select("*")
    .eq("id", meetingId)
    .eq("prospect_id", prospectId)
    .maybeSingle();
  if (!data) notFound();

  const meeting = await hydrateMeeting(supabase, data as Record<string, unknown>);
  return (
    <MeetingDetailView
      meeting={meeting}
      clubName={prospect.club_name}
      backHref={`/projects/${id}/prospects/${prospectId}`}
    />
  );
}
