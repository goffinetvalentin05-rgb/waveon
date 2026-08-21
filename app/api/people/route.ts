import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("user_id", user.id)
    .order("is_self", { ascending: false })
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let people = data ?? [];
  if (people.length === 0) {
    const displayName =
      (user.user_metadata?.full_name as string | undefined)?.trim() ||
      user.email?.split("@")[0] ||
      "Moi";
    const { data: created } = await supabase
      .from("people")
      .insert({
        user_id: user.id,
        name: displayName,
        email: user.email ?? null,
        is_self: true,
        role: "Propriétaire",
      })
      .select("*")
      .single();
    if (created) people = [created];
  }

  return NextResponse.json({ people });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  const { data, error } = await supabase
    .from("people")
    .insert({
      user_id: user.id,
      name,
      email: String(body.email ?? "").trim() || null,
      avatar: String(body.avatar ?? "").trim() || null,
      role: String(body.role ?? "").trim() || null,
      is_self: Boolean(body.is_self),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ person: data }, { status: 201 });
}
