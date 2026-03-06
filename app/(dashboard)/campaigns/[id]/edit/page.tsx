import { redirect } from "next/navigation";

export default function LegacyCampaignEditRedirect() {
  redirect("/dashboard");
}
