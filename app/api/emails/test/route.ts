import { type NextRequest, NextResponse } from "next/server";
import { render } from "@react-email/render";
import { getResend, EMAIL_FROM } from "@/lib/resend";
import ConfirmationClient from "@/lib/emails/templates/confirmation-client";
import NotificationMerchant from "@/lib/emails/templates/notification-merchant";
import CancellationClient from "@/lib/emails/templates/cancellation-client";

// Route de test uniquement disponible en développement.
// Usage : GET /api/emails/test?type=confirmation&to=ton@email.com

const MOCK = {
  businessName: "Salon Élise",
  clientName: "Marie Dupont",
  serviceName: "Coupe femme",
  date: "lundi 21 avril 2026",
  time: "14h30",
  durationMin: 45,
  priceCHF: "CHF 45.00",
  address: "12 rue des Acacias, 1201 Genève",
  phone: "+41 22 000 00 00",
  clientEmail: "marie@exemple.com",
  clientPhone: "+41 76 000 00 00",
  dashboardUrl: "http://localhost:3000/dashboard/reservations",
};

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Non disponible en production." },
      { status: 403 }
    );
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY manquante dans .env.local" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "confirmation";
  const to = searchParams.get("to");

  if (!to) {
    return NextResponse.json(
      { error: "Paramètre ?to=email requis." },
      { status: 400 }
    );
  }

  try {
    const resend = getResend();
    let html: string;
    let subject: string;

    if (type === "notification") {
      html = await render(
        NotificationMerchant({
          businessName: MOCK.businessName,
          clientName: MOCK.clientName,
          clientEmail: MOCK.clientEmail,
          clientPhone: MOCK.clientPhone,
          serviceName: MOCK.serviceName,
          date: MOCK.date,
          time: MOCK.time,
          durationMin: MOCK.durationMin,
          dashboardUrl: MOCK.dashboardUrl,
          isPending: false,
        })
      );
      subject = `[TEST] Nouvelle réservation de ${MOCK.clientName}`;
    } else if (type === "cancellation") {
      html = await render(
        CancellationClient({
          businessName: MOCK.businessName,
          clientName: MOCK.clientName,
          serviceName: MOCK.serviceName,
          date: MOCK.date,
          time: MOCK.time,
          phone: MOCK.phone,
          reason: "Indisponibilité imprévue du prestataire.",
        })
      );
      subject = `[TEST] Réservation annulée chez ${MOCK.businessName}`;
    } else {
      html = await render(
        ConfirmationClient({
          businessName: MOCK.businessName,
          clientName: MOCK.clientName,
          serviceName: MOCK.serviceName,
          date: MOCK.date,
          time: MOCK.time,
          durationMin: MOCK.durationMin,
          priceCHF: MOCK.priceCHF,
          address: MOCK.address,
          phone: MOCK.phone,
          isPending: false,
        })
      );
      subject = `[TEST] Réservation confirmée chez ${MOCK.businessName}`;
    }

    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    });

    return NextResponse.json({ ok: true, id: result.data?.id });
  } catch (err) {
    console.error("[api/emails/test]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
