import type { SupabaseClient } from "@supabase/supabase-js";
import { isPersonalUnlocked } from "@/lib/personal/pin";

export type PersonalSecurity = {
  user_id: string;
  pin_hash: string | null;
  lock_enabled: boolean;
  updated_at: string;
};

export type PersonalSecurityState = {
  lockEnabled: boolean;
  hasPin: boolean;
  unlocked: boolean;
};

export async function fetchPersonalSecurity(
  supabase: SupabaseClient,
  userId: string
): Promise<PersonalSecurity | null> {
  const { data, error } = await supabase
    .from("personal_security")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as PersonalSecurity;
}

export async function getPersonalSecurityState(
  supabase: SupabaseClient,
  userId: string
): Promise<PersonalSecurityState> {
  const row = await fetchPersonalSecurity(supabase, userId);
  const hasPin = Boolean(row?.pin_hash);
  const lockEnabled = Boolean(row?.lock_enabled && hasPin);
  const unlocked = lockEnabled
    ? await isPersonalUnlocked(userId, row?.pin_hash ?? null)
    : true;
  return { lockEnabled, hasPin, unlocked };
}
