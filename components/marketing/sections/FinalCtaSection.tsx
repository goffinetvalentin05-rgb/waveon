import Link from "next/link";
import { ui } from "@/lib/design/tokens";

export function FinalCtaSection() {
  return (
    <section className={`${ui.section}`}>
      <div className={ui.container}>
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/10 via-violet-500/10 to-fuchsia-500/10 px-6 py-16 text-center backdrop-blur-xl sm:px-12 sm:py-20">
          <div className="pc-aurora" />
          <h2 className={`${ui.h2} mx-auto max-w-3xl`}>
            Le tournoi commence bientôt. <span className="pc-text-shine">Préviens ton groupe.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base text-white/65">
            Crée ta ligue, balance le lien sur WhatsApp, et que le meilleur saboteur gagne.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup?next=create-league" className={ui.btnPrimaryLg}>
              Créer ma ligue
            </Link>
            <Link href="/signup?next=contest" className={ui.btnSecondary}>
              Tenter le concours gratuit
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
