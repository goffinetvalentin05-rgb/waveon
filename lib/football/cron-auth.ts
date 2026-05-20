export function verifyCronSecret(req: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;

  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");
  if (querySecret && querySecret === expected) return true;

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token === expected) return true;
  }

  const headerSecret = req.headers.get("x-cron-secret");
  if (headerSecret && headerSecret === expected) return true;

  return false;
}
