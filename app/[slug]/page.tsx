import PublicBookingClient from "../reserver/[slug]/PublicBookingClient";

type PageProps = { params: Promise<{ slug: string }> };

export default async function PublicBookingBySlugPage({ params }: PageProps) {
  const { slug } = await params;
  return <PublicBookingClient slug={decodeURIComponent(slug)} />;
}
