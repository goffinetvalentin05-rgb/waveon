import { IconBolt } from "@tabler/icons-react";
import { brand } from "@/lib/brand/config";
import { BentoCard } from "@/components/landing/BentoCard";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell, SectionTitle } from "@/components/landing/SectionChrome";

export function WhySection() {
  return (
    <SectionShell id="pourquoi" halo="intense">
      <Reveal>
        <SectionTitle
          line1={`Pourquoi ${brand.name}`}
          line2Before=""
          line2After=" pour ton groupe ?"
          icon={IconBolt}
          subtitle="Ce que les apps de paris ne te donneront jamais."
        />
      </Reveal>

      <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:gap-5">
        <Reveal delayMs={0} className="lg:col-span-4">
          <BentoCard title="Zéro mise d'argent" subtitle="Fun garanti, portefeuille intact">
            <ShieldVisual />
          </BentoCard>
        </Reveal>

        <Reveal delayMs={80} className="lg:col-span-4">
          <BentoCard title="Cartes de sabotage" subtitle="Joker x2, Carton rouge, VAR…">
            <MiniCardsVisual />
          </BentoCard>
        </Reveal>

        <Reveal delayMs={160} className="sm:col-span-2 lg:col-span-4">
          <BentoCard title="WhatsApp natif" subtitle="Un lien, tes potes sont dedans" tall>
            <ChatVisual />
          </BentoCard>
        </Reveal>

        <Reveal delayMs={240} className="lg:col-span-7">
          <BentoCard title="Concours gratuit" subtitle="Maillot à gagner jusqu'à CHF 120" tall>
            <TrophyVisual />
          </BentoCard>
        </Reveal>

        <Reveal delayMs={320} className="lg:col-span-5">
          <BentoCard title="Mobile-first" subtitle="Pronostique d'une main dans le métro" tall>
            <MiniPhoneVisual />
          </BentoCard>
        </Reveal>

        <Reveal delayMs={400} className="lg:col-span-12">
          <BentoCard title="Ligues privées" subtitle="Crée la tienne en 30 secondes" tall>
            <LeaderboardVisual />
          </BentoCard>
        </Reveal>
      </div>
    </SectionShell>
  );
}

