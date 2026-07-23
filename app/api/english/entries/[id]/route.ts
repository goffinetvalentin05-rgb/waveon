import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { validateEnglishInput } from "@/lib/english/payload";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await ctx.params;

  const { data, error } = await supabase
    .from("english_entries")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ entry: data });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await ctx.params;
  const body = await request.json();

  // Archive shortcut
  if (body?.archive === true) {
    const { data, error } = await supabase
      .from("english_entries")
      .update({ status: "archived" })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entry: data });
  }

  if (body?.unarchive === true) {
    const { data, error } = await supabase
      .from("english_entries")
      .update({ status: "learning", next_review_at: new Date().toISOString().slice(0, 10) })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entry: data });
  }

  const parsed = validateEnglishInput(body);
  if (parsed.error || !parsed.data) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("english_entries")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await ctx.params;

  const { error } = await supabase
    .from("english_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
