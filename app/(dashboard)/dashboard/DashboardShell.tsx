"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { ToastProvider } from "@/components/wavon/Toast";
import { WavonProvider } from "@/components/wavon/WavonProvider";
import Sidebar from "./components/Sidebar";

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
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-black text-white/70">
        <div
          className="h-9 w-9 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 motion-safe:animate-spin"
          aria-hidden
        />
        <p className="text-sm">Chargement de Wavon…</p>
      </div>
    );
  }

  return (
    <ToastProvider>
      <WavonProvider key={userId} userId={userId}>
        <div className="flex min-h-screen flex-col bg-black text-white lg:flex-row">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-10 lg:py-8">{children}</main>
        </div>
      </WavonProvider>
    </ToastProvider>
  );
}
