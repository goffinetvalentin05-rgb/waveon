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
      {SMART_VIEWS.filter((view) => view.id !== "clients").map((view) => {
        const selected = active === view.id;
        const key = COUNT_KEY[view.id];
        const n = counts && key ? counts[key] : null;
        return (
          <button
            key={view.id}
            type="button"
            onClick={() => onSelect(view.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              selected
                ? "bg-white text-[#111]"
                : "bg-wo-hover text-wo-muted hover:bg-white/[0.08] hover:text-wo-text"
            }`}
          >
            {view.label}
            {n != null ? (
              <span className={`tabular-nums ${selected ? "text-[#111]/55" : "text-wo-dim"}`}>{n}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
