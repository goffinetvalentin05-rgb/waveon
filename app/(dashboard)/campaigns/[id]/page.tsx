import { redirect } from "next/navigation";

export default function LegacyCampaignDetailRedirect() {
  redirect("/dashboard");
}
