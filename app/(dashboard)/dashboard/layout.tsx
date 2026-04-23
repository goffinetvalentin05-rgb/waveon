import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import DashboardShell from "./DashboardShell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();

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

  await supabase.auth.getUser();

  return <DashboardShell>{children}</DashboardShell>;
}
