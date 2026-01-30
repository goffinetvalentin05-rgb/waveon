"use client";

type WizardStepProps = {
  step: number;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export default function WizardStep({
  step,
  title,
  description,
  children,
}: WizardStepProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_20px_45px_rgba(15,23,42,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Étape {step}
          </p>
          <h3 className="mt-1 text-base font-semibold text-white">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-sm text-slate-300">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

