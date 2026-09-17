"use client";

import { SMART_VIEWS, type SmartViewId } from "@/lib/crm/smart-views";
import type { ProspectWorkCounts } from "@/lib/crm/counters";

const COUNT_KEY: Record<SmartViewId, keyof ProspectWorkCounts | null> = {
  all: "all",
  to_contact: "toContact",
  today_work: "followToday",
  overdue: "overdue",
  no_reply: "noReply",
  replied: "replied",
  demo_to_plan: "demoToPlan",
  demo_scheduled: "demoScheduled",
  after_demo: "afterDemo",
  considering: "considering",
  offer_sent: "offerSent",
  clients: "clients",
  lost: "lost",
};

export function SmartViewBar({
  active,
  counts,
  onSelect,
}: {
  active: SmartViewId;
  counts?: ProspectWorkCounts | null;
  onSelect: (id: SmartViewId) => void;
}) {
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      {SMART_VIEWS.filter((view) => view.pin).map((view) => {
        const selected = active === view.id;
        const key = COUNT_KEY[view.id];
        const n = counts && key ? counts[key] : null;
        return (
          <button
            key={view.id}
            type="button"
            onClick={() => onSelect(view.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              selected
                ? "border-emerald-400/30 bg-emerald-400/12 text-emerald-300"
                : "border-white/[0.06] bg-white/[0.03] text-wo-muted hover:border-white/15 hover:text-wo-text"
            }`}
          >
            {view.label}
            {n != null ? (
              <span className={`tabular-nums ${selected ? "text-emerald-400/70" : "text-wo-dim"}`}>{n}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
