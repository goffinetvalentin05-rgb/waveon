import Link from "next/link";
import { brand } from "@/lib/brand/config";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  href?: string | null;
  className?: string;
};

const sizeMap = {
  sm: { font: "text-base", icon: "h-7 w-7" },
  md: { font: "text-lg", icon: "h-8 w-8" },
  lg: { font: "text-xl", icon: "h-10 w-10" },
} as const;

/**
 * Logo Prono Clash : un pictogramme glyphe + le nom.
 * Volontairement sans logo officiel de tournoi / FIFA / etc.
 */
export function Logo({ size = "md", href = "/", className = "" }: LogoProps) {
  const s = sizeMap[size];
  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className={`relative inline-flex ${s.icon} items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 shadow-[0_0_18px_-4px_rgba(99,102,241,0.7)]`}
        aria-hidden
      >
        <svg
          viewBox="0 0 24 24"
          className="h-[58%] w-[58%] text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" fill="currentColor" />
        </svg>
      </span>
      <span
        className={`${s.font} font-display font-semibold tracking-tight text-white`}
      >
        {brand.name}
      </span>
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="inline-flex items-center" aria-label={brand.name}>
      {content}
    </Link>
  );
}
