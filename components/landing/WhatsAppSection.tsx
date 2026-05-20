import Link from "next/link";
import { IconBrandWhatsapp, IconLink } from "@tabler/icons-react";
import { brand } from "@/lib/brand/config";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell, SectionTitle } from "@/components/landing/SectionChrome";
import { landing } from "@/components/landing/landing-styles";

const STEPS = [
  "Crée ta ligue privée",
  "Partage le lien d'invitation",
  "Tes potes rejoignent en un clic",
  "Chacun pronostique dans sa ligue",
  "Le classement évolue en direct",
];

export function WhatsAppSection() {
  return (
    <SectionShell id="whatsapp">
      <Reveal>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionTitle
              line1="Pensé pour"
              line2Accent="WhatsApp"
              align="left"
              subtitle="Pas d'app à convaincre tout le groupe : un lien, et c'est parti."
            />
            <ul className="mt-8 space-y-3">
              {STEPS.map((step, i) => (
                <li
                  key={step}
                  className="flex items-center gap-3 text-sm text-[var(--pc-muted)]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-300">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
            <Link href="/signup?next=create-league" className={`${landing.btnPrimary} mt-8`}>
              <IconBrandWhatsapp size={18} stroke={1.8} />
              Créer ma ligue
            </Link>
          </div>

          <div className="pc-glass-card p-6 sm:p-8">
            <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_20px_rgba(52,211,153,0.35)]">
                <IconBrandWhatsapp size={22} className="text-white" stroke={1.6} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Groupe Coupe du monde</p>
                <p className="text-xs text-[var(--pc-muted)]">12 membres</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="pc-lp-whatsapp-bubble sent">
                <p className="text-sm leading-snug">J&apos;ai créé notre ligue sur {brand.name}</p>
                <p className="mt-1 text-[10px] opacity-80">22:14</p>
              </div>
              <div className="pc-lp-whatsapp-bubble received">
                <p className="flex items-center gap-2 text-sm text-white/90">
                  <IconLink size={14} className="shrink-0 text-violet-400" />
                  {brand.domain}/leagues/join/abc123
                </p>
                <p className="mt-1 text-[10px] text-[var(--pc-muted)]">Lien d&apos;invitation</p>
              </div>
              <div className="pc-lp-whatsapp-bubble sent">
                <p className="text-sm">Qui finit dernier paie la tournée ?</p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </SectionShell>
  );
}
