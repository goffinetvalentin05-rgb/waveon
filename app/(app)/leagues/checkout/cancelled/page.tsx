import { redirect } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { isLeaguePlanId } from "@/lib/stripe/config";
import { fetchAppShellProfile } from "@/lib/pronoclash/app-shell-profile";
import { CheckoutCancelledClient } from "./CheckoutCancelledClient";

type SearchParams = { [k: string]: string | string[] | undefined };

export default async function LeagueCheckoutCancelledPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await props.searchParams;
  const leagueId = typeof sp.league_id === "string" ? sp.league_id : null;

  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const shell = await fetchAppShellProfile();

  let league: { id: string; name: string; plan: string } | null = null;
  if (leagueId) {
    const { data } = await supabase
      .from("leagues")
      .select("id, name, plan, status, owner_id")
      .eq("id", leagueId)
      .maybeSingle();
    if (
      data &&
      data.owner_id === user.id &&
      (data.status === "pending_payment" || data.status === "cancelled")
    ) {
      league = { id: data.id, name: data.name, plan: data.plan ?? "" };
    }
  }

  const canRetry = Boolean(league?.plan && isLeaguePlanId(league.plan));

  return (
    <CheckoutCancelledClient
      username={shell.username}
      email={shell.email}
      isAdmin={shell.isAdmin}
      league={league}
      canRetry={canRetry}
    />
  );
}
