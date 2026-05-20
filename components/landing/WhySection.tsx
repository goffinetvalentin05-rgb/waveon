import {
  IconBrandWhatsapp,
  IconCards,
  IconDeviceMobile,
  IconShieldCheck,
  IconTrophy,
  IconUsersGroup,
  IconBolt,
} from "@tabler/icons-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell, SectionTitle } from "@/components/landing/SectionChrome";
import { landing } from "@/components/landing/landing-styles";

const CARDS = [
  {
    title: "Zéro mise d'argent",
    subtitle: "Fun garanti, portefeuille intact",
    icon: IconShieldCheck,
    visual: <ShieldVisual />,
  },
  {
    title: "Cartes de sabotage",
    subtitle: "Joker x2, Carton rouge, VAR…",
    icon: IconCards,
    visual: <MiniCardsVisual />,
  },
  {
    title: "WhatsApp natif",
    subtitle: "Un lien, tes potes sont dedans",
    icon: IconBrandWhatsapp,
    visual: <ChatVisual />,
  },
  {
    title: "Mobile-first",
    subtitle: "Pronostique d'une main dans le métro",
    icon: IconDeviceMobile,
    visual: <MiniPhoneVisual />,
  },
  {
    title: "Concours gratuit",
    subtitle: "Maillot à gagner jusqu'à CHF 120",
    icon: IconTrophy,
    visual: <TrophyVisual />,
    wide: true,
  },
  {
    title: "Ligues privées",
    subtitle: "Crée la tienne en 30 secondes",
    icon: IconUsersGroup,
    visual: <LeaderboardVisual />,
    full: true,
  },
];

