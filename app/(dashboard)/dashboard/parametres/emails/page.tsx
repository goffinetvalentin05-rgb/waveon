import { redirect } from "next/navigation";

export default function ParametresEmailsRedirectPage() {
  redirect("/dashboard/parametres?tab=emails");
}
