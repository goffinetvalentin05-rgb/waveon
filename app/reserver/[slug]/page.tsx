import PublicBookingClient from "./PublicBookingClient";

type PageProps = { params: Promise<{ slug: string }> };

export default async function PublicBookingPage({ params }: PageProps) {
  const { slug } = await params;
  return <PublicBookingClient slug={decodeURIComponent(slug)} />;
}
