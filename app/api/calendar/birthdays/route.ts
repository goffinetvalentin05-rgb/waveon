import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { validateBirthdayInput } from "@/lib/calendar/helpers";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("birthdays")
    .select("*")
    .eq("user_id", user.id)
    .order("person_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ birthdays: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const body = await request.json();
  const parsed = validateBirthdayInput(body);
  if (parsed.error || !parsed.data) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("birthdays")
    .insert({ user_id: user.id, ...parsed.data })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ birthday: data }, { status: 201 });
}
