"use client";

type StatsCardProps = {
  label: string;
  value: string | number;
  hint?: string;
};

export default function StatsCard({ label, value, hint }: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.35)]">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