export function WhySection() {
  return (
    <SectionShell id="pourquoi">
      <Reveal>
        <SectionTitle
          line1="Pourquoi Prono Clash"
          line2Before=""
          line2After=" pour ton groupe ?"
          icon={IconBolt}
          subtitle="Ce que les apps de paris ne te donneront jamais."
        />
      </Reveal>
      <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
        {CARDS.map((card, i) => (
          <Reveal key={card.title} delayMs={i * 100} className={gridClass(card)}>
            <article className={`${landing.glass} ${landing.glassHover} group flex h-full min-h-[280px] flex-col p-5 sm:p-6`}>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-500/15 text-blue-400">
                  <card.icon size={20} stroke={1.8} />
                </span>
                <div>
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-xs text-[#9ca3af] sm:text-sm">{card.subtitle}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-1 items-end">{card.visual}</div>
            </article>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

function gridClass(card: (typeof CARDS)[0]) {
  if (card.full) return "md:col-span-3";
  if (card.wide) return "md:col-span-2";
  return "md:col-span-1";
}

function ShieldVisual() {
  return (
    <div className="relative mx-auto flex h-36 w-full max-w-[200px] items-center justify-center">
      <div className="absolute inset-0 rounded-full border border-blue-500/10" />
      <div className="absolute inset-4 rounded-full border border-blue-500/15" />
      <div className="absolute inset-8 rounded-full border border-blue-500/20" />
      <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/30 to-blue-700/20 shadow-[0_0_40px_rgba(59,130,246,0.35)]">
        <IconShieldCheck size={40} className="text-blue-300" stroke={1.5} />
      </div>
    </div>
  );
}

function MiniCardsVisual() {
  const items = [
    { label: "×2", color: "from-blue-500 to-blue-700" },
    { label: "VAR", color: "from-blue-600 to-blue-800" },
    { label: "▮", color: "from-blue-400 to-blue-600" },
  ];
  return (
    <div className="flex w-full justify-center gap-3 pb-2">
      {items.map((c, i) => (
        <div
          key={c.label}
          className={`h-24 w-[4.5rem] rounded-xl border border-white/10 bg-gradient-to-br ${c.color} p-2 shadow-[0_12px_32px_-8px_rgba(59,130,246,0.5)] transition-transform duration-300 group-hover:-translate-y-1`}
          style={{ transform: `rotate(${i === 0 ? -8 : i === 2 ? 8 : 0}deg)` }}
        >
          <span className="text-[10px] font-bold uppercase text-white/70">Épique</span>
          <div className="mt-6 text-center font-[family-name:var(--font-display)] text-xl font-bold text-white">
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatVisual() {
  return (
    <div className="w-full rounded-2xl border border-white/[0.06] bg-black/30 p-3">
      <div className="mb-2 flex items-center gap-2 border-b border-white/5 pb-2">
        <div className="h-7 w-7 rounded-full bg-emerald-500/80" />
        <span className="text-xs font-medium text-white/80">Groupe Sabotards</span>
      </div>
      <div className="space-y-2">
        <div className="ml-auto max-w-[85%] rounded-xl rounded-tr-sm bg-[#25D366]/90 px-3 py-2 text-[11px] text-white">
          J&apos;ai créé notre ligue Prono Clash 🔥
        </div>
        <div className="max-w-[85%] rounded-xl rounded-tl-sm border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] text-white/75">
          pronoclash.app/leagues/sabotards — go !
        </div>
      </div>
    </div>
  );
}

function MiniPhoneVisual() {
  return (
    <div className="mx-auto w-[120px] rounded-[1.25rem] border-2 border-white/15 bg-[#0a0e1a] p-1.5 shadow-[0_20px_50px_-12px_rgba(59,130,246,0.45)]">
      <div className="rounded-[1rem] bg-gradient-to-b from-blue-500/20 to-transparent p-2">
        <div className="h-1.5 w-10 mx-auto rounded-full bg-white/20" />
        <div className="mt-3 space-y-1.5">
          <div className="h-8 rounded-lg bg-blue-500/25 border border-blue-500/20" />
          <div className="h-6 rounded-lg bg-white/[0.04]" />
          <div className="h-6 rounded-lg bg-white/[0.04]" />
        </div>
        <div className="mt-3 h-7 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 text-center text-[9px] font-bold leading-7 text-white">
          Pronostiquer
        </div>
      </div>
    </div>
  );
}

function TrophyVisual() {
  return (
    <div className="flex w-full items-center justify-center gap-6">
      <div className="relative">
        <div className="absolute -inset-6 rounded-full bg-amber-400/20 blur-2xl" />
        <IconTrophy size={72} className="relative text-amber-400 drop-shadow-[0_0_24px_rgba(251,191,36,0.6)]" stroke={1.4} />
      </div>
      <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-5 py-4 text-left">
        <p className="text-[10px] uppercase tracking-widest text-amber-200/80">Lot n°1</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold text-white">
          jusqu&apos;à CHF 120
        </p>
        <p className="mt-1 text-xs text-[#9ca3af]">Maillot ou bon équivalent</p>
      </div>
    </div>
  );
}

function LeaderboardVisual() {
  const rows = [
    { rank: 1, name: "Toi", pts: 142, hi: true },
    { rank: 2, name: "Maxou", pts: 128 },
    { rank: 3, name: "Luca", pts: 119 },
  ];
  return (
    <div className="grid w-full gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-white/[0.06] bg-black/25 p-4">
        <p className="text-[10px] uppercase tracking-widest text-[#9ca3af]">Ligue privée · Sabotards</p>
        {rows.map((r) => (
          <div
            key={r.rank}
            className={`mt-2 flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${
              r.hi ? "border-blue-500/30 bg-blue-500/10" : "border-white/[0.06] bg-white/[0.02]"
            }`}
          >
            <span className="font-medium text-white">
              <span className="mr-2 text-blue-400">#{r.rank}</span>
              {r.name}
            </span>
            <span className="text-xs font-bold text-blue-300">{r.pts} pts</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col justify-center text-sm text-[#9ca3af]">
        <p>Invite par lien WhatsApp, classement privé, cartes actives chaque soir de match.</p>
        <p className="mt-2 text-blue-400/90">Création en moins de 30 secondes.</p>
      </div>
    </div>
  );
}
