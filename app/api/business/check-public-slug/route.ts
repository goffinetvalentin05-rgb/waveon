import { NextResponse, type NextRequest } from "next/server";
import { createRouteHandlerSupabase } from "@/lib/supabase/route-handler";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { normalizePublicSlugInput, validatePublicSlugFormat } from "@/lib/wavon/public-slug";

/**
 * Vérifie si un `public_slug` est disponible pour le business du user connecté.
 * Utilise le service role pour contourner la RLS (les merchants ne voient pas les autres lignes).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerSupabase();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
    }

    const slugParam = req.nextUrl.searchParams.get("slug") ?? "";
    const formatted = validatePublicSlugFormat(normalizePublicSlugInput(slugParam));
    if (!formatted.ok) {
      return NextResponse.json({
        ok: true,
        validFormat: false,
        available: false,
        error: formatted.error,
      });
    }
    const slug = formatted.slug;

    const { data: myBiz, error: bizErr } = await supabase
      .from(WavonDbTable.businesses)
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (bizErr || !myBiz) {
      return NextResponse.json({ ok: false, error: "Business introuvable." }, { status: 400 });
    }
    const myId = (myBiz as { id: string }).id;

    const admin = createAdminSupabaseClient();
    const { data: taken, error: qErr } = await admin
      .from(WavonDbTable.businesses)
      .select("id")
      .eq("public_slug", slug)
      .neq("id", myId)
      .maybeSingle();

    if (qErr) {
      return NextResponse.json({ ok: false, error: qErr.message }, { status: 500 });
    }

    const available = taken === null;
    return NextResponse.json({
      ok: true,
      validFormat: true,
      available,
      slug,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
