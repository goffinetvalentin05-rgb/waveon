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

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, avatar_color, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.username && profile.onboarded_at) {
    if (next === "create-league") redirect("/leagues/new");
    redirect("/dashboard");
  }

  return <OnboardingClient nextHint={next} />;
}
