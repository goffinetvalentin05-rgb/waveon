/** Chemin relatif de la page de réservation publique (sans /reserver). */
export function publicBookingPath(slug: string): string {
  const s = slug.trim();
  if (!s) return "";
  return `/${encodeURIComponent(s)}`;
}

export function publicBookingAbsoluteUrl(slug: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://waevon.com").replace(/\/$/, "");
  return `${base}${publicBookingPath(slug)}`;
}
