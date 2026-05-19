import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminGuardOk = {
  ok: true;
  userId: string;
  supabase: SupabaseClient;
  admin: SupabaseClient;
};

export type AdminGuardKo = { ok: false; response: NextResponse };

export async function requireAdmin(): Promise<AdminGuardOk | AdminGuardKo> {
  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Non authentifié." }, { status: 401 }),
    };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 }),
    };
  }
  return {
    ok: true,
    userId: user.id,
    supabase,
    admin: createAdminSupabaseClient(),
  };
}
