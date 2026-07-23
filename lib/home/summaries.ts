import type { SupabaseClient } from "@supabase/supabase-js";
import type { HomeSummary, HomeSummaryId } from "@/modules/types";

/**
 * Résout les indicateurs affichés sur les cartes du hub.
 * Chaque id correspond à un adapter léger — les modules futurs
 * s'ajoutent ici sans toucher à la page d'accueil.
 */
export async function resolveHomeSummary(
  id: HomeSummaryId,
  supabase: SupabaseClient,
  userId: string
): Promise<HomeSummary | null> {
  switch (id) {
    case "crm-follow-ups":
      return getCrmFollowUpsSummary(supabase, userId);
    case "calendar-today":
      // Phase calendrier — pas encore de données
      return null;
    case "english-review":
      // Phase anglais — pas encore de données
      return null;
    default:
      return null;
  }
}

async function getCrmFollowUpsSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<HomeSummary | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { count, error } = await supabase
    .from("prospects")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("archived_at", null)
    .lte("next_follow_up", today)
    .not("status", "in", '("Client","Refus","Pas intéressé")');

  if (error) return null;

  const value = count ?? 0;
  return {
    value,
    label:
      value === 0
        ? "Aucune relance"
        : value === 1
          ? "1 relance aujourd'hui"
          : `${value} relances aujourd'hui`,
  };
}
