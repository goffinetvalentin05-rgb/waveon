import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { validateEventInput } from "@/lib/calendar/helpers";
import { CALENDAR_CATEGORY_COLORS } from "@/lib/calendar/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await ctx.params;

  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ event: data });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await ctx.params;
  const body = await request.json();

  // Partial move (drag): start_at / end_at only
  if (body?.start_at && body?.end_at && !body?.title) {
    const { data, error } = await supabase
      .from("calendar_events")
      .update({
        start_at: new Date(body.start_at).toISOString(),
        end_at: new Date(body.end_at).toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ event: data });
  }

  const parsed = validateEventInput(body);
  if (parsed.error || !parsed.data) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const color =
    parsed.data.color ??
    CALENDAR_CATEGORY_COLORS[parsed.data.category] ??
    "#2563eb";

  const { data, error } = await supabase
    .from("calendar_events")
    .update({
      title: parsed.data.title,
      category: parsed.data.category,
      start_at: parsed.data.start_at,
      end_at: parsed.data.end_at,
      all_day: parsed.data.all_day ?? false,
      description: parsed.data.description ?? null,
      color,
      location: parsed.data.location ?? null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await ctx.params;

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
