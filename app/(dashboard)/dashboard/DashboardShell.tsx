"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ToastProvider } from "@/components/wavon/Toast";
import { useWavon, WavonProvider } from "@/components/wavon/WavonProvider";
import { canUsePremiumFeatures } from "@/lib/wavon/premium-access";
import { spinnerClass, wavonMainBg, wavonPage } from "@/lib/wavon/tokens";
import Sidebar from "./components/Sidebar";

function DashboardDiscoveryBanner() {
  const { ready, state } = useWavon();
  if (!ready) return null;
  if (canUsePremiumFeatures(state.workspaceAccess)) return null;

  return (
    <div className="mb-4 rounded-xl border border-neutral-200/90 bg-white/90 px-4 py-3 text-sm text-neutral-800 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="leading-relaxed">
          Vous découvrez Waevon.{" "}
          <span className="text-neutral-600">
            Activez une offre pour débloquer toutes les fonctionnalités (réservations, services, disponibilités…).
          </span>
        </p>
        <Link
          href="/dashboard/facturation#waevon-pricing"
          className="inline-flex shrink-0 justify-center rounded-full bg-neutral-950 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
        >
          Voir les offres
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
