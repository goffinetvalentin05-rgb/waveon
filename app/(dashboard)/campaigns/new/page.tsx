import { redirect } from "next/navigation";

export default function LegacyNewCampaignRedirect() {
  redirect("/dashboard");
}
