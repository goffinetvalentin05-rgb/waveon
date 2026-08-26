import { ui } from "@/lib/design/tokens";

type ComingSoonProps = {
  title: string;
  description: string;
};

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center text-center crm-animate-in">
      <div className={`${ui.card} w-full px-8 py-12`}>
        <p className={ui.kicker}>Bientôt disponible</p>
        <h1 className={`${ui.h1} mt-3`}>{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-wo-muted">{description}</p>
      </div>
    </div>
  );
}
