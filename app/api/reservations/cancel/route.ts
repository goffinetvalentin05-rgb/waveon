import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { sendCancellationByClientEmails } from "@/lib/emails/send";

type Body = {
  reservationId: string;
  businessId: string;
  token: string;
};

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return badRequest("Body JSON invalide.");
  }

  const reservationId = String(body.reservationId ?? "").trim();
  const businessId = String(body.businessId ?? "").trim();
  const token = String(body.token ?? "").trim();

  if (!reservationId || !businessId || !token) {
    return badRequest("Paramètres manquants : reservationId, businessId, token requis.");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY manquante." },
      { status: 503 }
    );
  }

  try {
    const admin = createAdminSupabaseClient();

    const { data: settings, error: sErr } = await admin
      .from(WavonDbTable.settings)
      .select("allow_cancellation,cancellation_deadline_hours")
      .eq("business_id", businessId)
      .maybeSingle();
    if (sErr) throw sErr;

    if (settings && settings.allow_cancellation === false) {
      return NextResponse.json(
        { ok: false, error: "L’annulation n’est pas autorisée pour ce prestataire." },
        { status: 403 }
      );
    }

    const { data: res, error: rErr } = await admin
      .from(WavonDbTable.reservations)
      .select("id,status,start_at,cancel_token")
      .eq("id", reservationId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (rErr) throw rErr;
    if (!res) {
      return NextResponse.json(
        { ok: false, error: "Réservation introuvable." },
        { status: 404 }
      );
    }

    if (res.status === "cancelled") {
      return NextResponse.json({ ok: true });
    }

    if (!res.cancel_token || res.cancel_token !== token) {
      return NextResponse.json(
        { ok: false, error: "Lien d’annulation invalide ou expiré." },
        { status: 403 }
      );
    }

    const deadlineHours = Number(settings?.cancellation_deadline_hours ?? 0) || 0;
    if (deadlineHours > 0) {
      const start = new Date(String(res.start_at));
      const now = new Date();
      const diffMs = start.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (Number.isFinite(diffHours) && diffHours < deadlineHours) {
        return NextResponse.json(
          { ok: false, error: `Annulation impossible à moins de ${deadlineHours}h du rendez-vous.` },
          { status: 403 }
        );
      }
    }

    const { error: uErr } = await admin
      .from(WavonDbTable.reservations)
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", reservationId)
      .eq("business_id", businessId)
      .eq("status", res.status);
    if (uErr) throw uErr;

    // Emails: client + prestataire (best-effort)
    await sendCancellationByClientEmails(reservationId, businessId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/reservations/cancel]", err);
    return NextResponse.json(
      { ok: false, error: "Erreur interne." },
      { status: 500 }
    );
  }
}

