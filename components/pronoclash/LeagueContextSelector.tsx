"use client";

import type { LeagueContextId } from "@/lib/pronoclash/league-context-url";

export type LeagueContextOption = {
  id: LeagueContextId;
  name: string;
  kind: "general" | "private" | "pro";
};

type Props = {
  options: LeagueContextOption[];
  active: LeagueContextId;
  onChange: (id: LeagueContextId) => void;
  hint?: string;
};

export function LeagueContextSelector({ options, active, onChange, hint }: Props) {
  return (
    <div className="pc-league-context">
      {hint ? <p className="pc-league-context-hint">{hint}</p> : null}
      <div className="pc-league-tabs pc-league-tabs-premium" role="tablist" aria-label="Contexte de pronostic">
        {options.map((opt) => {
          const isActive =
            (opt.id === null && active === null) || (opt.id !== null && opt.id === active);
          return (
            <button
              key={opt.id ?? "global"}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`pc-league-tab${isActive ? " active" : ""}`}
              onClick={() => onChange(opt.id)}
            >
              {opt.kind === "general" ? (
                <span className="pc-league-tab-dot general" aria-hidden />
              ) : (
                <span className="pc-league-tab-dot private" aria-hidden />
              )}
              {opt.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
