import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";

const DEFAULT_TZ = "Europe/Zurich";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    preferences: data ?? { user_id: user.id, timezone: DEFAULT_TZ },
  });
}

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const body = await request.json();
  const timezone = String(body.timezone ?? "").trim() || DEFAULT_TZ;

  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(
      { user_id: user.id, timezone, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ preferences: data });
}
