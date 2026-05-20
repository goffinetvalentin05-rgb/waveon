import { notFound, redirect } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { getAppBaseUrl } from "@/lib/brand/config";
import { AppSecondaryPage } from "@/components/pronoclash/AppSecondaryPage";
import { fetchAppShellProfile } from "@/lib/pronoclash/app-shell-profile";
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

  const shell = await fetchAppShellProfile();

  return (
    <AppSecondaryPage
      pageTitle="Inviter ta ligue"
      username={shell.username}
      email={shell.email}
      isAdmin={shell.isAdmin}
    >
      <p className="pc-eyebrow">WhatsApp</p>
      <p className="pc-body-text" style={{ marginTop: 0 }}>
        Un clic, un lien, et tes potes rejoignent <strong style={{ color: "var(--pc-text)" }}>{league.name}</strong>.
      </p>
      <InviteCard leagueName={league.name} inviteUrl={inviteUrl} />
    </AppSecondaryPage>
  );
}
