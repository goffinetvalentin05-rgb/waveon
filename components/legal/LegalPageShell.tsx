import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white font-sans text-neutral-950 antialiased">
      <header className="border-b border-neutral-200/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
          <Link
            href="/"
            className="text-sm font-medium text-neutral-600 transition-colors duration-200 hover:text-neutral-950"
          >
            ← Accueil
          </Link>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-neutral-400">waevon</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <h1 className="font-display text-3xl font-normal tracking-tight text-neutral-950 md:text-4xl">{title}</h1>
        <div className="mt-10 space-y-8 text-base leading-relaxed text-neutral-600">{children}</div>
      </main>
    </div>
  );
}