function ShieldVisual() {
  return (
    <div className="relative flex h-full min-h-[140px] w-full items-center justify-center py-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute rounded-2xl border border-blue-500/20"
          style={{
            width: `${88 - i * 18}px`,
            height: `${88 - i * 18}px`,
            opacity: 0.35 + i * 0.15,
          }}
        />
      ))}
      <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-blue-400/40 bg-gradient-to-br from-blue-500/40 to-blue-800/30 shadow-[0_0_48px_rgba(59,130,246,0.5)]">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth={1.5}>
          <path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7l7-4z" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function MiniCardsVisual() {
  const items = [
    { label: "×2", rot: -10 },
    { label: "VAR", rot: 0 },
    { label: "▮", rot: 10 },
  ];
  return (
    <div className="flex h-full min-h-[140px] w-full items-center justify-center gap-3 py-2">
      {items.map((c) => (
        <div
          key={c.label}
          className="h-[100px] w-[68px] rounded-xl border border-blue-400/25 bg-gradient-to-b from-blue-500/90 to-blue-800 p-2 shadow-[0_16px_40px_-8px_rgba(59,130,246,0.7)] transition-transform duration-300 group-hover:-translate-y-1"
          style={{ transform: `rotate(${c.rot}deg)` }}
        >
          <span className="text-[9px] font-bold uppercase tracking-wide text-blue-100/70">Épique</span>
          <p className="mt-8 text-center font-[family-name:var(--font-display)] text-xl font-bold text-white">
            {c.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function ChatVisual() {
  return (
    <div className="w-full max-w-[280px] p-2">
      <div className="rounded-xl border border-white/[0.08] bg-[#0c1018]/90 p-3 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)]">
        <div className="mb-3 flex items-center gap-2.5 border-b border-white/5 pb-2.5">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_16px_rgba(52,211,153,0.4)]" />
          <div>
            <p className="text-xs font-semibold text-white">Groupe Sabotards</p>
            <p className="text-[10px] text-[#9ca3af]">12 membres · en ligne</p>
          </div>
        </div>
        <div className="space-y-2.5">
          <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-md bg-[#25D366] px-3 py-2 text-[11px] leading-snug text-white shadow-lg">
            J&apos;ai créé notre ligue {brand.name} 🔥
          </div>
          <div className="max-w-[92%] rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] text-white/80">
            {brand.domain}/leagues/sabotards
          </div>
          <div className="ml-auto max-w-[70%] rounded-2xl rounded-tr-md bg-[#25D366]/90 px-3 py-1.5 text-[10px] text-white">
            Go go go ⚽
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniPhoneVisual() {
  return (
    <div className="relative py-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(59,130,246,0.35)_0%,transparent_60%)]" />
      <div className="relative mx-auto w-[130px] rounded-[1.35rem] border-[2px] border-white/15 bg-[#080b12] p-2 shadow-[0_28px_60px_-12px_rgba(59,130,246,0.55)]">
        <div className="rounded-[1.1rem] bg-gradient-to-b from-blue-500/15 to-transparent px-2 pb-3 pt-2">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-white/15" />
          <div className="mt-4 space-y-2">
            <div className="h-10 rounded-lg border border-blue-500/25 bg-blue-500/20" />
            <div className="h-7 rounded-lg bg-white/[0.04]" />
            <div className="h-7 rounded-lg bg-white/[0.04]" />
          </div>
          <div className="mt-4 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-center text-[10px] font-bold leading-8 text-white shadow-[0_8px_24px_rgba(59,130,246,0.5)]">
            Pronostiquer
          </div>
        </div>
      </div>
    </div>
  );
}

function TrophyVisual() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-6 px-4 py-2 sm:flex-row sm:justify-center">
      <div className="relative shrink-0">
        <div className="absolute -inset-10 rounded-full bg-amber-400/25 blur-3xl" />
        <svg
          className="relative h-20 w-20 text-amber-400 drop-shadow-[0_0_32px_rgba(251,191,36,0.7)]"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M5 3h14v2a5 5 0 01-5 5 5 5 0 01-5-5V3zm2 0v2a3 3 0 003 3h0a3 3 0 003-3V3H7zm5 10v2H8v3h8v-3h-4v-2h4z" />
        </svg>
      </div>
      <div className="grid w-full max-w-md grid-cols-3 gap-2 sm:max-w-lg">
        {["Prono", "Classement", "Lot CHF 120"].map((label, i) => (
          <div
            key={label}
            className={`rounded-xl border px-3 py-4 text-center ${
              i === 2
                ? "border-amber-400/35 bg-amber-500/15 shadow-[inset_0_0_24px_rgba(251,191,36,0.12)]"
                : "border-white/[0.06] bg-white/[0.03]"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider text-[#9ca3af]">{label}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-sm font-semibold text-white">
              {i === 0 ? "✓" : i === 1 ? "#1" : "🎁"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderboardVisual() {
  const rows = [
    { rank: 1, name: "Toi", pts: 142, hi: true },
    { rank: 2, name: "Maxou", pts: 128 },
    { rank: 3, name: "Luca", pts: 119 },
    { rank: 4, name: "Nico", pts: 104 },
  ];
  return (
    <div className="grid w-full gap-6 px-2 py-2 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div className="rounded-2xl border border-white/[0.06] bg-black/40 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400/80">
          Ligue privée · Sabotards
        </p>
        {rows.map((r) => (
          <div
            key={r.rank}
            className={`mt-2.5 flex items-center justify-between rounded-xl border px-4 py-2.5 ${
              r.hi
                ? "border-blue-500/35 bg-blue-500/12 shadow-[0_0_24px_rgba(59,130,246,0.15)]"
                : "border-white/[0.05] bg-white/[0.02]"
            }`}
          >
            <span className="text-sm font-medium text-white">
              <span className="mr-2.5 inline-flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/20 text-xs font-bold text-blue-300">
                {r.rank}
              </span>
              {r.name}
            </span>
            <span className="text-xs font-bold text-blue-300">{r.pts} pts</span>
          </div>
        ))}
      </div>
      <p className="text-center text-sm leading-relaxed text-[#9ca3af] lg:text-left">
        Invite par lien WhatsApp, classement privé en temps réel, cartes de sabotage à chaque soir de match.
        <span className="mt-3 block font-medium text-blue-400">Création en moins de 30 secondes.</span>
      </p>
    </div>
  );
}
