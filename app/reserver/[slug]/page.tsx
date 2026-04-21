import { permanentRedirect } from "next/navigation";

type PageProps = { params: Promise<{ slug: string }> };

/** Redirection 308 (permanente) vers la nouvelle URL racine /{slug} */
export default async function LegacyReserverRedirect({ params }: PageProps) {
  const { slug } = await params;
  permanentRedirect(`/${encodeURIComponent(decodeURIComponent(slug))}`);
}
