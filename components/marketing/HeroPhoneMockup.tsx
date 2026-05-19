/**
 * Mockup de téléphone pour le hero — purement décoratif.
 * Affiche un mini "écran" de l'app : un match avec score à pronostiquer +
 * un classement de ligue privée.
 *
 * Aucun logo officiel utilisé : équipes représentées par initiales + couleurs.
 */
export function HeroPhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px]">
      <div className="pc-aurora" />
      <div className="pc-float relative rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-slate-900 to-black p-3 shadow-[0_30px_80px_-20px_rgba(99,102,241,0.5),0_0_0_1px_rgba(255,255,255,0.04)]">
        {/* Encoche */}
        <div className="absolute left-1/2 top-3 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#06070d]">
          <div className="aspect-[9/19.5] w-full">
            {/* Status bar */}
            <div className="flex items-center justify-between px-6 pb-1 pt-6 text-[10px] font-semibold text-white/70">
              <span>22:31</span>
              <span className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                LIVE
              </span>
            </div>

            <div className="px-4 pt-3">
              <div className="text-xs text-white/40">Ce soir · Quart de finale</div>

              {/* Carte match */}
              <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur">
                <div className="flex items-center justify-between">
                  <TeamChip code="FR" color="from-blue-500 to-indigo-500" />
                  <span className="text-xs text-white/40">21:00</span>
                  <TeamChip code="BR" color="from-emerald-500 to-yellow-400" reverse />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <ScoreBox value={2} />
                  <span className="text-xs uppercase tracking-widest text-white/30">VS</span>
                  <ScoreBox value={1} />
                </div>
                <button
                  type="button"
                  className="mt-3 w-full rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 py-2 text-xs font-semibold text-white shadow-[0_8px_25px_-8px_rgba(99,102,241,0.8)]"
                >
                  Verrouiller mon prono
                </button>
              </div>

              {/* Carte spéciale jouée */}
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs">
                  ×2
                </span>
                <div className="text-[11px] leading-tight text-white/80">
                  <div className="font-semibold text-white">Joker x2 activé</div>
                  <div className="text-white/50">par toi sur ce match</div>
                </div>
              </div>

              {/* Classement ligue */}
              <div className="mt-4">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                  Ma ligue · Les Sabotards
                </div>
                <ul className="space-y-1.5">
                  <RankRow rank={1} name="Valentin" score={42} highlight />
                  <RankRow rank={2} name="Max" score={38} />
                  <RankRow rank={3} name="Toi" score={35} self />
                  <RankRow rank={4} name="Luca" score={31} />
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamChip({
  code,
  color,
  reverse = false,
}: {
  code: string;
  color: string;
  reverse?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${reverse ? "flex-row-reverse" : ""}`}>
      <span
        className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-[11px] font-bold text-white shadow-[0_8px_16px_-6px_rgba(0,0,0,0.5)]`}
      >
        {code}
      </span>
      <span className="text-xs font-semibold text-white">{code}</span>
    </div>
  );
}

function ScoreBox({ value }: { value: number }) {
  return (
    <div className="flex-1 rounded-xl border border-white/10 bg-black/30 py-3 text-center text-2xl font-bold text-white">
      {value}
    </div>
  );
}

function RankRow({
  rank,
  name,
  score,
  highlight = false,
  self = false,
}: {
  rank: number;
  name: string;
  score: number;
  highlight?: boolean;
  self?: boolean;
}) {
  return (
    <li
      className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] ${
        highlight
          ? "bg-gradient-to-r from-yellow-500/20 to-amber-500/0 text-yellow-100"
          : self
            ? "bg-white/[0.08] text-white"
            : "text-white/70"
      }`}
    >
      <span className="flex items-center gap-2">
        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold ${
          highlight ? "bg-yellow-400 text-black" : "bg-white/10 text-white/70"
        }`}>{rank}</span>
        <span>{name}</span>
        {self ? <span className="rounded bg-blue-500/30 px-1 text-[9px] uppercase text-blue-100">moi</span> : null}
      </span>
      <span className="font-semibold tabular-nums">{score} pts</span>
    </li>
  );
}
