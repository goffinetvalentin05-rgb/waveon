import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type SharedProps = {
  children: ReactNode;
  block?: boolean;
  className?: string;
};

type ButtonProps = SharedProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type LinkProps = SharedProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export function SecondaryButton(props: ButtonProps | LinkProps) {
  const { children, block = false, className = "" } = props;
  const cls = `pc-btn ghost${block ? " block" : ""} ${className}`.trim();

  if ("href" in props && props.href) {
    const { href, ...linkRest } = props;
    return (
      <Link href={href} className={cls} {...linkRest}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...btnRest } = props as ButtonProps;
  return (
    <button type={type} className={cls} {...btnRest}>
      {children}
    </button>
  );
}
