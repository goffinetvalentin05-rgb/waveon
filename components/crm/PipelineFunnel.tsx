import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import type { PipelineStageCount } from "@/lib/crm/dashboard";

const STAGE_TONES: Record<string, string> = {
  to_contact: "from-zinc-400/70 to-zinc-500/20",
  follow_up_1: "from-amber-300/80 to-amber-500/20",
  follow_up_2: "from-orange-300/80 to-orange-500/20",
  relay: "from-sky-300/80 to-sky-500/20",
  discussion: "from-violet-300/80 to-violet-500/20",
  demo: "from-cyan-300/80 to-cyan-500/20",
  awaiting_decision: "from-teal-300/80 to-teal-500/20",
  client: "from-emerald-300/90 to-emerald-500/25",
};

export function PipelineFunnel({
  stages,
  projectId,
}: {
  stages: PipelineStageCount[];
  projectId: string;
}) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  const total = stages.reduce((s, x) => s + x.count, 0);
  const clients = stages.find((s) => s.id === "client")?.count ?? 0;
  const conversion = total > 0 ? Math.round((clients / total) * 100) : 0;

  return (
    <section className="wo-widget wo-card-accent h-full p-4 lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-wo-text">Pipeline</h2>
          <p className="mt-1 text-[12.5px] text-wo-muted">
            {total} prospects actifs · {conversion}% convertis
          </p>
        </div>
        <Link
          href={`/projects/${projectId}/pipeline`}
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-wo-accent transition hover:text-wo-text"
        >
          Voir
          <IconArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 flex flex-col gap-2 lg:mt-5 lg:gap-2.5">
        {stages.map((stage) => {
          const pct = Math.round((stage.count / max) * 100);
          return (
            <Link
              key={stage.id}
              href={`/projects/${projectId}/prospects?status=${encodeURIComponent(stage.status)}`}
              className={`group ${stage.count === 0 ? "hidden lg:block" : ""}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[12.5px] text-wo-muted transition group-hover:text-wo-text">
                  {stage.label}
                </span>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-wo-text">{stage.count}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.05] lg:h-2">
                <div
                  className={`h-full rounded-full bg-gradient-to-r transition-all duration-300 ${
                    STAGE_TONES[stage.id] ?? "from-white/40 to-white/10"
                  }`}
                  style={{ width: `${stage.count === 0 ? 0 : Math.max(6, pct)}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
