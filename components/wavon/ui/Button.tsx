import type { ButtonHTMLAttributes } from "react";
import { btnGhostClass, btnPrimaryClass, btnSecondaryClass } from "@/lib/wavon/tokens";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary: btnPrimaryClass,
  secondary: btnSecondaryClass,
  ghost: btnGhostClass,
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button type="button" className={`${variants[variant]} ${className}`} {...props} />;
}
