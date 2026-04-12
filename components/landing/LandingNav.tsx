import Link from "next/link";
import { PrimaryButton } from "./PrimaryButton";

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white lowercase">
          waevon
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm text-zinc-400 transition hover:text-white sm:inline"
          >
            Connexion
          </Link>
          <PrimaryButton href="/signup" className="px-5 py-2.5 text-xs sm:px-8 sm:py-3.5 sm:text-sm">
            Commencer gratuitement
          </PrimaryButton>
        </div>
      </div>
    </header>
  );
}
