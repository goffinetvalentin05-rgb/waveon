import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { validateEnglishInput } from "@/lib/english/payload";
import { todayDateISO } from "@/lib/english/srs";
import type { EnglishStatus, EnglishType } from "@/lib/english/types";
import { ENGLISH_STATUSES, ENGLISH_TYPES } from "@/lib/english/types";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const type = url.searchParams.get("type");
  const category = url.searchParams.get("category");
  const status = url.searchParams.get("status");
  const sort = url.searchParams.get("sort") ?? "recent";
  const dueOnly = url.searchParams.get("due") === "1";
  const includeArchived = url.searchParams.get("archived") === "1";

  let query = supabase
    .from("english_entries")
    .select("*")
    .eq("user_id", user.id);

  if (!includeArchived) {
    query = query.neq("status", "archived");
  }
  if (type && ENGLISH_TYPES.includes(type as EnglishType)) {
    query = query.eq("type", type);
  }
  if (status && ENGLISH_STATUSES.includes(status as EnglishStatus)) {
    query = query.eq("status", status);
  }
  if (category) {
    query = query.eq("category", category);
  }
  if (dueOnly) {
    const today = todayDateISO();
    query = query.lte("next_review_at", today).neq("status", "archived");
  }
  if (q) {
    query = query.or(
      `english_text.ilike.%${q}%,french_translation.ilike.%${q}%,category.ilike.%${q}%`
    );
  }

  if (sort === "old") {
    query = query.order("created_at", { ascending: true });
  } else if (sort === "alpha") {
    query = query.order("english_text", { ascending: true });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query.limit(500);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const body = await request.json();
  const parsed = validateEnglishInput(body);
  if (parsed.error || !parsed.data) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const today = todayDateISO();
  const { data, error } = await supabase
    .from("english_entries")
    .insert({
      user_id: user.id,
      ...parsed.data,
      status: "new",
      review_level: 0,
      next_review_at: today,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data }, { status: 201 });
}
