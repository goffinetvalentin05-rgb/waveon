import { ui } from "@/lib/design/tokens";

type ComingSoonProps = {
  title: string;
  description: string;
};

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center text-center crm-animate-in">
      <div className={`${ui.card} w-full px-8 py-12`}>
        <p className="text-xs font-medium uppercase tracking-wider text-[#6a6578]">
          Bientôt disponible
        </p>
        <h1 className={`${ui.h1} mt-3`}>{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#8b869c]">{description}</p>
      </div>
    </div>
  );
}
