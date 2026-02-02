"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Campaign, CampaignObjective, WheelItem } from "@/types/db";
import WheelPreview from "@/app/(dashboard)/dashboard/components/WheelPreview";

type SpinResult = {
  id: string;
  label: string;
  type: "win" | "lose";
};

type PublicCampaignClientProps = {
  campaign: Campaign;
  objective: CampaignObjective;
  targetUrl: string;
  wheelItems: WheelItem[];
  baseParticipations: number;
};

const objectiveConfig: Record<
  CampaignObjective,
  { label: string; cta: string; unlockCta: string }
> = {
  google: {
    label: "Avis Google",
    cta: "Laisser un avis Google",
    unlockCta: "Laisser un avis Google pour débloquer la roue",
  },
  instagram: {
    label: "Instagram",
    cta: "S'abonner sur Instagram",
    unlockCta: "S'abonner sur Instagram pour débloquer la roue",
  },
  facebook: {
    label: "Facebook",
    cta: "S'abonner sur Facebook",
    unlockCta: "S'abonner sur Facebook pour débloquer la roue",
  },
  tiktok: {
    label: "TikTok",
    cta: "S'abonner sur TikTok",
    unlockCta: "S'abonner sur TikTok pour débloquer la roue",
  },
};

function isValidReviewLink(url: string | null | undefined): boolean {
  const trimmed = typeof url === "string" ? url.trim() : "";
  return trimmed.length > 0;
}

