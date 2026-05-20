import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { brand } from "@/lib/brand/config";
import { landing } from "@/components/landing/landing-styles";

export function MarketingFooter() {
  return (
    <footer className="pc-lp-footer">
      <div className={`${landing.container}`}>
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <Logo />
            <p className="mt-3 font-[family-name:var(--pc-font-display)] text-lg font-bold text-white">
              Prono Clash
            </p>
            <p className="mt-3 text-sm text-[var(--pc-muted)]">{brand.notAGamblingDisclaimer}</p>
          </div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-8 text-sm sm:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--pc-muted)]">
                Produit
              </p>
              <ul className="space-y-2 text-[var(--pc-muted)]">
                <li>
                  <a href="#comment" className="transition hover:text-white">
                    Comment ça marche
                  </a>
                </li>
                <li>
                  <a href="#ligue-generale" className="transition hover:text-white">
                    Ligue générale
                  </a>
                </li>
                <li>
                  <a href="#cartes" className="transition hover:text-white">
                    Cartes
                  </a>
                </li>
                <li>
                  <a href="#tarifs" className="transition hover:text-white">
                    Tarifs
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-[var(--pc-muted)]">
                Légal
              </p>
              <ul className="space-y-2 text-[var(--pc-muted)]">
                <li>
                  <Link href="/legal/terms" className="transition hover:text-white">
                    Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/legal/privacy" className="transition hover:text-white">
                    Confidentialité
                  </Link>
                </li>
                <li>
                  <Link href="/legal/contest-rules" className="transition hover:text-white">
                    Règlement du concours
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pc-lp-footer-disclaimer">
          <p>
            Prono Clash n&apos;est pas affilié à FIFA, à la Coupe du Monde, aux fédérations, aux
            équipes ou aux marques sportives.
          </p>
          <p className="mt-4 flex flex-col gap-1 sm:flex-row sm:justify-between">
            <span>
              © {new Date().getFullYear()} {brand.name}
            </span>
            <span>{brand.contactEmail}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
