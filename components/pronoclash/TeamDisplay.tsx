import { resolveTeamDisplay } from "@/lib/pronoclash/country-display";

type TeamDisplayProps = {
  name: string | null | undefined;
  country_code?: string | null;
  flag_emoji?: string | null;
  placeholder?: string | null;
  align?: "left" | "center" | "right";
  size?: "sm" | "md" | "lg";
  showCountryName?: boolean;
};

const BADGE_SIZE = { sm: 36, md: 44, lg: 52 } as const;

export function TeamDisplay({
  name,
  country_code,
  flag_emoji,
  placeholder,
  align = "left",
  size = "md",
  showCountryName = true,
}: TeamDisplayProps) {
  const info = resolveTeamDisplay({ name, country_code, flag_emoji, placeholder });
  const badgePx = BADGE_SIZE[size];

  return (
    <div
      className={`pc-team-display pc-team-display-${align}`}
      style={align === "right" ? { alignItems: "flex-end", textAlign: "right" } : undefined}
    >
      <span
        className="pc-team-flag pc-team-flag-round"
        style={{ width: badgePx, height: badgePx, fontSize: size === "lg" ? 26 : size === "md" ? 22 : 18 }}
        aria-hidden
      >
        {info.flag}
      </span>
      <div className="pc-team-labels">
        <span className="pc-team-name">{info.teamName}</span>
        {showCountryName && info.countryName !== info.teamName ? (
          <span className="pc-team-country">{info.countryName}</span>
        ) : null}
      </div>
    </div>
  );
}
