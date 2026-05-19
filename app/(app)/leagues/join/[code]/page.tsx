import { notFound, redirect } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { grantStarterCards } from "@/lib/pronoclash/league-creation";

type RouteParams = { code: string };

export default async function JoinByCodePage(props: { params: Promise<RouteParams> }) {
  const params = await props.params;
  const code = params.code.toUpperCase();

  const supabase = await createServerComponentSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/leagues/join/${code}`)}`);
  }

  const admin = createAdminSupabaseClient();
  const { data: league } = await admin
    .from("leagues")
    .select("id, slug, name, max_players, kind, status")
    .eq("invite_code", code)
    .maybeSingle();

  if (!league || league.status !== "active") notFound();

  // Vérifier capacité
  const { count } = await admin
    .from("league_members")
    .select("user_id", { count: "exact", head: true })
    .eq("league_id", league.id);

  if (count != null && count >= league.max_players) {
    redirect(`/leagues/${league.slug}?full=1`);
  }

  // Inscrire (idempotent)
  await admin
    .from("league_members")
    .upsert(
      { league_id: league.id, user_id: user.id, role: "member" },
      { onConflict: "league_id,user_id" }
    );

  // Octroyer le starter pack si ligue privée
  if (league.kind !== "global") {
    await grantStarterCards(admin, user.id, league.id);
  }

  redirect(`/leagues/${league.slug}?joined=1`);
}
