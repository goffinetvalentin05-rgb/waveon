import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/brand/config";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  href?: string | null;
  className?: string;
  /** Afficher uniquement le pictogramme (sans le nom). */
  markOnly?: boolean;
};

const sizeMap = {
  sm: { font: "text-base", mark: 28 },
  md: { font: "text-lg", mark: 32 },
  lg: { font: "text-xl", mark: 40 },
} as const;

export function Logo({ size = "md", href = "/", className = "", markOnly = false }: LogoProps) {
  const s = sizeMap[size];

  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        className="relative shrink-0 drop-shadow-[0_0_14px_rgba(59,130,246,0.35)]"
        aria-hidden={markOnly ? undefined : true}
      >
        <Image
          src="/logo-waevon.png"
          alt=""
          width={s.mark}
          height={s.mark}
          className="rounded-md"
          priority={size === "md"}
        />
      </span>
      {markOnly ? null : (
        <span className={`${s.font} font-display font-semibold tracking-tight text-white`}>
          {brand.name}
        </span>
      )}
    </span>
  );

  const labelled = markOnly ? (
    <span aria-label={brand.name}>{content}</span>
  ) : (
    content
  );

  if (!href) return labelled;
  return (
    <Link href={href} className="inline-flex items-center" aria-label={brand.name}>
      {labelled}
    </Link>
  );
}
