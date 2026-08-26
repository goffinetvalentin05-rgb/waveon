import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { AcceptInviteClient } from "@/components/projects/AcceptInviteClient";
import { isInviteToken } from "@/lib/auth/invite";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ welcome?: string }>;
};

export default async function InvitePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { welcome } = await searchParams;
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AcceptInviteClient
      token={isInviteToken(token) ? token : ""}
      signedIn={Boolean(user)}
      userEmail={user?.email ?? null}
      autoJoin={welcome === "1" && Boolean(user)}
    />
  );
}
