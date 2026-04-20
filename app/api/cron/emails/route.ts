import { NextResponse, type NextRequest } from "next/server";
import { runScheduledEmails } from "@/lib/emails/scheduled-send";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  const header = req.headers.get("x-cron-secret") ?? "";

  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET manquante." },
      { status: 503 }
    );
  }
  if (header !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await runScheduledEmails();
    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error("[api/cron/emails]", e);
    return NextResponse.json({ ok: false, error: "Erreur interne." }, { status: 500 });
  }
}

