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
      ? "relative h-9 w-[10.5rem] shrink-0 sm:h-10 sm:w-[12rem] md:h-11 md:w-[13.5rem]"
      : "relative h-7 w-[8.5rem] shrink-0 sm:h-8 sm:w-[10rem]";

  return (
    <Link href="/" className={`inline-block ${box}`}>
      <Image
        src={brand.logo.src}
        alt={brand.logo.alt}
        fill
        className="object-contain object-left"
        sizes="(max-width: 640px) 168px, 220px"
        priority={variant === "header"}
      />
    </Link>
  );
}
