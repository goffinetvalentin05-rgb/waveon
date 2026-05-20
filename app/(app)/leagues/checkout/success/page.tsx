import { redirect } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { fetchAppShellProfile } from "@/lib/pronoclash/app-shell-profile";
import { CheckoutSuccessPageClient } from "./CheckoutSuccessPageClient";

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

  const shell = await fetchAppShellProfile();
  const admin = createAdminSupabaseClient();
  const { data: league } = await admin
    .from("leagues")
    .select("slug, status, name")
    .eq("stripe_checkout_session_id", sessionId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (league?.status === "active" && league.slug) {
    redirect(`/leagues/${league.slug}`);
  }

  return (
    <CheckoutSuccessPageClient
      sessionId={sessionId}
      initialSlug={league?.slug ?? null}
      initialStatus={league?.status ?? null}
      initialName={league?.name ?? null}
      username={shell.username}
      email={shell.email}
      isAdmin={shell.isAdmin}
    />
  );
}
