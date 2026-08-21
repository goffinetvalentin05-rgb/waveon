import type { SupabaseClient } from "@supabase/supabase-js";

export async function logWorkspaceEvent(
  supabase: SupabaseClient,
  userId: string,
  input: {
    event_type: string;
    title: string;
    project_id?: string | null;
    entity_type?: string | null;
    entity_id?: string | null;
  }
) {
  await supabase.from("workspace_events").insert({
    user_id: userId,
    event_type: input.event_type,
    title: input.title,
    project_id: input.project_id ?? null,
    entity_type: input.entity_type ?? null,
    entity_id: input.entity_id ?? null,
  });
}
