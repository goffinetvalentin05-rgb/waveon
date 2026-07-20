import { NextResponse } from "next/server";
import { getOrCreateSettings, requireUser } from "@/lib/crm/server";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const settings = await getOrCreateSettings(auth.supabase, auth.user.id);
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const body = await request.json();

  await getOrCreateSettings(supabase, user.id);

  const patch: Record<string, number> = {};
  for (const key of ["delay_relance_1_days", "delay_relance_2_days", "delay_relance_3_days"] as const) {
    if (key in body) {
      const n = Number(body[key]);
      if (!Number.isFinite(n) || n < 1 || n > 90) {
        return NextResponse.json({ error: `${key} invalide (1–90)` }, { status: 400 });
      }
      patch[key] = Math.round(n);
    }
  }

  const { data, error } = await supabase
    .from("crm_settings")
    .update(patch)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