export default function PublicCampaignClient({
  campaign,
  objective,
  targetUrl,
  wheelItems,
  baseParticipations = 100,
}: PublicCampaignClientProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [spinLoading, setSpinLoading] = useState(false);
  const [clientToken, setClientToken] = useState<string | null>(null);
  const [participationId, setParticipationId] = useState<string | null>(null);
  const [reviewValidated, setReviewValidated] = useState(false);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [isWheelUnlocked, setIsWheelUnlocked] = useState(false);
  const visitedRef = useRef(false);

  const reviewLinkValid = isValidReviewLink(targetUrl);

  useEffect(() => {
    const storedToken = window.localStorage.getItem("waevon_client_token");
    if (storedToken) {
      setClientToken(storedToken);
      return;
    }
    const newToken = crypto.randomUUID();
    window.localStorage.setItem("waevon_client_token", newToken);
    setClientToken(newToken);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(
      `waevon_wheel_unlocked_${campaign.id}`
    );
    if (stored === "true") {
      setIsWheelUnlocked(true);
    }
  }, [campaign.id]);

  useEffect(() => {
    const stored = window.localStorage.getItem(
      `waevon_participation_${campaign.id}`
    );
    if (stored) {
      setParticipationId(stored);
    }
  }, [campaign.id]);

  useEffect(() => {
    const stored = window.localStorage.getItem(
      `waevon_review_validated_${campaign.id}`
    );
    if (stored === "true") {
      setReviewValidated(true);
    }
  }, [campaign.id]);

  useEffect(() => {
    if (!clientToken || visitedRef.current) return;
    visitedRef.current = true;
    void fetch("/api/participations/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: campaign.id,
        clientToken,
      }),
    });
  }, [campaign.id, clientToken]);

  useEffect(() => {
    if (!clientToken) return;
    const loadSpinStatus = async () => {
      const response = await fetch("/api/wheel/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaign.id,
          clientToken,
        }),
      });
      const data = await response.json();
      if (data?.spin) {
        setSpinResult({
          id: data.spin.id,
          label: data.spin.label,
          type: data.spin.type,
        });
      }
    };

    void loadSpinStatus();
  }, [campaign.id, clientToken]);

  /**
   * Opens the review/link in a new tab ONLY on user click (sync, no await before open).
   * Then unlocks the wheel and creates participation in background.
   */
  const handleUnlockWheel = () => {
    if (!reviewLinkValid || !clientToken) {
      if (!reviewLinkValid) setActionError("Lien d'avis non configuré.");
      return;
    }
    setActionError(null);
    const url = targetUrl.trim();

    // 1. Open link immediately in the same user gesture (avoids popup blockers)
    window.open(url, "_blank", "noopener,noreferrer");

    // 2. Unlock wheel and persist
    setIsWheelUnlocked(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`waevon_wheel_unlocked_${campaign.id}`, "true");
    }

    // 3. Create participation in background (do not await before open)
    setActionLoading(true);
    fetch("/api/participations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: campaign.id,
        clientToken,
      }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data?.participationId) {
          setParticipationId(data.participationId);
          window.localStorage.setItem(
            `waevon_participation_${campaign.id}`,
            data.participationId
          );
        }
      })
      .finally(() => setActionLoading(false));
  };

  const handleReviewConfirm = async () => {
    if (!participationId || !clientToken) return;
    setReviewLoading(true);
    setActionError(null);

    const response = await fetch("/api/review/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participationId,
        clientToken,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setActionError(data?.error ?? "Validation impossible.");
      setReviewLoading(false);
      return;
    }

    setReviewValidated(Boolean(data?.validated));
    window.localStorage.setItem(
      `waevon_review_validated_${campaign.id}`,
      "true"
    );
    setReviewLoading(false);
  };

  const handleSpin = async () => {
    if (!participationId || !clientToken) return;
    setSpinLoading(true);
    setActionError(null);

    const response = await fetch("/api/wheel/spin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: campaign.id,
        participationId,
        clientToken,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      if (data?.error?.includes("ALREADY_SPUN")) {
        const statusResponse = await fetch("/api/wheel/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaignId: campaign.id,
            clientToken,
          }),
        });
        const statusData = await statusResponse.json();
        if (statusData?.spin) {
          setSpinResult({
            id: statusData.spin.id,
            label: statusData.spin.label,
            type: statusData.spin.type,
          });
        }
        setSpinLoading(false);
        return;
      }
      setActionError(data?.error ?? "Tirage impossible.");
      setSpinLoading(false);
      return;
    }

    setSpinResult({
      id: data.spinId,
      label: data.label,
      type: data.type,
    });
    setSpinLoading(false);
  };

  const branding = useMemo(() => {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        {campaign.logo_url ? (
          <img
            src={campaign.logo_url}
            alt={`Logo ${campaign.business_name}`}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : null}
        <h1 className="text-2xl font-semibold text-zinc-900">
          {campaign.business_name}
        </h1>
      </div>
    );
  }, [campaign.business_name, campaign.logo_url]);

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
        {branding}
        <p className="text-center text-sm text-zinc-600">
          Participez et tentez de gagner
        </p>

        {actionError ? (
          <div className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            {actionError}
          </div>
        ) : null}

        {!isWheelUnlocked ? (
          <div className="w-full space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="mb-4 text-center text-sm text-zinc-600">
                Cliquez sur le bouton ci-dessous pour ouvrir la page d’avis,
                puis la roue sera débloquée.
              </p>
              <button
                type="button"
                onClick={handleUnlockWheel}
                disabled={!reviewLinkValid || actionLoading}
                className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {actionLoading
                  ? "Ouverture..."
                  : objectiveConfig[objective].unlockCta}
              </button>
            </div>
            <div className="pointer-events-none select-none opacity-50">
              <WheelPreview
                items={wheelItems}
                baseParticipations={baseParticipations}
                size={200}
              />
            </div>
          </div>
        ) : (
          <>
            {spinResult ? (
              <div className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-center text-sm text-emerald-700">
                <p className="font-semibold">
                  {spinResult.type === "win"
                    ? "Bravo !"
                    : "Merci d'avoir joué !"}
                </p>
                <p className="mt-1">{spinResult.label}</p>
              </div>
            ) : (
              <div className="w-full space-y-3">
                {participationId ? (
                  <button
                    type="button"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-60"
                    onClick={handleReviewConfirm}
                    disabled={reviewLoading}
                  >
                    {reviewLoading
                      ? "Validation..."
                      : "J'ai laissé mon avis"}
                  </button>
                ) : null}

                {reviewValidated ? (
                  <button
                    type="button"
                    className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                    onClick={handleSpin}
                    disabled={spinLoading}
                  >
                    {spinLoading ? "Tirage..." : "Lancer la roue"}
                  </button>
                ) : (
                  <p className="text-xs text-zinc-400">
                    Validez votre avis pour lancer la roue.
                  </p>
                )}
              </div>
            )}

            <div className="w-full">
              <WheelPreview
                items={wheelItems}
                baseParticipations={baseParticipations}
                size={200}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
