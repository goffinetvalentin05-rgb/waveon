/** Product showcase sous le hero — composition large, cartes interactives. */

export function DashboardMockup() {
  return (
    <div className="pc-lp-showcase">
      <div className="pc-lp-showcase-aura" aria-hidden />
      <div className="pc-lp-showcase-grid">
        <article className="pc-lp-showcase-card pc-lp-showcase-match pc-lp-interactive">
          <p className="pc-lp-showcase-label">Prochain duel · Quart de finale</p>
          <div className="pc-lp-mock-teams mt-4">
            <div className="text-center">
              <div className="pc-lp-mock-flag mx-auto">🇫🇷</div>
              <p className="pc-lp-mock-team-name">France</p>
            </div>
            <div className="text-center">
              <p className="pc-lp-mock-time">21:00</p>
              <span className="pc-lp-mock-pill">À venir</span>
            </div>
            <div className="text-center">
              <div className="pc-lp-mock-flag mx-auto">🇧🇷</div>
              <p className="pc-lp-mock-team-name">Brésil</p>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-[var(--pc-muted)]">Ton prono · 2 – 1</p>
        </article>

        <article className="pc-lp-showcase-card pc-lp-showcase-rank pc-lp-interactive">
          <p className="pc-lp-showcase-label">Classement</p>
          <div className="pc-lp-mock-row highlight mt-3">
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
        </article>

        <article className="pc-lp-showcase-card pc-lp-showcase-league pc-lp-interactive">
          <p className="pc-lp-showcase-label text-purple-300">Ligue privée</p>
          <p className="mt-2 font-[family-name:var(--pc-font-display)] text-base font-bold text-white">
            Les Sabotards
          </p>
          <p className="mt-2 text-xs text-[var(--pc-muted)]">8 membres · pronos séparés</p>
          <span className="pc-lp-mock-pill purple mt-4">Privée</span>
        </article>

        <article className="pc-lp-showcase-card pc-lp-showcase-joker pc-lp-interactive">
          <div className="flex items-center gap-4">
            <span className="pc-lp-joker-icon">×2</span>
            <div>
              <p className="text-sm font-bold text-white">Joker x2</p>
              <p className="text-xs text-[var(--pc-muted)]">Carte jouée · ligue privée</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
