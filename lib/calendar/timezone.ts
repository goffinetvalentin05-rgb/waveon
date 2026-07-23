import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_TZ = "Europe/Zurich";

export async function getUserTimezone(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from("user_preferences")
    .select("timezone")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.timezone || process.env.USER_TIMEZONE?.trim() || DEFAULT_TZ;
}

export function dateInTimezone(timezone: string, date = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
