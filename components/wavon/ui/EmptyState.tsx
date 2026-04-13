import { btnPrimaryClass } from "@/lib/wavon/tokens";

type EmptyStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/40 px-6 py-14 text-center">
      <p className="text-sm font-medium text-neutral-900">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-500">{description}</p>
      ) : null}
      {actionLabel && onAction ? (
        <button type="button" className={`${btnPrimaryClass} mt-6`} onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
