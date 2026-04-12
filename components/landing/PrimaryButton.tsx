import Link from "next/link";

type PrimaryButtonProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export function PrimaryButton({ href, children, className = "" }: PrimaryButtonProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-black/20 transition hover:bg-zinc-100 active:scale-[0.98] ${className}`}
    >
      {children}
    </Link>
  );
}
