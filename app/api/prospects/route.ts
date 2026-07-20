import { NextResponse } from "next/server";
import { getOrCreateSettings, requireUser } from "@/lib/crm/server";
import { parseProspectsCsv } from "@/lib/crm/csv";

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
    prospects: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;

  const contentType = request.headers.get("content-type") ?? "";

  // Import CSV
  if (contentType.includes("text/csv") || contentType.includes("multipart/form-data")) {
    let text = "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
      }
      text = await file.text();
    } else {
      text = await request.text();
    }

    const { rows, errors } = parseProspectsCsv(text);
    if (!rows.length) {
      return NextResponse.json(
        { error: errors[0] ?? "Aucune ligne valide", errors },
        { status: 400 }
      );
    }

    const payload = rows.map((r) => ({
      user_id: user.id,
      name: r.club_name,
      club_name: r.club_name,
      sport: r.sport,
      canton: r.canton,
      contact_name: r.contact_name,
      phone: r.phone,
      email: r.email,
      website: r.website,
      status: "À contacter",
      last_action: "Importé",
      last_action_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase.from("prospects").insert(payload).select("id, club_name");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data?.length) {
      await supabase.from("prospect_activities").insert(
        data.map((p) => ({
          user_id: user.id,
          prospect_id: p.id,
          action_type: "imported",
          title: "Prospect importé",
        }))
      );
    }

    return NextResponse.json({
      imported: data?.length ?? 0,
      errors,
    });
  }

  // Create single prospect
  const body = await request.json();
  const club_name = String(body.club_name ?? "").trim();
  if (!club_name) {
    return NextResponse.json({ error: "Nom du club requis" }, { status: 400 });
  }

  await getOrCreateSettings(supabase, user.id);

  const { data, error } = await supabase
    .from("prospects")
    .insert({
      user_id: user.id,
      name: club_name,
      club_name,
      sport: body.sport?.trim() || null,
      canton: body.canton?.trim() || null,
      contact_name: body.contact_name?.trim() || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      website: body.website?.trim() || null,
      notes: body.notes?.trim() || null,
      status: "À contacter",
      last_action: "Créé",
      last_action_at: new Date().toISOString(),
    })
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

  return NextResponse.json({ prospect: data }, { status: 201 });
}
