import type { createServerComponentSupabase } from "@/lib/supabase/server-component";

type Supabase = Awaited<ReturnType<typeof createServerComponentSupabase>>;

/** Crée les tâches du jour pour les prospects dus / à contacter. */
export async function ensureTodayTasks(
  supabase: Supabase,
  userId: string,
  today: string
) {
  const { data: dueProspects } = await supabase
    .from("prospects")
    .select("id, club_name, status")
    .eq("user_id", userId)
    .lte("next_follow_up", today)
    .not("status", "in", '("Client","Refus","Pas intéressé")');

  const { data: newOnes } = await supabase
    .from("prospects")
    .select("id, club_name, status")
    .eq("user_id", userId)
    .eq("status", "À contacter")
    .is("next_follow_up", null);

  const seen = new Set<string>();
  const candidates = [...(dueProspects ?? []), ...(newOnes ?? [])].filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
  if (!candidates.length) return;

  const { data: existing } = await supabase
    .from("daily_tasks")
    .select("prospect_id")
    .eq("user_id", userId)
    .eq("due_date", today)
    .not("prospect_id", "is", null);

  const have = new Set((existing ?? []).map((t) => t.prospect_id));
  const missing = candidates.filter((p) => !have.has(p.id));
  if (!missing.length) return;

  await supabase.from("daily_tasks").insert(
    missing.map((p) => ({
      user_id: userId,
      prospect_id: p.id,
      title:
        p.status === "À contacter"
          ? `Premier contact ${p.club_name}`
          : p.status === "Démonstration"
            ? `Démonstration ${p.club_name}`
            : `Relancer ${p.club_name}`,
      due_date: today,
      task_kind:
        p.status === "À contacter"
          ? "first_contact"
          : p.status === "Démonstration"
            ? "demo"
            : "follow_up",
    }))
  );
}
