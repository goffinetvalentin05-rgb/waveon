import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

/** Ancien module Entreprises : redirigé vers Prospects (même carnet). */
export default async function ProjectCompaniesRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/projects/${id}/prospects`);
}
