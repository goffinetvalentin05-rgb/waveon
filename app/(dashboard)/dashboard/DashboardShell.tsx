"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  const pathname = usePathname();
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
    const navCls = (href: string) =>
      pathname === href || pathname?.startsWith(`${href}/`)
        ? "font-semibold text-neutral-950"
        : "text-neutral-600 hover:text-neutral-950";

    return (
      <ToastProvider>
        <WavonProvider key={userId} userId={userId}>
          <div className={`flex min-h-screen flex-col ${wavonMainBg}`}>
            <header className="border-b border-neutral-200/90 bg-white/90 px-4 py-3 backdrop-blur-sm">
              <nav
                className={`${wavonPage} flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm`}
                aria-label="Accès limité"
              >
                <Link href="/dashboard/facturation" className={navCls("/dashboard/facturation")}>
                  Facturation
                </Link>
                <Link href="/dashboard/parametres" className={navCls("/dashboard/parametres")}>
                  Paramètres
                </Link>
              </nav>
              <p className={`${wavonPage} mt-2 text-center text-xs text-neutral-500`}>
                L’accès à l’agenda et aux fonctionnalités métier est suspendu jusqu’à la souscription d’un
                abonnement.
              </p>
            </header>
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
