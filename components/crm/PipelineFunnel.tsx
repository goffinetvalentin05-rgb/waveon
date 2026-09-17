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
    <section className="wo-widget p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight text-wo-text">Pipeline</h2>
        <Link href={`/projects/${projectId}/pipeline`} className="text-[13px] font-medium text-wo-muted hover:text-wo-text">
          Voir le kanban
        </Link>
      </div>
      <div className="flex flex-col gap-1.5">
        {stages.map((stage) => (
            <Link
              key={stage.id}
              href={`/projects/${projectId}/prospects?status=${encodeURIComponent(stage.status)}`}
              className="group flex items-center gap-3 py-1"
            >
              <span className="w-[7.5rem] shrink-0 truncate text-[12px] text-wo-muted group-hover:text-wo-text">
                {stage.label}
              </span>
              <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[#f1f1ee]">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-[#0f9f70]/70"
                  style={{ width: `${Math.max(stage.count ? 6 : 0, (stage.count / max) * 100)}%` }}
                />
              </div>
              <span className="w-8 text-right text-[13px] font-semibold tabular-nums text-wo-text">
                {stage.count}
              </span>
            </Link>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-wo-dim">{total} prospects dans le pipeline actif</p>
    </section>
  );
}
