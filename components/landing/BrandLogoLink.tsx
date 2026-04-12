import Image from "next/image";
import Link from "next/link";
import type { LandingContent } from "@/lib/landing/config";

type Brand = LandingContent["brand"];

type BrandLogoLinkProps = {
  brand: Brand;
  /** header : plus grand ; footer : plus discret */
  variant: "header" | "footer";
};

export function BrandLogoLink({ brand, variant }: BrandLogoLinkProps) {
  const box =
    variant === "header"
      ? "relative h-8 w-[9.25rem] shrink-0 sm:h-9 sm:w-[10.5rem] md:h-9 md:w-[11.25rem]"
      : "relative h-7 w-[8.5rem] shrink-0 sm:h-8 sm:w-[10rem]";

  const sizes =
    variant === "header"
      ? "(max-width: 640px) 200px, (max-width: 1024px) 220px, 240px"
      : "(max-width: 640px) 140px, 180px";

  return (
    <Link href="/" className={`inline-block ${box}`}>
      <Image
        src={brand.logo.src}
        alt={brand.logo.alt}
        fill
        className="object-contain object-left"
        sizes={sizes}
        priority={variant === "header"}
      />
    </Link>
  );
}
