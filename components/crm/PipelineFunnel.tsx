import Link from "next/link";
import type { PipelineStageCount } from "@/lib/crm/dashboard";

export function PipelineFunnel({
  stages,
  projectId,
}: {
  stages: PipelineStageCount[];
  projectId: string;
}) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  const total = stages.reduce((s, x) => s + x.count, 0);

  return (
    <section className="wo-widget p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold text-wo-text">Pipeline</h2>
        <Link href={`/projects/${projectId}/pipeline`} className="text-[12px] font-medium text-wo-accent">
          Voir le kanban
        </Link>
      </div>
      <div className="flex flex-col gap-1.5">
        {stages.map((stage, i) => {
          const width = 42 + (stage.count / max) * 58;
          return (
            <Link
              key={stage.id}
              href={`/projects/${projectId}/prospects?status=${encodeURIComponent(stage.status)}`}
              className="group flex items-center gap-3"
            >
              <span className="w-[7.5rem] shrink-0 truncate text-[12px] text-wo-muted group-hover:text-wo-text">
                {stage.label}
              </span>
              <div className="relative h-7 flex-1">
                <div
                  className="absolute inset-y-0 left-0 rounded-md bg-wo-accent/15 transition group-hover:bg-wo-accent/25"
                  style={{ width: `${width}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-md bg-wo-accent/40"
                  style={{ width: `${Math.max(stage.count ? 4 : 0, (stage.count / max) * 100)}%` }}
                />
              </div>
              <span className="w-8 text-right text-[13px] font-semibold tabular-nums text-wo-text">
                {stage.count}
              </span>
              {i < stages.length - 1 ? <span className="sr-only">puis</span> : null}
            </Link>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-wo-dim">{total} prospects dans le pipeline actif</p>
    </section>
  );
}
