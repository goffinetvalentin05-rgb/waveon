import { redirect } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { OnboardingClient } from "./OnboardingClient";

type SearchParams = { [k: string]: string | string[] | undefined };

export default async function OnboardingPage(props: { searchParams: Promise<SearchParams> }) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : null;

  const supabase = await createServerComponentSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/onboarding");

  // Si déjà onboardé → dashboard
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_color, consent_terms_accepted_at")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.username && profile.consent_terms_accepted_at) {
    if (next === "create-league") redirect("/leagues/new");
    redirect("/dashboard");
  }

  const [teamsRes, playersRes, deadlineRes] = await Promise.all([
    supabase.from("teams").select("id, name, color, short_code").order("name"),
    supabase.from("players").select("id, full_name, team_id").order("full_name"),
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "tournament_predictions_deadline")
      .maybeSingle(),
  ]);

  const deadlineIso =
    (deadlineRes.data?.value as { deadline?: string | null } | null)?.deadline ?? null;
  const deadlinePassed = deadlineIso ? new Date(deadlineIso).getTime() < Date.now() : false;

  return (
    <OnboardingClient
      teams={teamsRes.data ?? []}
      players={playersRes.data ?? []}
      deadlineIso={deadlineIso}
      deadlinePassed={deadlinePassed}
      nextHint={next}
    />
  );
}
