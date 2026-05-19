import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

type AuthShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

/** Mise en page commune des pages auth (dark, glass). */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <div className="pc-aurora" />
      <header className="relative z-10 px-5 py-5 sm:px-8">
        <Logo />
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-5 pb-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-xl shadow-[0_25px_80px_-30px_rgba(99,102,241,0.5)] sm:p-9">
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 text-sm leading-relaxed text-white/60">{subtitle}</p>
            ) : null}
            <div className="mt-7">{children}</div>
          </div>
          {footer ? (
            <div className="mt-6 text-center text-sm text-white/60">{footer}</div>
          ) : null}
        </div>
      </main>
      <footer className="relative z-10 px-5 pb-6 text-center text-[11px] text-white/30">
        <Link href="/" className="hover:text-white/60">
          ← Retour à l&apos;accueil
        </Link>
      </footer>
    </div>
  );
}
