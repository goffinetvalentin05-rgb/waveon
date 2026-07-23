import type { SupabaseClient } from "@supabase/supabase-js";
import {
  daysUntil,
  nextBirthdayDate,
} from "@/lib/calendar/helpers";
import { dateInTimezone, getUserTimezone } from "@/lib/calendar/timezone";
import { todayDateISO } from "@/lib/english/srs";
import type { HomeSummary, HomeSummaryId } from "@/modules/types";

/**
 * Résout les indicateurs affichés sur les cartes du hub.
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
      return getCalendarTodaySummary(supabase, userId);
    case "english-review":
      return getEnglishReviewSummary(supabase, userId);
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

async function getEnglishReviewSummary(
  supabase: SupabaseClient,
  userId: string
): Promise<HomeSummary | null> {
  const today = todayDateISO();
  const { count, error } = await supabase
    .from("english_entries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("status", "archived")
    .lte("next_review_at", today);

  if (error) return null;

  const value = count ?? 0;
  return {
    value,
    label:
      value === 0
        ? "Rien à réviser"
        : value === 1
          ? "1 carte à réviser"
          : `${value} cartes à réviser`,
  };
}

async function getCalendarTodaySummary(
  supabase: SupabaseClient,
  userId: string
): Promise<HomeSummary | null> {
  const tz = await getUserTimezone(supabase, userId);
  const today = dateInTimezone(tz);
  const dayStart = `${today}T00:00:00.000Z`;
  const dayEnd = `${today}T23:59:59.999Z`;

  const [{ count, error }, { data: birthdays }] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .lte("start_at", dayEnd)
      .gte("end_at", dayStart),
    supabase.from("birthdays").select("*").eq("user_id", userId),
  ]);

  // Si tables absentes (migration non appliquée), ne pas casser l'accueil
  if (error) return null;

  const value = count ?? 0;
  const label =
    value === 0
      ? "Aucun événement aujourd'hui"
      : value === 1
        ? "1 événement aujourd'hui"
        : `${value} événements aujourd'hui`;

  let secondaryLabel: string | undefined;
  if (birthdays && birthdays.length > 0) {
    const upcoming = birthdays
      .map((b) => {
        const next = nextBirthdayDate(b.birth_date, today);
        return { name: b.person_name as string, next, days: daysUntil(today, next) };
      })
      .filter((b) => b.days >= 0 && b.days <= 14)
      .sort((a, b) => a.days - b.days);

    const nearest = upcoming[0];
    if (nearest) {
      secondaryLabel =
        nearest.days === 0
          ? `Anniversaire de ${nearest.name} aujourd'hui`
          : nearest.days === 1
            ? `Anniversaire de ${nearest.name} demain`
            : `Anniversaire de ${nearest.name} dans ${nearest.days} jours`;
    }
  }

  return { value, label, secondaryLabel };
}
