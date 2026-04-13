const KEY = (slug: string) => `wavon:slug-owner:${slug.trim().toLowerCase()}`;

export function rememberSlugOwner(slug: string, userId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY(slug), userId);
  } catch {
    /* ignore */
  }
}

export function readSlugOwner(slug: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY(slug));
}
