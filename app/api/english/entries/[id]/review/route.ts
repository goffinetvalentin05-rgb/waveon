import { NextResponse } from "next/server";
import { requireUser } from "@/lib/crm/server";
import { applyReviewAction } from "@/lib/english/srs";
import {
  ENGLISH_REVIEW_ACTIONS,
  type EnglishReviewAction,
} from "@/lib/english/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireUser();
  if (auth.response) return auth.response;
  const { supabase, user } = auth;
  const { id } = await ctx.params;
  const body = await request.json();
  const action = String(body?.action ?? "") as EnglishReviewAction;

  if (!ENGLISH_REVIEW_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: "Action invalide (know, review, hard)" },
      { status: 400 }
    );
  }

  const { data: entry, error: fetchErr } = await supabase
    .from("english_entries")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!entry) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const patch = applyReviewAction(action, entry.review_level ?? 0);
  const { data, error } = await supabase
    .from("english_entries")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data });
}
