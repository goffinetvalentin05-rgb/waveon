import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { brand } from "@/lib/brand/config";
import { landing } from "@/components/landing/landing-styles";

export function MarketingFooter() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-[#05060a]/80 py-12 backdrop-blur-[20px]">
      <div className={`${landing.container} flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between`}>
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm text-[#9ca3af]">{brand.notAGamblingDisclaimer}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9ca3af]/70">
              Produit
            </p>
            <ul className="space-y-1.5 text-[#9ca3af]">
              <li><a href="#pourquoi" className="hover:text-white">Pourquoi</a></li>
              <li><a href="#comment" className="hover:text-white">Comment ça marche</a></li>
              <li><a href="#cartes" className="hover:text-white">Cartes</a></li>
              <li><a href="#tarifs" className="hover:text-white">Tarifs</a></li>
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9ca3af]/70">
              Compte
            </p>
            <ul className="space-y-1.5 text-[#9ca3af]">
              <li><Link href="/login" className="hover:text-white">Connexion</Link></li>
              <li><Link href="/signup" className="hover:text-white">S&apos;inscrire</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9ca3af]/70">
              Légal
            </p>
            <ul className="space-y-1.5 text-[#9ca3af]">
              <li><Link href="/legal/terms" className="hover:text-white">Conditions</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-white">Confidentialité</Link></li>
              <li><Link href="/legal/contest-rules" className="hover:text-white">Règlement concours</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className={`${landing.container} mt-10 flex flex-col gap-2 border-t border-white/[0.06] pt-6 text-xs text-[#9ca3af]/80 sm:flex-row sm:items-center sm:justify-between`}>
        <p>© {new Date().getFullYear()} {brand.name}. Tous droits réservés.</p>
        <p>{brand.contactEmail}</p>
      </div>
    </footer>
  );
}
