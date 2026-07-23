import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { BirthdayClient } from "@/components/calendar/BirthdayClient";
import type { Birthday } from "@/lib/calendar/types";

export default async function CalendarBirthdaysPage() {
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("birthdays")
    .select("*")
    .eq("user_id", user.id)
    .order("person_name", { ascending: true });

  return <BirthdayClient initial={(data ?? []) as Birthday[]} />;
}
