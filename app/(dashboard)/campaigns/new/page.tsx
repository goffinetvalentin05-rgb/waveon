"use client";

import { useRouter } from "next/navigation";
import CampaignWizard from "../../dashboard/components/CampaignWizard";
import Sidebar from "../../dashboard/components/Sidebar";

export default function NewCampaignPage() {
  const router = useRouter();

  return (
    <div className="relative flex min-h-screen bg-[#0b0b16] text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.22),transparent_60%)]" />
        <div className="absolute right-[-180px] top-24 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.16),transparent_70%)] blur-[180px]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>
      <Sidebar />

      <main className="relative flex-1 px-6 py-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Nouvelle campagne
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">
              Lancer une campagne
            </h1>
          </div>
        </header>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.35)]">
          <CampaignWizard
            onCreated={() => router.push("/dashboard")}
            onCancel={() => router.push("/dashboard")}
          />
        </section>
      </main>
    </div>
  );
}

