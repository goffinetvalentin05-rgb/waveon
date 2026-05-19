import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { isLeaguePlanId } from "@/lib/stripe/config";
import { ui } from "@/lib/design/tokens";
import { RetryPaymentButton } from "./RetryPaymentButton";

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

  let league: { id: string; name: string; plan: string | null; status: string } | null = null;
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
      league = { id: data.id, name: data.name, plan: data.plan, status: data.status };
    }
  }

  const canRetry = league && league.plan && isLeaguePlanId(league.plan);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className={`${ui.glassCard} space-y-5 p-6 sm:p-8`}>
        <h1 className="font-display text-2xl font-semibold text-white">Paiement annulé</h1>
        <p className="text-sm text-white/65">
          {league
            ? `Ta ligue « ${league.name} » n'a pas encore été activée. Tu peux relancer le paiement ou en créer une nouvelle.`
            : "Tu n'as pas finalisé le paiement. Aucune ligue n'a été activée."}
        </p>
        {canRetry && league ? (
          <RetryPaymentButton
            leagueId={league.id}
            plan={league.plan!}
            leagueName={league.name}
          />
        ) : null}
        <Link href="/leagues/new" className={`${ui.btnSecondary} inline-flex w-full justify-center`}>
          Créer une nouvelle ligue
        </Link>
      </div>
    </div>
  );
}
