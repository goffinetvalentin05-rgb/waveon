/** Mockup hero — cartes flottantes style dashboard (sans cadre téléphone). */

export function DashboardMockup() {
  return (
    <div className="pc-lp-mockup-stage" aria-hidden>
      <div className="pc-lp-mockup-glow" />
      <div className="pc-lp-mockup-card pc-lp-mockup-match">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#a5b4fc]">
          Prochain duel · Quart de finale
        </p>
        <div className="pc-lp-mock-teams mt-3">
          <div className="text-center">
            <div className="pc-lp-mock-flag mx-auto">🇫🇷</div>
            <p className="pc-lp-mock-team-name">France</p>
          </div>
          <div className="text-center">
            <p className="pc-lp-mock-time">21:00</p>
            <span className="mt-1 inline-block rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2 py-0.5 text-[9px] font-bold text-indigo-200">
              À venir
            </span>
          </div>
          <div className="text-center">
            <div className="pc-lp-mock-flag mx-auto">🇧🇷</div>
            <p className="pc-lp-mock-team-name">Brésil</p>
          </div>
        </div>
        <p className="mt-3 text-center text-[11px] text-[var(--pc-muted)]">Ton prono : 2 – 1</p>
      </div>

      <div className="pc-lp-mockup-card pc-lp-mockup-leaderboard">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#a5b4fc]">Classement</p>
        <div className="pc-lp-mock-row highlight mt-2">
          <span className="font-semibold text-white">1 · Toi</span>
          <span className="font-bold text-amber-300">142 pts</span>
        </div>
        <div className="pc-lp-mock-row">
          <span className="text-white/90">2 · Max</span>
          <span className="font-bold text-indigo-300">128</span>
        </div>
        <div className="pc-lp-mock-row">
          <span className="text-white/80">3 · Luca</span>
          <span className="font-bold text-indigo-300/80">119</span>
        </div>
      </div>

      <div className="pc-lp-mockup-card pc-lp-mockup-league">
        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-300">Ligue privée</p>
        <p className="mt-1 font-[family-name:var(--pc-font-display)] text-sm font-bold text-white">
          Les Sabotards
        </p>
        <p className="mt-2 text-[11px] text-[var(--pc-muted)]">8 membres · pronos séparés</p>
        <span className="mt-3 inline-flex rounded-full border border-purple-500/30 bg-purple-500/15 px-2.5 py-1 text-[9px] font-bold text-purple-200">
          Privée
        </span>
      </div>

      <div className="pc-lp-mockup-card pc-lp-mockup-card-play">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 font-[family-name:var(--pc-font-display)] text-sm font-bold text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]">
            ×2
          </span>
          <div>
            <p className="text-xs font-bold text-white">Joker x2</p>
            <p className="text-[10px] text-[var(--pc-muted)]">Carte jouée</p>
          </div>
        </div>
      </div>
    </div>
  );
}
