"use client";

export function PhoneMockup() {
  return (
    <div className="pc-stage">
      <div className="pc-orb pc-orb-1" />
      <div className="pc-orb pc-orb-2" />

      <div className="pc-phone">
        <div className="pc-screen">
          <div className="pc-notch" />

          <div className="pc-statusbar">
            <span className="pc-time">22:31</span>
            <span className="pc-live">
              <span className="pc-live-dot" />
              LIVE
            </span>
          </div>

          <div className="pc-content">
            <div className="pc-subtitle">Ce soir · Quart de finale</div>

            <div className="pc-match-card">
              <div className="pc-teams">
                <div className="pc-team">
                  <div className="pc-flag pc-flag-fr">FR</div>
                  <span className="pc-team-code">FRA</span>
                </div>
                <span className="pc-vs-time">21:00</span>
                <div className="pc-team">
                  <span className="pc-team-code">BRA</span>
                  <div className="pc-flag pc-flag-br">BR</div>
                </div>
              </div>
              <div className="pc-score-row">
                <span className="pc-score">
                  <span className="pc-score-home">2</span>
                </span>
                <span className="pc-vs">VS</span>
                <span className="pc-score">1</span>
              </div>
              <div className="pc-lock-btn">Verrouiller mon prono</div>
            </div>

            <div className="pc-joker">
              <div className="pc-joker-icon">×2</div>
              <div className="pc-joker-text">
                <div className="pc-joker-title">Joker x2 activé</div>
                <div className="pc-joker-sub">par toi sur ce match</div>
              </div>
            </div>

            <div className="pc-league-label">MA LIGUE · LES SABOTARDS</div>

            <div className="pc-leaderboard">
              <div className="pc-row pc-row-1">
                <div className="pc-rank">1</div>
                <div className="pc-name">Valentin</div>
                <div className="pc-points">43 pts</div>
              </div>
              <div className="pc-row pc-row-2">
                <div className="pc-rank">2</div>
                <div className="pc-name">Max</div>
                <div className="pc-points">38 pts</div>
              </div>
              <div className="pc-row pc-row-3">
                <div className="pc-rank">3</div>
                <div className="pc-name">
                  Toi<span className="pc-me-badge">MOI</span>
                </div>
                <div className="pc-points">35 pts</div>
              </div>
              <div className="pc-row pc-row-4">
                <div className="pc-rank">4</div>
                <div className="pc-name">Luca</div>
                <div className="pc-points">31 pts</div>
              </div>
            </div>

            <div className="pc-notif">
              <span className="pc-notif-dot" />
              <span className="pc-notif-text">Max a joué un Sabotage</span>
            </div>
          </div>

          <div className="pc-home-indicator" />
        </div>
      </div>

      <style jsx>{`
        @keyframes pc-float {
          0%,
          100% {
            transform: translateY(0) rotate(-2deg);
          }
          50% {
            transform: translateY(-12px) rotate(-2deg);
          }
        }
        @keyframes pc-pulse-dot {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(0.85);
          }
        }
        @keyframes pc-score-bump {
          0%,
          90%,
          100% {
            transform: scale(1);
          }
          95% {
            transform: scale(1.25);
          }
        }
        @keyframes pc-joker-pulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.7);
          }
          50% {
            box-shadow: 0 0 0 12px rgba(168, 85, 247, 0);
          }
        }
        @keyframes pc-btn-glow {
          0%,
          100% {
            box-shadow:
              0 0 20px rgba(99, 102, 241, 0.4),
              0 0 40px rgba(168, 85, 247, 0.2);
          }
          50% {
            box-shadow:
              0 0 30px rgba(99, 102, 241, 0.7),
              0 0 60px rgba(168, 85, 247, 0.4);
          }
        }
        @keyframes pc-shine {
          0% {
            transform: translateX(-120%) skewX(-20deg);
          }
          100% {
            transform: translateX(220%) skewX(-20deg);
          }
        }
        @keyframes pc-rank-up {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-44px);
            background: rgba(250, 204, 21, 0.15);
          }
          100% {
            transform: translateY(-44px);
            background: rgba(250, 204, 21, 0.18);
          }
        }
        @keyframes pc-rank-down {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(44px);
          }
        }
        @keyframes pc-flag-spin {
          0%,
          80%,
          100% {
            transform: rotateY(0deg);
          }
          90% {
            transform: rotateY(180deg);
          }
        }
        @keyframes pc-bg-orb {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(30px, -20px) scale(1.15);
          }
        }
        @keyframes pc-notif-slide {
          0%,
          85%,
          100% {
            transform: translateX(120%);
            opacity: 0;
          }
          88%,
          98% {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .pc-stage {
          position: relative;
          width: 380px;
          height: 780px;
        }
        .pc-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
          opacity: 0.5;
          pointer-events: none;
        }
        .pc-orb-1 {
          width: 280px;
          height: 280px;
          background: #6366f1;
          top: -40px;
          left: -60px;
          animation: pc-bg-orb 8s ease-in-out infinite;
        }
        .pc-orb-2 {
          width: 240px;
          height: 240px;
          background: #a855f7;
          bottom: 40px;
          right: -40px;
          animation: pc-bg-orb 10s ease-in-out infinite reverse;
        }

        .pc-phone {
          position: relative;
          width: 340px;
          height: 700px;
          background: linear-gradient(135deg, #1a1a1f 0%, #2a2a32 50%, #1a1a1f 100%);
          border-radius: 54px;
          padding: 14px;
          box-shadow:
            inset 0 0 0 2px #3a3a42,
            inset 0 0 0 4px #0a0a0c,
            0 30px 80px rgba(0, 0, 0, 0.5),
            0 10px 30px rgba(99, 102, 241, 0.2);
          animation: pc-float 6s ease-in-out infinite;
          margin: 0 auto;
        }
        .pc-screen {
          position: relative;
          width: 100%;
          height: 100%;
          background: #0b0b12;
          border-radius: 42px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .pc-notch {
          position: absolute;
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
          width: 110px;
          height: 32px;
          background: #000;
          border-radius: 20px;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 12px;
          gap: 6px;
        }
        .pc-notch::before {
          content: "";
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #1a1a22;
          box-shadow: inset 0 0 0 1px #2a2a32;
        }
        .pc-notch::after {
          content: "";
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #6366f1;
          opacity: 0.6;
        }

        .pc-statusbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 30px 0;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          z-index: 5;
          position: relative;
        }
        .pc-time {
          letter-spacing: -0.3px;
        }
        .pc-live {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 600;
          color: #ef4444;
        }
        .pc-live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ef4444;
          animation: pc-pulse-dot 1.2s ease-in-out infinite;
        }

        .pc-content {
          flex: 1;
          padding: 18px 18px 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow: hidden;
        }
        .pc-subtitle {
          color: #9ca3af;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.3px;
        }

        .pc-match-card {
          background: linear-gradient(
            135deg,
            rgba(99, 102, 241, 0.12) 0%,
            rgba(168, 85, 247, 0.08) 100%
          );
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 18px;
          padding: 14px;
          position: relative;
          overflow: hidden;
        }
        .pc-match-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 30%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.08),
            transparent
          );
          animation: pc-shine 4s ease-in-out infinite;
        }
        .pc-teams {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .pc-team {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .pc-flag {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          animation: pc-flag-spin 5s ease-in-out infinite;
        }
        .pc-flag-fr {
          background: linear-gradient(135deg, #3b82f6, #1e40af);
        }
        .pc-flag-br {
          background: linear-gradient(135deg, #10b981, #fbbf24);
        }
        .pc-team-code {
          color: #fff;
          font-size: 13px;
          font-weight: 600;
        }
        .pc-vs-time {
          color: #9ca3af;
          font-size: 13px;
          font-weight: 600;
        }

        .pc-score-row {
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 6px 0;
        }
        .pc-score {
          color: #fff;
          font-size: 38px;
          font-weight: 700;
          letter-spacing: -1px;
          line-height: 1;
        }
        .pc-score-home {
          animation: pc-score-bump 4s ease-in-out infinite;
          display: inline-block;
        }
        .pc-vs {
          color: #6b7280;
          font-size: 14px;
          font-weight: 500;
        }

        .pc-lock-btn {
          margin-top: 10px;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          color: #fff;
          text-align: center;
          padding: 11px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          animation: pc-btn-glow 2.5s ease-in-out infinite;
          position: relative;
          overflow: hidden;
        }
        .pc-lock-btn::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 40%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          animation: pc-shine 3s ease-in-out infinite;
        }

        .pc-joker {
          background: rgba(168, 85, 247, 0.08);
          border: 1px solid rgba(168, 85, 247, 0.25);
          border-radius: 14px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pc-joker-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #a855f7, #d946ef);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 700;
          font-size: 12px;
          animation: pc-joker-pulse 2s ease-in-out infinite;
        }
        .pc-joker-text {
          flex: 1;
        }
        .pc-joker-title {
          color: #fff;
          font-size: 12px;
          font-weight: 600;
        }
        .pc-joker-sub {
          color: #9ca3af;
          font-size: 10px;
        }

        .pc-league-label {
          color: #6b7280;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1.2px;
          margin-top: 4px;
        }

        .pc-leaderboard {
          display: flex;
          flex-direction: column;
          gap: 6px;
          position: relative;
        }
        .pc-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 10px;
          transition: all 0.3s;
        }
        .pc-row-1 {
          background: linear-gradient(
            90deg,
            rgba(250, 204, 21, 0.18),
            rgba(250, 204, 21, 0.05)
          );
          border: 1px solid rgba(250, 204, 21, 0.3);
          animation: pc-rank-down 5s ease-in-out infinite 2s;
        }
        .pc-row-2 {
          background: rgba(255, 255, 255, 0.04);
          animation: pc-rank-up 5s ease-in-out infinite 2s;
        }
        .pc-row-3 {
          background: rgba(255, 255, 255, 0.04);
        }
        .pc-row-4 {
          background: rgba(255, 255, 255, 0.04);
        }
        .pc-rank {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 600;
          color: #9ca3af;
        }
        .pc-row-1 .pc-rank {
          background: #fbbf24;
          color: #000;
        }
        .pc-name {
          flex: 1;
          color: #fff;
          font-size: 12px;
          font-weight: 500;
        }
        .pc-me-badge {
          background: #6366f1;
          color: #fff;
          font-size: 9px;
          font-weight: 600;
          padding: 1px 5px;
          border-radius: 3px;
          margin-left: 4px;
        }
        .pc-points {
          color: #fff;
          font-size: 12px;
          font-weight: 600;
        }
        .pc-row-1 .pc-points {
          color: #fbbf24;
        }

        .pc-notif {
          position: absolute;
          top: 60px;
          right: 14px;
          background: rgba(15, 15, 25, 0.95);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(99, 102, 241, 0.4);
          border-radius: 10px;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: pc-notif-slide 7s ease-in-out infinite;
          z-index: 20;
        }
        .pc-notif-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
          animation: pc-pulse-dot 1s infinite;
        }
        .pc-notif-text {
          color: #fff;
          font-size: 10px;
          font-weight: 500;
        }

        .pc-home-indicator {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 120px;
          height: 4px;
          background: #fff;
          border-radius: 2px;
          opacity: 0.4;
        }
      `}</style>
    </div>
  );
}
