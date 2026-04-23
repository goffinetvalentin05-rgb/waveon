import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { redirect } from "next/navigation";
import DashboardShell from "./DashboardShell";
import { getBillingStatusForWorkspace } from "@/lib/subscription/workspace-billing";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* Server Component : cookies en lecture seule dans certains contextes */
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let billingLocked = false;

  if (user) {
    const { data: biz } = await supabase
      .from(WavonDbTable.businesses)
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    const businessId = (biz as { id: string } | null)?.id ?? null;

    const isExemptWhenBlocked =
      pathname === "/dashboard/facturation" ||
      pathname.startsWith("/dashboard/facturation/") ||
      pathname === "/dashboard/parametres" ||
      pathname.startsWith("/dashboard/parametres/");

    if (businessId) {
      try {
        const { billing } = await getBillingStatusForWorkspace(businessId);
        billingLocked = !billing.canUseApp;

        if (billingLocked && !isExemptWhenBlocked) {
          redirect("/dashboard/facturation?trial_expired=1");
        }
      } catch {
        // En cas d’erreur transitoire (Stripe/Supabase), on ne bloque pas agressivement.
        billingLocked = false;
      }
    }
  }

  return <DashboardShell billingLocked={billingLocked}>{children}</DashboardShell>;
}
