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
      ? "relative h-14 w-[16rem] shrink-0 sm:h-16 sm:w-[19rem] md:h-[4.5rem] md:w-[22rem] lg:h-20 lg:w-[26rem]"
      : "relative h-7 w-[8.5rem] shrink-0 sm:h-8 sm:w-[10rem]";

  const sizes =
    variant === "header"
      ? "(max-width: 640px) 280px, (max-width: 1024px) 380px, 440px"
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
