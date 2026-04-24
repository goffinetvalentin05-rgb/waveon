import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { WorkspaceProfileAccess } from "@/lib/wavon/types";

export type ProfileSubscriptionRow = {
  role: string | null;
  plan_override: string | null;
  subscription_status_override: string | null;
};

const PRO_LABEL = "Plan Pro actif — accès admin";

export async function fetchProfileSubscriptionRow(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileSubscriptionRow | null> {
  const id = userId.trim();
  if (!id) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("role, plan_override, subscription_status_override")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[profiles] fetch subscription overrides", error.message);
    return null;
  }
  return (data as ProfileSubscriptionRow | null) ?? null;
}

export async function fetchProfileSubscriptionRowAdmin(userId: string): Promise<ProfileSubscriptionRow | null> {
  const id = userId.trim();
  if (!id) return null;
  try {
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("profiles")
      .select("role, plan_override, subscription_status_override")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.error("[profiles] admin fetch subscription overrides", error.message);
      return null;
    }
    return (data as ProfileSubscriptionRow | null) ?? null;
  } catch {
    return null;
  }
}

/** true si le profil force un accès équivalent Pro (sans Stripe). */
export function profileGrantsProOverride(row: ProfileSubscriptionRow | null): boolean {
  if (!row) return false;
  const role = (row.role ?? "").trim().toLowerCase();
  if (role === "admin") return true;
  const plan = (row.plan_override ?? "").trim().toLowerCase();
  return plan === "pro";
}

export function profileAccessForApi(row: ProfileSubscriptionRow | null): WorkspaceProfileAccess | null {
  if (!profileGrantsProOverride(row)) return null;
  const isAdmin = (row!.role ?? "").trim().toLowerCase() === "admin";
  return {
    displayLabel: PRO_LABEL,
    isAdmin,
    role: row!.role ?? null,
    planOverride: row!.plan_override ?? null,
    subscriptionStatusOverride: row!.subscription_status_override ?? null,
  };
}

/** Libellé facturation pour le compte interne identifié par email Auth (sans ligne `profiles`). */
export function workspaceProfileAccessFromInternalAdminEmail(): WorkspaceProfileAccess {
  return {
    displayLabel: "Plan Pro actif — accès admin interne",
    isAdmin: true,
    role: "admin",
    planOverride: "pro",
    subscriptionStatusOverride: "active",
  };
}
