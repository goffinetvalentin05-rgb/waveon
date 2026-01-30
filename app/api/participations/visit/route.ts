import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type Payload = {
  campaignId?: string;
  clientToken?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const campaignId = body.campaignId?.trim();
    const clientToken = body.clientToken?.trim();

    if (!campaignId || !clientToken) {
      return NextResponse.json(
        { error: "Paramètres manquants." },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    await supabase.from("participations").insert({
      campaign_id: campaignId,
      event_type: "visit",
      client_token: clientToken,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Requête invalide." },
      { status: 400 }
    );
  }
}
