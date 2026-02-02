"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Campaign, CampaignObjective, WheelItem } from "@/types/db";
import RewardWheel, { type WheelSegment } from "./RewardWheel";

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

const UNLOCK_DELAY_MS = 20 * 1000;

const DEFAULT_CTA: Record<
  CampaignObjective,
  { description: string; buttonLabel: string }
> = {
  google: {
    description: "Laissez un avis Google pour tourner la roue",
    buttonLabel: "Laisser un avis",
  },
  instagram: {
    description: "Suivez-nous sur Instagram pour tourner la roue",
    buttonLabel: "S'abonner sur Instagram",
  },
  facebook: {
    description: "Suivez-nous sur Facebook pour tourner la roue",
    buttonLabel: "S'abonner sur Facebook",
  },
  tiktok: {
    description: "Suivez-nous sur TikTok pour tourner la roue",
    buttonLabel: "S'abonner sur TikTok",
  },
};

function getCtaText(
  objective: CampaignObjective,
  customDescription?: string | null,
  customButtonLabel?: string | null
) {
  const defaults = DEFAULT_CTA[objective];
  return {
    description: customDescription?.trim() || defaults.description,
    buttonLabel: customButtonLabel?.trim() || defaults.buttonLabel,
  };
}

function isValidReviewLink(url: string | null | undefined): boolean {
  const trimmed = typeof url === "string" ? url.trim() : "";
  return trimmed.length > 0;
}

const STORAGE_KEYS = {
  wheelUnlocked: (campaignId: string) => `waevon_wheel_unlocked_${campaignId}`,
  reviewClickAt: (campaignId: string) => `waevon_review_click_at_${campaignId}`,
} as const;

