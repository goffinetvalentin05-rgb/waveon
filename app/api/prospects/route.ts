import { NextResponse } from "next/server";
import { getOrCreateSettings, requireUser } from "@/lib/crm/server";
import {
  buildProspectInsertPayload,
  normalizeProspectFromDb,
} from "@/lib/crm/prospect-payload";

export async function GET(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const status = url.searchParams.get("status")?.trim() ?? "";
  const sort = url.searchParams.get("sort") ?? "updated_at";
  const order = url.searchParams.get("order") === "asc" ? true : false;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") ?? "25") || 25));
  const clientsOnly = url.searchParams.get("clients") === "1";

  let query = supabase
    .from("prospects")
    .select("*", { count: "exact" })
    .eq("user_id", user.id);

  if (clientsOnly) {
    query = query.eq("status", "Client");
  } else if (status) {
    query = query.eq("status", status);
  }

  if (q) {
    query = query.or(
      `club_name.ilike.%${q}%,contact_name.ilike.%${q}%,email.ilike.%${q}%,canton.ilike.%${q}%,sport.ilike.%${q}%`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const allowedSort = new Set([
    "club_name",
    "sport",
    "canton",
    "status",
    "last_action_at",
    "next_follow_up",
    "updated_at",
    "created_at",
  ]);
  const sortCol = allowedSort.has(sort) ? sort : "updated_at";

  const { data, error, count } = await query
    .order(sortCol, { ascending: order, nullsFirst: false })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    prospects: (data ?? []).map((p) => normalizeProspectFromDb(p as Record<string, unknown>)),
    total: count ?? 0,
    page,
    pageSize,
  });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const body = await request.json();

  try {
    await getOrCreateSettings(supabase, user.id);

    const { data, error } = await supabase
      .from("prospects")
      .insert(buildProspectInsertPayload(user.id, body))
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabase.from("prospect_activities").insert({
      user_id: user.id,
      prospect_id: data.id,
      action_type: "created",
      title: "Prospect créé",
    });

    return NextResponse.json({ prospect: normalizeProspectFromDb(data) }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Données invalides";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
