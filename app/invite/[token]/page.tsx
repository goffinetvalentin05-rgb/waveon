import { redirect } from "next/navigation";
import { createServerComponentSupabase } from "@/lib/supabase/server-component";
import { AcceptInviteClient } from "@/components/projects/AcceptInviteClient";

type Props = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const supabase = await createServerComponentSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/invite/${encodeURIComponent(token)}`);
  }
  return <AcceptInviteClient token={token} />;
}
