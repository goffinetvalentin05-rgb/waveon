import type { ButtonHTMLAttributes, ReactNode } from "react";

type GradientButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  block?: boolean;
  large?: boolean;
};

export function GradientButton({
  children,
  block = false,
  large = false,
  className = "",
  type = "button",
  ...rest
}: GradientButtonProps) {
  return (
    <button
      type={type}
      className={`pc-btn primary${block ? " block" : ""}${large ? " lg" : ""} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
