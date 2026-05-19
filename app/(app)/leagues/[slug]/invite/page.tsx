import { notFound, redirect } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { getAppBaseUrl } from "@/lib/brand/config";
import { InviteCard } from "./InviteCard";

type RouteParams = { slug: string };

export default async function InvitePage(props: { params: Promise<RouteParams> }) {
  const params = await props.params;
  const supabase = await createServerComponentSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: league } = await supabase
    .from("leagues")
    .select("id, slug, name, kind, owner_id, invite_code")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!league || league.kind === "global") notFound();
  if (league.owner_id !== user.id) {
    redirect(`/leagues/${league.slug}`);
  }

  const baseUrl = getAppBaseUrl();
  const inviteUrl = league.invite_code
    ? `${baseUrl}/leagues/join/${league.invite_code}`
    : `${baseUrl}/leagues/${league.slug}`;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/80">
          Inviter ta ligue
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
          Lance ton groupe WhatsApp
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Un clic, un lien, et tes potes rejoignent {league.name}.
        </p>
      </header>
      <InviteCard leagueName={league.name} inviteUrl={inviteUrl} />
    </div>
  );
}
