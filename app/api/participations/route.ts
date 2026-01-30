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

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id,is_active")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: "Campagne introuvable." },
        { status: 404 }
      );
    }

    if (!campaign.is_active) {
      return NextResponse.json(
        { error: "Campagne inactive." },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from("participations")
      .insert({
        campaign_id: campaignId,
        event_type: "action",
        client_token: clientToken,
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Création impossible." },
        { status: 500 }
      );
    }

    return NextResponse.json({ participationId: data.id });
  } catch (error) {
    return NextResponse.json(
      { error: "Requête invalide." },
      { status: 400 }
    );
  }
}
