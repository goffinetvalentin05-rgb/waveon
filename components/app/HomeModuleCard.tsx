import Link from "next/link";
import type { AppModule, HomeSummary } from "@/modules/types";

type HomeModuleCardProps = {
  module: AppModule;
  summary?: HomeSummary | null;
  index?: number;
};

/** Server Component — les icônes (fonctions) ne doivent pas traverser la frontière client. */
export function HomeModuleCard({ module, summary, index = 0 }: HomeModuleCardProps) {
  const Icon = module.icon;
  const delayClass =
    index === 0
      ? "crm-animate-in"
      : index === 1
        ? "crm-animate-in-delay-1"
        : index === 2
          ? "crm-animate-in-delay-2"
          : "crm-animate-in-delay-3";

  return (
    <Link
      href={module.href}
      className={`group relative flex aspect-square flex-col justify-between overflow-hidden rounded-3xl border border-[#e8eef6] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_32px_-12px_rgba(37,99,235,0.2)] active:scale-[0.98] sm:p-7 ${delayClass}`}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${module.accent.iconBg} ${module.accent.iconColor} transition group-hover:scale-105`}
      >
        <Icon className="h-6 w-6" stroke={1.6} />
      </div>

      <div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          {module.label}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
          {module.description}
        </p>
        {summary ? (
          <p className="mt-4 text-xs font-medium text-slate-400">{summary.label}</p>
        ) : null}
      </div>

      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-slate-50 opacity-0 transition group-hover:opacity-100"
      />
    </Link>
  );
}
