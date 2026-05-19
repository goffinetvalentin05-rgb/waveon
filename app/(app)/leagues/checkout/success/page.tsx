import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { ui } from "@/lib/design/tokens";

type SearchParams = { [k: string]: string | string[] | undefined };

export default async function LeagueCheckoutSuccessPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await props.searchParams;
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : null;
  if (!sessionId) redirect("/dashboard");

  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminSupabaseClient();

  for (let i = 0; i < 24; i++) {
    const res = await admin
      .from("leagues")
      .select("slug, status")
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();
    if (res.data?.status === "active") {
      redirect(`/leagues/${res.data.slug}`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className={`${ui.glowCard} p-8 text-center`}>
        <div className="mx-auto inline-flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white">
          <span className="text-2xl" aria-hidden>
            ⏳
          </span>
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold text-white">
          Paiement reçu
        </h1>
        <p className="mt-3 text-sm text-white/65">
          On active ta ligue… Cette page se mettra à jour dans quelques secondes.
        </p>
        <Link
          href="/dashboard"
          className={`${ui.btnSecondary} mt-6 inline-flex`}
        >
          Retour au dashboard
        </Link>
      </div>
    </div>
  );
}
