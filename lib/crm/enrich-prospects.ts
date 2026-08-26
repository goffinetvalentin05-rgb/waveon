import type { SupabaseClient } from "@supabase/supabase-js";
import { CONTACT_ACTIVITY_TYPES } from "@/lib/crm/next-action";
import { migrateProspectStatus } from "@/lib/crm/status";
import { normalizeProspectFromDb } from "@/lib/crm/prospect-payload";
import type { Prospect } from "@/lib/crm/types";

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
    };
  });

  if (!prospects.length) return prospects;

  const ids = prospects.map((p) => p.id);
  const assigneeIds = [...new Set(prospects.map((p) => p.assigned_to).filter(Boolean))] as string[];

  const peopleResult = assigneeIds.length
    ? await supabase.from("people").select("id, name").in("id", assigneeIds)
    : { data: [] as { id: string; name: string }[], error: null };

  const { data: activities } = await supabase
    .from("prospect_activities")
    .select("prospect_id, action_type")
    .in("prospect_id", ids)
    .in("action_type", [...CONTACT_ACTIVITY_TYPES]);

  const { data: contactRows, error: contactsError } = await supabase
    .from("prospect_contacts")
    .select("prospect_id")
    .in("prospect_id", ids);

  const people = peopleResult.data ?? [];

  const counts = new Map<string, number>();
  for (const a of activities ?? []) {
    counts.set(a.prospect_id, (counts.get(a.prospect_id) ?? 0) + 1);
  }
  const peopleMap = new Map((people ?? []).map((p) => [p.id, p.name]));

  const peopleCounts = new Map<string, number>();
  for (const c of contactsError ? [] : contactRows ?? []) {
    peopleCounts.set(c.prospect_id, (peopleCounts.get(c.prospect_id) ?? 0) + 1);
  }

  return prospects.map((p) => ({
    ...p,
    contact_count: counts.get(p.id) ?? 0,
    people_count: peopleCounts.get(p.id) ?? 0,
    assignee: p.assigned_to ? { id: p.assigned_to, name: peopleMap.get(p.assigned_to) ?? "—" } : null,
  }));
}
