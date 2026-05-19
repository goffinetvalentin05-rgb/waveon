import { NextResponse } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id")?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "session_id manquant." }, { status: 400 });
  }

  const supabase = await createRouteHandlerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const { data: league } = await admin
    .from("leagues")
    .select("slug, name, status, owner_id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (!league || league.owner_id !== user.id) {
    return NextResponse.json({ status: "pending", slug: null, name: null });
  }

  return NextResponse.json({
    slug: league.slug,
    name: league.name,
    status: league.status,
  });
}
