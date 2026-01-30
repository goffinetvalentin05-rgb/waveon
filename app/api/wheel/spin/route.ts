import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type Payload = {
  campaignId?: string;
  participationId?: string;
  clientToken?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const campaignId = body.campaignId?.trim();
    const participationId = body.participationId?.trim();
    const clientToken = body.clientToken?.trim();

    if (!campaignId || !participationId || !clientToken) {
      return NextResponse.json(
        { error: "Paramètres manquants." },
        { status: 400 }
      );
    }

    const supabase = createAdminSupabaseClient();

    const { data, error } = await supabase.rpc("spin_wheel", {
      p_campaign_id: campaignId,
      p_participation_id: participationId,
      p_client_token: clientToken,
    });

    if (error || !data || !data.length) {
      return NextResponse.json(
        { error: error?.message ?? "Tirage impossible." },
        { status: 400 }
      );
    }

    const result = data[0];
    return NextResponse.json({
      spinId: result.spin_id,
      wheelItemId: result.wheel_item_id,
      label: result.wheel_item_label,
      type: result.wheel_item_type,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Requête invalide." },
      { status: 400 }
    );
  }
}
