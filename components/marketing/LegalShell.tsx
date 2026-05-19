import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { ui } from "@/lib/design/tokens";

type LegalShellProps = {
  title: string;
  subtitle?: string;
  updatedAt: string;
  children: ReactNode;
};

export function LegalShell({ title, subtitle, updatedAt, children }: LegalShellProps) {
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <MarketingHeader />
      <main className="py-16">
        <div className={`${ui.container} max-w-3xl`}>
          <header className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/80">
              Légal
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold text-white sm:text-5xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-3 text-base text-white/60">{subtitle}</p>
            ) : null}
            <p className="mt-4 text-xs uppercase tracking-widest text-white/40">
              Dernière mise à jour · {updatedAt}
            </p>
          </header>
          <div className={`${ui.glassCard} prose prose-invert max-w-none p-8 prose-headings:font-display prose-h2:text-2xl prose-h3:text-lg prose-h2:text-white prose-p:text-white/75 prose-li:text-white/75 prose-strong:text-white`}>
            {children}
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
