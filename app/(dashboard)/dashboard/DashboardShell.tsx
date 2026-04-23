"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ToastProvider } from "@/components/wavon/Toast";
import { useWavon, WavonProvider } from "@/components/wavon/WavonProvider";
import {
  computeTrialDayNumberForDisplay,
  trialBadgeHeadline,
  trialDaysLeftShortLabel,
} from "@/lib/subscription/workspace-access";
import { spinnerClass, wavonMainBg, wavonPage } from "@/lib/wavon/tokens";
import Sidebar from "./components/Sidebar";

function DashboardTrialBanner() {
  const { ready, state } = useWavon();
  if (!ready) return null;
  const a = state.workspaceAccess;
  if (!a?.hasAccess) return null;
  if (a.hasActiveSubscription) return null;
  if (!a.isTrialActive) return null;

  const urgent = a.daysLeft <= 1;
  const dLeft = Math.max(0, a.daysLeft);
  const dayNum = computeTrialDayNumberForDisplay(dLeft, a.isTrialActive);
  const headline = trialBadgeHeadline(dLeft, dayNum);
  const endLabel = a.trialEndsAt
    ? new Date(a.trialEndsAt).toLocaleDateString("fr-CH", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div
      className={`mb-4 rounded-xl border px-4 py-3 text-sm shadow-sm ${
        urgent
          ? "border-amber-300/90 bg-amber-50 text-amber-950"
          : "border-sky-200/90 bg-sky-50 text-sky-950"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">Essai gratuit en cours</p>
          <p className="mt-1 font-semibold tracking-tight">{headline}</p>
          <p className="mt-1 text-xs opacity-90">{trialDaysLeftShortLabel(a.daysLeft)}</p>
          {endLabel ? (
            <p className="mt-1 text-xs opacity-90">Fin le {endLabel}</p>
          ) : null}
        </div>
        <Link
          href="/dashboard/facturation#waevon-pricing"
          className={`inline-flex shrink-0 justify-center rounded-full px-4 py-2 text-xs font-semibold ${
            urgent
              ? "bg-amber-950 text-white hover:bg-amber-900"
              : "bg-sky-950 text-white hover:bg-sky-900"
          }`}
        >
          Voir les offres
        </Link>
      </div>
    </div>
  );
}

export default function DashboardShell({
  children,
  billingLocked = false,
}: {
  children: ReactNode;
  /** Pas d’abonnement actif : navigation limitée (facturation / paramètres). */
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
            <main className="min-w-0 flex-1 pb-12 pt-2 sm:pb-16 sm:pt-4 lg:pt-8">
              <div className={wavonPage}>
                <DashboardTrialBanner />
                {children}
              </div>
            </main>
          </div>
        </div>
      </WavonProvider>
    </ToastProvider>
  );
}
