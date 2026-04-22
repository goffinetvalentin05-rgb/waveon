"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ToastProvider } from "@/components/wavon/Toast";
import { WavonProvider } from "@/components/wavon/WavonProvider";
import { spinnerClass, wavonMainBg, wavonPage } from "@/lib/wavon/tokens";
import Sidebar from "./components/Sidebar";
import TrialBanner from "./components/TrialBanner";

export default function DashboardShell({
  children,
  billingLocked = false,
}: {
  children: ReactNode;
  /** Essai expiré / pas d’abonnement : pas de navigation SaaS (page facturation seule). */
  billingLocked?: boolean;
}) {
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

  if (billingLocked) {
    return (
      <ToastProvider>
        <WavonProvider key={userId} userId={userId}>
          <div className={`flex min-h-screen flex-col ${wavonMainBg}`}>
            <main className="min-w-0 flex-1 pb-12 pt-2 sm:pb-16 sm:pt-4">
              <div className={wavonPage}>{children}</div>
            </main>
          </div>
        </WavonProvider>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <WavonProvider key={userId} userId={userId}>
        <div className={`flex min-h-screen flex-col lg:flex-row ${wavonMainBg}`}>
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <TrialBanner />
            <main className="min-w-0 flex-1 pb-12 pt-2 sm:pb-16 sm:pt-4 lg:pt-8">
              <div className={wavonPage}>{children}</div>
            </main>
          </div>
        </div>
      </WavonProvider>
    </ToastProvider>
  );
}
