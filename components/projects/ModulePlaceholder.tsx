import { ui } from "@/lib/design/tokens";

export function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className={`${ui.card} px-6 py-10 sm:px-8`}>
      <p className={ui.kicker}>Module prêt</p>
      <h2 className={`${ui.h2} mt-3 text-lg`}>{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-wo-muted">{description}</p>
    </div>
  );
}
