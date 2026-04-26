"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ToastProvider } from "@/components/wavon/Toast";
import { useWavon, WavonProvider } from "@/components/wavon/WavonProvider";
import type { EffectiveSubscription } from "@/lib/subscription/effective-subscription";
import { canUsePremiumFeatures } from "@/lib/wavon/premium-access";
import type { WorkspaceAccessSummary, WorkspaceTrialInfo } from "@/lib/wavon/types";
import { spinnerClass, wavonMainBg, wavonPage } from "@/lib/wavon/tokens";
import Sidebar from "./components/Sidebar";

function isTrialUser(access: WorkspaceAccessSummary | null | undefined, eff: EffectiveSubscription | null | undefined) {
  if (!access?.trialInfo) return false;
  return eff?.status === "trialing" && Boolean(eff?.canUseServices);
}

function DashboardTrialInfoBanner() {
  const { ready, state } = useWavon();
  if (!ready) return null;
  const a = state.workspaceAccess;
  const t = a?.trialInfo as WorkspaceTrialInfo | null | undefined;
  if (!t?.daysRemaining) return null;
  if (!isTrialUser(a, a?.effective ?? null)) return null;
  return (
    <div className="mb-3 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-2.5 text-sm text-emerald-950">
      <p className="font-medium">
        {t.daysRemaining === 1
          ? "Essai gratuit — 1 jour restant"
          : `Essai gratuit — ${t.daysRemaining} jours restants`}
      </p>
    </div>
  );
}

function DashboardDiscoveryBanner() {
  const { ready, state } = useWavon();
  if (!ready) return null;
  if (canUsePremiumFeatures(state.workspaceAccess)) return null;

  return (
    <div className="mb-4 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="leading-relaxed">
          Ton essai est terminé. Passe à un abonnement pour continuer à gérer réservations, services et disponibilités.
        </p>
        <Link
          href="/pricing"
          className="inline-flex shrink-0 justify-center rounded-full bg-neutral-950 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
        >
          S&rsquo;abonner
        </Link>
      </div>
    </div>
  );
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      setUserId(data.session.user.id);
      setAuthChecked(true);
    })();
  }, [router]);

  if (!authChecked || !userId) {
    return (
      <div
        className={`flex min-h-screen flex-col items-center justify-center gap-4 ${wavonMainBg} text-neutral-500`}
      >
        <div className={spinnerClass} aria-hidden />
        <p className="text-sm font-medium text-neutral-600">Chargement…</p>
      </div>
    );
  }

  return (
    <ToastProvider>
      <WavonProvider key={userId} userId={userId}>
        <div className={`flex min-h-screen flex-col lg:flex-row ${wavonMainBg}`}>
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="min-w-0 flex-1 pb-12 pt-2 sm:pb-16 sm:pt-4 lg:pt-8">
              <div className={wavonPage}>
                <DashboardTrialInfoBanner />
                <DashboardDiscoveryBanner />
                {children}
              </div>
            </main>
          </div>
        </div>
      </WavonProvider>
    </ToastProvider>
  );
}
