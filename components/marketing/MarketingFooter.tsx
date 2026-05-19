import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { brand } from "@/lib/brand/config";
import { ui } from "@/lib/design/tokens";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/5 bg-black/40 py-12">
      <div className={`${ui.container} flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between`}>
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm text-white/55">{brand.notAGamblingDisclaimer}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
              Produit
            </p>
            <ul className="space-y-1.5 text-white/70">
              <li><a href="#comment" className="hover:text-white">Comment ça marche</a></li>
              <li><a href="#cartes" className="hover:text-white">Cartes</a></li>
              <li><Link href="/pricing" className="hover:text-white">Tarifs</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
              Compte
            </p>
            <ul className="space-y-1.5 text-white/70">
              <li><Link href="/login" className="hover:text-white">Connexion</Link></li>
              <li><Link href="/signup" className="hover:text-white">S'inscrire</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
              Légal
            </p>
            <ul className="space-y-1.5 text-white/70">
              <li><Link href="/legal/terms" className="hover:text-white">Conditions</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-white">Confidentialité</Link></li>
              <li><Link href="/legal/contest-rules" className="hover:text-white">Règlement concours</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className={`${ui.container} mt-10 flex flex-col gap-2 border-t border-white/5 pt-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between`}>
        <p>© {new Date().getFullYear()} {brand.name}. Tous droits réservés.</p>
        <p>{brand.contactEmail}</p>
      </div>
    </footer>
  );
}
