import { type NextRequest, NextResponse } from "next/server";
import {
  sendNewBookingEmails,
  sendCancellationByMerchantEmails,
  sendCancellationByClientEmails,
} from "@/lib/emails/send";
import { billingGateResponseForBusinessId } from "@/lib/subscription/api-billing-guard";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, reservationId, businessId, reason } = body as {
      type: string;
      reservationId: string;
      businessId: string;
      reason?: string;
    };

    if (!type || !reservationId || !businessId) {
      return NextResponse.json(
        { error: "Paramètres manquants : type, reservationId, businessId requis." },
        { status: 400 }
      );
    }

    if (type !== "cancellation_by_client") {
      const blocked = await billingGateResponseForBusinessId(businessId);
      if (blocked) return blocked;
    }

    if (type === "new_booking") {
      await sendNewBookingEmails(reservationId, businessId);
    } else if (type === "cancellation_by_merchant") {
      await sendCancellationByMerchantEmails(reservationId, businessId, reason);
    } else if (type === "cancellation_by_client") {
      await sendCancellationByClientEmails(reservationId, businessId);
    } else {
      return NextResponse.json(
        { error: `Type inconnu : ${type}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/emails/send]", err);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }
}
