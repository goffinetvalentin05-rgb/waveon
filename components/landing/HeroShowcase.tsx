import { brand } from "@/lib/brand/config";

const TOASTS = [
  {
    id: "join",
    className: "pc-lp-live-toast--tl",
    dot: "emerald",
    title: "Max a rejoint la ligue",
    sub: "Les Sabotards · 8 joueurs",
    delay: "0.55s",
  },
  {
    id: "duel",
    className: "pc-lp-live-toast--tr",
    dot: "indigo",
    title: "Nouveau duel",
    sub: "France vs Brésil · 21:00",
    delay: "0.7s",
  },
  {
    id: "joker",
    className: "pc-lp-live-toast--right",
    dot: "orange",
    title: "Carte Joker ×2 jouée",
    sub: "sur France vs Brésil",
    delay: "0.85s",
  },
  {
    id: "lock",
    className: "pc-lp-live-toast--bl",
    dot: "violet",
    title: "Prono verrouillé",
    sub: "2 – 1 avant coup d'envoi",
    delay: "1s",
  },
  {
    id: "pts",
    className: "pc-lp-live-toast--br",
    dot: "amber",
    title: "+3 points",
    sub: "Bon vainqueur · ligue générale",
    delay: "1.15s",
  },
  {
    id: "wa",
    className: "pc-lp-live-toast--left",
    dot: "emerald",
    title: "Lien partagé",
    sub: `${brand.domain}/leagues/join`,
    delay: "1.3s",
  },
] as const;

export function HeroShowcase() {
  return (
    <div className="pc-lp-live-showcase" aria-hidden>
      <div className="pc-lp-live-aura" />
      <div className="pc-lp-live-ring" />

      <div className="pc-lp-live-stage">
        {TOASTS.map((t) => (
          <div
            key={t.id}
            className={`pc-lp-live-toast ${t.className}`}
            style={{ "--toast-delay": t.delay } as React.CSSProperties}
          >
            <span className={`pc-lp-live-toast-dot pc-lp-live-toast-dot--${t.dot}`} />
            <div>
              <p className="pc-lp-live-toast-title">{t.title}</p>
              <p className="pc-lp-live-toast-sub">{t.sub}</p>
            </div>
          </div>
        ))}

        <div
          className="pc-lp-live-chip pc-lp-live-chip--rank"
          style={{ "--toast-delay": "0.9s" } as React.CSSProperties}
        >
          <span className="pc-lp-live-chip-rank">#2</span>
          <span>Classement</span>
        </div>

        <div
          className="pc-lp-live-chip pc-lp-live-chip--league"
          style={{ "--toast-delay": "1.05s" } as React.CSSProperties}
        >
          Ligue privée
        </div>

        <div className="pc-lp-live-device">
          <div className="pc-lp-live-device-shell">
            <div className="pc-lp-live-device-notch" />
            <div className="pc-lp-live-device-screen">
              <div className="pc-lp-live-screen-head">
                <span className="pc-lp-live-screen-brand">{brand.name}</span>
                <span className="pc-lp-live-live-pill">
                  <span className="pc-lp-live-live-dot" />
                  LIVE
                </span>
              </div>

              <div className="pc-lp-live-match">
                <div className="pc-lp-live-match-teams">
                  <span>🇫🇷</span>
                  <span className="pc-lp-live-match-time">21:00</span>
                  <span>🇧🇷</span>
                </div>
                <p className="pc-lp-live-match-label">France · Brésil</p>
                <p className="pc-lp-live-match-prono">Ton prono · 2 – 1</p>
              </div>

              <div className="pc-lp-live-rank-row">
                <span>1 · Toi</span>
                <strong>142 pts</strong>
              </div>
              <div className="pc-lp-live-rank-row dim">
                <span>2 · Max</span>
                <span>128</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
