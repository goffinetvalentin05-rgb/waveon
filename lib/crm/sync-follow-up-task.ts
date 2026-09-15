import { isClosedProspectStatus, isDemoScheduledStatus } from "@/lib/crm/closed";
import { crmToday } from "@/lib/crm/date-only";
import { migrateProspectStatus } from "@/lib/crm/status";
import type { ProspectStatus } from "@/lib/crm/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function syncProspectFollowUpTask(
  supabase: SupabaseClient,
  input: {
    userId: string;
    prospectId: string;
    clubName: string;
    status: ProspectStatus | string;
    nextFollowUp: string | null;
  }
) {
  const status = migrateProspectStatus(String(input.status));

  await supabase
    .from("daily_tasks")
    .delete()
    .eq("user_id", input.userId)
    .eq("prospect_id", input.prospectId)
    .eq("completed", false)
    .in("task_kind", ["follow_up", "first_contact", "demo"]);

  if (isClosedProspectStatus(status) || !input.nextFollowUp) return;

  if (isDemoScheduledStatus(status)) return;

  const today = crmToday();
  const dueDate = input.nextFollowUp <= today ? today : input.nextFollowUp;
  const title =
    status === "À contacter"
      ? `Premier contact ${input.clubName}`
      : isDemoScheduledStatus(status)
        ? `Démonstration ${input.clubName}`
        : status === "Relais"
          ? `Suivi réseau ${input.clubName}`
          : `Relancer ${input.clubName}`;
  const taskKind =
    status === "À contacter" ? "first_contact" : isDemoScheduledStatus(status) ? "demo" : "follow_up";

  await supabase.from("daily_tasks").insert({
    user_id: input.userId,
    prospect_id: input.prospectId,
    title,
    due_date: dueDate,
    task_kind: taskKind,
    completed: false,
  });
}
