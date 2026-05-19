import { NextResponse } from "next/server";

/** @deprecated Utiliser POST /api/stripe/create-league-checkout */
export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { plan?: unknown; leagueName?: unknown; league_name?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const league_name =
    typeof body.league_name === "string"
      ? body.league_name
      : typeof body.leagueName === "string"
        ? body.leagueName
        : undefined;

  const origin = new URL(req.url).origin;
  const res = await fetch(`${origin}/api/stripe/create-league-checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") ?? "",
    },
    body: JSON.stringify({ plan: body.plan, league_name }),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