function getRemainingDelayMs(campaignId: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEYS.reviewClickAt(campaignId));
  if (!raw) return null;
  const clickAt = Number(raw);
  if (!Number.isFinite(clickAt)) return null;
  const elapsed = Date.now() - clickAt;
  if (elapsed >= UNLOCK_DELAY_MS) return 0;
  return UNLOCK_DELAY_MS - elapsed;
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
  const [spinLoading, setSpinLoading] = useState(false);
  const [clientToken, setClientToken] = useState<string | null>(null);
  const [participationId, setParticipationId] = useState<string | null>(null);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [isWheelUnlocked, setIsWheelUnlocked] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [shouldAnimateSpin, setShouldAnimateSpin] = useState(false);
  const visitedRef = useRef(false);

  const reviewLinkValid = isValidReviewLink(targetUrl);

  const ctaText = useMemo(
    () =>
      getCtaText(
        objective,
        campaign.cta_description,
        campaign.cta_button_label
      ),
    [objective, campaign.cta_description, campaign.cta_button_label]
  );

  const segments: WheelSegment[] = useMemo(
    () =>
      wheelItems
        .filter((item) => item.is_active)
        .map((item) => ({ label: item.label, kind: item.kind })),
    [wheelItems]
  );

  const isInDelay =
    countdownSeconds != null && countdownSeconds > 0;

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
    const unlocked = window.localStorage.getItem(STORAGE_KEYS.wheelUnlocked(campaign.id));
    if (unlocked === "true") {
      setIsWheelUnlocked(true);
      setCountdownSeconds(null);
      return;
    }
    const remainingMs = getRemainingDelayMs(campaign.id);
    if (remainingMs === null) {
      setCountdownSeconds(null);
      return;
    }
    if (remainingMs <= 0) {
      setIsWheelUnlocked(true);
      window.localStorage.setItem(STORAGE_KEYS.wheelUnlocked(campaign.id), "true");
      setCountdownSeconds(null);
      return;
    }
    setCountdownSeconds(Math.ceil(remainingMs / 1000));
  }, [campaign.id]);

  useEffect(() => {
    if (countdownSeconds == null || countdownSeconds <= 0) return;
    const id = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev == null || prev <= 1) {
          setIsWheelUnlocked(true);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEYS.wheelUnlocked(campaign.id), "true");
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [campaign.id, countdownSeconds]);

  useEffect(() => {
    const stored = window.localStorage.getItem(
      `waevon_participation_${campaign.id}`
    );
    if (stored) {
      setParticipationId(stored);
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
   * Stores review_click_at and starts countdown; wheel unlocks after REVIEW_DELAY_MS.
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

    // 2. Store timestamp and start countdown (wheel unlocks after delay)
    const clickAt = Date.now();
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEYS.reviewClickAt(campaign.id), String(clickAt));
    }
    setCountdownSeconds(Math.ceil(UNLOCK_DELAY_MS / 1000));

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

  const handleSpinClick = async () => {
    if (!clientToken) {
      setActionError("Session invalide. Rechargez la page et réessayez.");
      return;
    }
    setSpinLoading(true);
    setActionError(null);

    const response = await fetch("/api/wheel/spin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: campaign.id,
        participationId: participationId || undefined,
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
      const errMsg = data?.error?.includes("POOL_EMPTY")
        ? "Plus de lots disponibles."
        : data?.error?.includes("WHEEL_NOT_FOUND")
          ? "Cette roue n'est plus active."
          : null;
      if (errMsg) setActionError(errMsg);
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

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{
        background:
          "linear-gradient(160deg, #f0f4ff 0%, #e8eeff 40%, #f8fafc 100%)",
      }}
    >
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-8">
        <header className="flex flex-col items-center gap-2 text-center">
          {campaign.logo_url ? (
            <img
              src={campaign.logo_url}
              alt=""
              className="h-14 w-14 rounded-full border-2 border-white object-cover shadow-md"
            />
          ) : null}
          <h1 className="text-xl font-semibold text-zinc-900">
            {campaign.business_name}
          </h1>
          <p className="text-xs text-zinc-500">
            Proposé par {campaign.business_name}
          </p>
        </header>

        {actionError ? (
          <div className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
            {actionError}
          </div>
        ) : null}

        {!isWheelUnlocked ? (
          <div className="w-full space-y-6">
            <div className="relative flex flex-col items-center" style={{ filter: "brightness(0.92)" }}>
              <RewardWheel
                segments={segments}
                size={260}
                businessName={campaign.business_name}
                logoUrl={campaign.logo_url}
                resultLabel={null}
              />
            </div>
            <div className="w-full space-y-3 text-center">
              <p className="text-sm text-zinc-600">
                {isInDelay ? "Préparation de la roue…" : ctaText.description}
              </p>
              {!isInDelay ? (
                <button
                  type="button"
                  onClick={handleUnlockWheel}
                  disabled={!reviewLinkValid || actionLoading}
                  className="w-full rounded-xl bg-zinc-900 px-5 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-60"
                >
                  {actionLoading ? "Ouverture…" : ctaText.buttonLabel}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div className="w-full flex flex-col items-center">
              <RewardWheel
                segments={segments}
                size={280}
                businessName={campaign.business_name}
                logoUrl={campaign.logo_url}
                resultLabel={spinResult?.label ?? null}
                animateSpin={shouldAnimateSpin}
                onSpinEnd={() => setShouldAnimateSpin(false)}
              />
            </div>
            {spinResult ? (
              <div
                className={`w-full overflow-hidden rounded-2xl border-2 px-6 py-5 text-center shadow-lg ${
                  spinResult.type === "win"
                    ? "border-emerald-300 bg-emerald-50 animate-[pulse_1.5s_ease-in-out_2]"
                    : "border-zinc-200 bg-white"
                }`}
              >
                <p className="text-lg font-bold text-zinc-900">
                  {spinResult.type === "win" ? "Bravo !" : "Merci d'avoir joué !"}
                </p>
                <p className="mt-2 text-base font-medium text-zinc-700">
                  {spinResult.label}
                </p>
              </div>
            ) : (
              <div className="w-full space-y-3 text-center">
                <p className="text-sm text-zinc-600">Cliquez pour lancer la roue.</p>
                <button
                  type="button"
                  onClick={() => {
                    setShouldAnimateSpin(true);
                    void handleSpinClick();
                  }}
                  disabled={spinLoading}
                  className="w-full rounded-xl bg-indigo-600 px-5 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-60"
                >
                  {spinLoading ? "Tirage…" : "Tourner la roue"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
