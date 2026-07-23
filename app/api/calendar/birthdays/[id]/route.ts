import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { validateBirthdayInput } from "@/lib/calendar/helpers";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await ctx.params;
  const body = await request.json();
  const parsed = validateBirthdayInput(body);
  if (parsed.error || !parsed.data) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("birthdays")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ birthday: data });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await ctx.params;

  const { error } = await supabase
    .from("birthdays")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
