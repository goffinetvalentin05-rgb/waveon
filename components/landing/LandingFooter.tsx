import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/[0.06] px-5 py-10 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-zinc-500 sm:flex-row">
        <span className="lowercase text-zinc-400">waevon</span>
        <div className="flex gap-6">
          <Link href="/login" className="transition hover:text-zinc-300">
            Connexion
          </Link>
          <Link href="/signup" className="transition hover:text-zinc-300">
            Inscription
          </Link>
        </div>
      </div>
    </footer>
  );
}
