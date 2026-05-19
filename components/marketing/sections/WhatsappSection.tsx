import Link from "next/link";
import { ui } from "@/lib/design/tokens";

const FEATURES = [
  {
    title: "Invitation en un clic",
    text: "Lien prérempli WhatsApp. Tes potes rejoignent en 5 secondes.",
  },
  {
    title: "Résumé fun après match",
    text: '"Valentin prend 8 points avec son score exact. Max a volé Luca et passe devant. Hugo a cramé son Joker pour 0 point."',
  },
  {
    title: "Classement partageable",
    text: "Capture-le, jette-le dans le groupe, chambre tes potes.",
  },
  {
    title: "Mobile-first",
    text: "Boutons larges, parcours court, lisible d'une main dans le métro.",
  },
];

export function WhatsappSection() {
  return (
    <section className={`${ui.section}`}>
      <div className={ui.container}>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className={ui.badgeAccent}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-emerald-400">
                <path d="M20.5 3.5A11 11 0 0 0 3.6 17l-1.6 5 5.1-1.5A11 11 0 0 0 20.5 3.5Zm-8.4 16.4a8.8 8.8 0 0 1-4.5-1.2l-.3-.2-3 .9.9-2.9-.2-.3a8.7 8.7 0 1 1 7.1 3.7Zm5-6.6c-.3-.1-1.6-.8-1.8-.9s-.5-.1-.6.1c-.2.3-.7.9-.9 1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.4-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5.3-.4c0-.1 0-.3-.1-.4l-.9-2.1c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.4-.3.3-1 .9-1 2.3s1 2.7 1.2 2.9c.1.2 2 3 4.9 4.1.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.6-.1 1.6-.7 1.9-1.4.2-.7.2-1.2.1-1.4 0-.1-.2-.2-.4-.3Z"/>
              </svg>
              Pensé pour ton groupe WhatsApp
            </span>
            <h2 className={`${ui.h2} mt-4`}>
              Le tournoi de tes potes. Pas une appli compliquée.
            </h2>
            <p className="mt-5 text-base text-white/65">
              Prono Clash s'utilise comme un groupe WhatsApp : tu cliques sur un
              lien, tu pronostiques, tu joues une carte, tu pars vivre ta vie.
            </p>
            <ul className="mt-7 space-y-4">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <div className="font-semibold text-white">{f.title}</div>
                    <p className="text-sm text-white/60">{f.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link href="/signup?next=create-league" className={ui.btnPrimary}>
                Créer ma ligue privée
              </Link>
            </div>
          </div>
          <div className="relative">
            <FakeWhatsappCard />
          </div>
        </div>
      </div>
    </section>
  );
}

function FakeWhatsappCard() {
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-gradient-to-b from-[#0e1620] to-[#0a0f15] p-3 shadow-[0_30px_80px_-25px_rgba(16,185,129,0.35)]">
      <div className="rounded-2xl bg-[#0b141a] p-4">
        <div className="flex items-center gap-3 border-b border-white/5 pb-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 font-bold text-white">
            PC
          </span>
          <div>
            <div className="text-sm font-semibold text-white">Les Sabotards</div>
            <div className="text-[11px] text-white/40">8 membres · en ligne</div>
          </div>
        </div>
        <div className="mt-3 space-y-2.5 text-sm">
          <Bubble side="left" name="Max">
            J&apos;ai créé notre ligue Prono Clash 🔥
          </Bubble>
          <Bubble side="left" name="Max">
            Viens pronostiquer et saboter le groupe : pronoclash.app/leagues/sabotards
          </Bubble>
          <Bubble side="right">Je rejoins direct 😤</Bubble>
          <Bubble side="right">J&apos;ai déjà pris mon Joker x2 pour FR-BR</Bubble>
          <Bubble side="left" name="Valentin">
            J&apos;ai mis un carton rouge sur Max, tape-toi à la 60e
          </Bubble>
        </div>
      </div>
    </div>
  );
}

function Bubble({
  side,
  children,
  name,
}: {
  side: "left" | "right";
  children: React.ReactNode;
  name?: string;
}) {
  const isRight = side === "right";
  return (
    <div className={`flex ${isRight ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 ${
          isRight
            ? "bg-emerald-600/90 text-white"
            : "bg-white/[0.06] text-white/90"
        }`}
      >
        {!isRight && name ? (
          <div className="text-[10px] font-semibold text-cyan-300">{name}</div>
        ) : null}
        <div className="text-[13px] leading-snug">{children}</div>
      </div>
    </div>
  );
}
