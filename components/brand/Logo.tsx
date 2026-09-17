import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/brand/config";

export const RAVEN_LOGO_SRC = "/brand/raven-logo.png";

type LogoSize = "sm" | "md" | "lg";

const SIZE_PX: Record<LogoSize, number> = {
  sm: 28,
  md: 34,
  lg: 48,
};

type RavenLogoProps = {
  size?: LogoSize;
  /** `mark` = picto seul. `lockup` = logo + Raven + sous-texte. */
  variant?: "mark" | "lockup";
  href?: string | null;
  className?: string;
  showTagline?: boolean;
  priority?: boolean;
  onClick?: () => void;
};

function Mark({ size, labeled, priority }: { size: LogoSize; labeled: boolean; priority?: boolean }) {
  const px = SIZE_PX[size];
  return (
    <span
      className="raven-logo-mark relative inline-flex shrink-0 items-center justify-center"
      style={{ width: px, height: px }}
    >
      <Image
        src={RAVEN_LOGO_SRC}
        alt={labeled ? brand.name : ""}
        width={px}
        height={px}
        className="h-full w-full object-contain object-center"
        priority={priority}
        sizes={`${px}px`}
      />
    </span>
  );
}

export function RavenLogo({
  size = "md",
  variant = "mark",
  href,
  className = "",
  showTagline,
  priority = false,
  onClick,
}: RavenLogoProps) {
  const lockup = variant === "lockup";
  const tagline = showTagline ?? lockup;
  const labeled = !lockup;

  const content = (
    <span className={`inline-flex min-w-0 items-center gap-2.5 ${className}`}>
      <Mark size={size} labeled={labeled} priority={priority} />
      {lockup ? (
        <span className="min-w-0">
          <span className="block truncate font-display text-[16px] font-semibold leading-tight tracking-tight text-white">
            {brand.name}
          </span>
          {tagline ? (
            <span className="mt-0.5 block text-[10.5px] font-medium uppercase tracking-[0.14em] text-wo-dim">
              {brand.tagline}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );

  if (!href) {
    return labeled ? <span aria-label={brand.name}>{content}</span> : content;
  }

  return (
    <Link
      href={href}
      className="inline-flex min-w-0 items-center"
      aria-label={lockup ? undefined : brand.name}
      onClick={onClick}
    >
      {content}
    </Link>
  );
}

export const AppLogo = RavenLogo;
