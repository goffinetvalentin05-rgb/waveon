import type { SupabaseClient } from "@supabase/supabase-js";
import { CONTACT_ACTIVITY_TYPES } from "@/lib/crm/next-action";
import { migrateProspectStatus } from "@/lib/crm/status";
import { normalizeProspectFromDb } from "@/lib/crm/prospect-payload";
import type { Prospect } from "@/lib/crm/types";
import { listProjectMembers, memberLabel } from "@/lib/projects/assignee";

export async function enrichProspects(
  supabase: SupabaseClient,
  _userId: string,
  rows: Record<string, unknown>[]
): Promise<Prospect[]> {
  const prospects = rows.map((row) => {
    const normalized = normalizeProspectFromDb(row) as Prospect;
    return {
      ...normalized,
      status: migrateProspectStatus(String(normalized.status)),
      contact_count: 0,
      assigned_user_id:
        (normalized as Prospect).assigned_user_id ??
        (typeof row.assigned_user_id === "string" ? row.assigned_user_id : null),
    };
  });

  if (!prospects.length) return prospects;

  const ids = prospects.map((p) => p.id);
  const projectIds = [...new Set(prospects.map((p) => p.project_id).filter(Boolean))] as string[];

  const memberMaps = new Map<string, Map<string, string>>();
  await Promise.all(
    projectIds.map(async (projectId) => {
      const members = await listProjectMembers(supabase, projectId);
      memberMaps.set(
        projectId,
        new Map(members.map((m) => [m.user_id, memberLabel(m)]))
      );
    })
  );

  const { data: activities } = await supabase
    .from("prospect_activities")
    .select("prospect_id, action_type")
    .in("prospect_id", ids)
    .in("action_type", [...CONTACT_ACTIVITY_TYPES]);

  const { data: contactRows, error: contactsError } = await supabase
    .from("prospect_contacts")
    .select("prospect_id")
    .in("prospect_id", ids);

  const counts = new Map<string, number>();
  for (const a of activities ?? []) {
    counts.set(a.prospect_id, (counts.get(a.prospect_id) ?? 0) + 1);
  }

  const peopleCounts = new Map<string, number>();
  for (const c of contactsError ? [] : contactRows ?? []) {
    peopleCounts.set(c.prospect_id, (peopleCounts.get(c.prospect_id) ?? 0) + 1);
  }

  return prospects.map((p) => {
    const assigneeId = p.assigned_user_id;
    const name =
      assigneeId && p.project_id
        ? memberMaps.get(p.project_id)?.get(assigneeId) ?? "Membre"
        : null;
    return {
      ...p,
      contact_count: counts.get(p.id) ?? 0,
      people_count: peopleCounts.get(p.id) ?? 0,
      assignee: assigneeId ? { id: assigneeId, name: name ?? "Membre" } : null,
    };
  });
}
