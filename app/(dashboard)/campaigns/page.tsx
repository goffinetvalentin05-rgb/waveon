import { redirect } from "next/navigation";

export default function LegacyCampaignsRedirect() {
  redirect("/dashboard");
}

