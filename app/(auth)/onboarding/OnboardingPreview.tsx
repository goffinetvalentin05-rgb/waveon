"use client";

import RewardWheel, { type WheelSegment } from "@/app/(public)/[slug]/RewardWheel";

type OnboardingPreviewProps = {
  businessName: string;
  logoPreviewUrl: string | null;
  segments: WheelSegment[];
  primaryColor: string;
  secondaryColor: string;
  backgroundStyle: "gradient" | "solid";
};

export default function OnboardingPreview({
  businessName,
  logoPreviewUrl,
  segments,
  primaryColor,
  secondaryColor,
  backgroundStyle,
}: OnboardingPreviewProps) {
  const bg =
    backgroundStyle === "gradient"
      ? "linear-gradient(160deg, #f0f4ff 0%, #e8eeff 40%, #f8fafc 100%)"
      : "#f8fafc";

  return (
    <div
      className="mx-auto w-full max-w-[375px] overflow-hidden rounded-2xl border-2 border-zinc-200 bg-white shadow-xl"
      style={{ minHeight: 560 }}
    >
      <div
        className="flex min-h-[560px] flex-col px-4 py-6"
        style={{ background: bg }}
      >
        <header className="flex flex-col items-center gap-2 text-center">
          {logoPreviewUrl ? (
            <img
              src={logoPreviewUrl}
              alt=""
              className="h-14 w-14 rounded-full border-2 border-white object-cover shadow-md"
            />
          ) : null}
          <h1 className="text-xl font-semibold text-zinc-900">{businessName}</h1>
          <p className="text-xs text-zinc-500">Proposé par {businessName}</p>
        </header>

        <div className="mt-6 flex flex-1 flex-col items-center gap-6">
          <div className="relative flex flex-col items-center" style={{ filter: "brightness(0.92)" }}>
            <RewardWheel
              segments={segments}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              size={240}
              businessName={businessName}
              logoUrl={logoPreviewUrl}
              resultLabel={null}
            />
          </div>
          <div className="w-full space-y-3 text-center">
            <p className="text-sm text-zinc-600">
              Tentez votre chance en laissant un avis.
            </p>
            <div className="rounded-xl bg-zinc-900 px-5 py-3.5 text-center text-base font-semibold text-white">
              Laisser un avis Google pour jouer
            </div>
          </div>
        </div>
      </div>
      <p className="border-t border-zinc-100 bg-zinc-50 px-3 py-2 text-center text-[10px] text-zinc-400">
        Aperçu – ce que verront vos clients
      </p>
    </div>
  );
}
