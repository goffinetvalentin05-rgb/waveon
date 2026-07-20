import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import type { CrmSettings } from "@/lib/crm/types";

export async function requireUser() {
  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { supabase, user: null as null, response: NextResponse.json({ error: "Non authentifié" }, { status: 401 }) };
  }
  return { supabase, user, response: null as null };
}

export async function getOrCreateSettings(
  supabase: Awaited<ReturnType<typeof createRouteHandlerSupabase>>,
  userId: string
): Promise<CrmSettings> {
  const { data } = await supabase
    .from("crm_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (data) return data as CrmSettings;

  const { data: created, error } = await supabase
    .from("crm_settings")
    .insert({ user_id: userId })
    .select("*")
    .single();

  if (error || !created) {
    return {
      user_id: userId,
      delay_relance_1_days: 3,
      delay_relance_2_days: 7,
      delay_relance_3_days: 14,
      updated_at: new Date().toISOString(),
    };
  }

  return created as CrmSettings;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
