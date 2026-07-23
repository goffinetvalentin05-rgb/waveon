import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { todayDateISO } from "@/lib/english/srs";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const today = todayDateISO();

  const [
    { count: total },
    { count: dueToday },
    { count: known },
    { count: review },
  ] = await Promise.all([
    supabase
      .from("english_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "archived"),
    supabase
      .from("english_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "archived")
      .lte("next_review_at", today),
    supabase
      .from("english_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "known"),
    supabase
      .from("english_entries")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "review"),
  ]);

  return NextResponse.json({
    stats: {
      total: total ?? 0,
      dueToday: dueToday ?? 0,
      known: known ?? 0,
      review: review ?? 0,
    },
  });
}
