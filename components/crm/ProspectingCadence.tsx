"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { ActivityPoint } from "@/lib/crm/dashboard";

type Range = "7" | "30" | "90";

type Bucket = {
  key: string;
  label: string;
  total: number;
  prospects: number;
  touches: number;
  meetings: number;
};

const RANGE_LABELS: Record<Range, string> = {
  "7": "7 jours",
  "30": "30 jours",
  "90": "3 mois",
};

function bucketize(points: ActivityPoint[], size: number, daily: boolean): Bucket[] {
  const buckets: Bucket[] = [];
  for (let i = 0; i < points.length; i += size) {
    const slice = points.slice(i, i + size);
    if (slice.length === 0) continue;
    const prospects = slice.reduce((s, p) => s + p.prospects, 0);
    const touches = slice.reduce((s, p) => s + p.emails + p.calls + p.messages, 0);
    const meetings = slice.reduce((s, p) => s + p.meetings, 0);
    const start = parseISO(`${slice[0].date}T12:00:00`);
    buckets.push({
      key: slice[0].date,
      label: daily
        ? format(start, "EEEEE", { locale: fr }).toUpperCase()
        : format(start, "d MMM", { locale: fr }),
      total: prospects + touches + meetings,
      prospects,
      touches,
      meetings,
    });
  }
  return buckets;
}

export function ProspectingCadence({
  series7,
  series30,
  series90,
}: {
  series7: ActivityPoint[];
  series30: ActivityPoint[];
  series90: ActivityPoint[];
}) {
  const [range, setRange] = useState<Range>("30");

  const buckets = useMemo(() => {
    if (range === "7") return bucketize(series7, 1, true);
    if (range === "30") return bucketize(series30, 3, false);
    return bucketize(series90, 9, false);
  }, [range, series7, series30, series90]);

  const max = Math.max(1, ...buckets.map((b) => b.total));
  const total = buckets.reduce((s, b) => s + b.total, 0);
  const peak = buckets.reduce<Bucket | null>((best, b) => (!best || b.total > best.total ? b : best), null);
  const totals = buckets.reduce(
    (acc, b) => ({
      prospects: acc.prospects + b.prospects,
      touches: acc.touches + b.touches,
      meetings: acc.meetings + b.meetings,
    }),
    { prospects: 0, touches: 0, meetings: 0 }
  );

  return (
    <section className="wo-widget h-full p-4 lg:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-wo-text">Cadence de prospection</h2>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-[1.55rem] font-semibold tabular-nums tracking-tight text-wo-text lg:text-[1.9rem]">
              {total}
            </span>
            <span className="text-[12px] text-wo-muted lg:text-[12.5px]">actions sur {RANGE_LABELS[range].toLowerCase()}</span>
          </p>
        </div>
        <div className="wo-segment">
          {(["7", "30", "90"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setRange(id)}
              className={range === id ? "wo-segment-item wo-segment-item-active" : "wo-segment-item"}
            >
              <span className="lg:hidden">{id === "90" ? "3m" : `${id}j`}</span>
              <span className="hidden lg:inline">{RANGE_LABELS[id]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex h-[118px] items-end gap-1 lg:mt-6 lg:h-[172px] lg:gap-2">
        {buckets.map((b) => {
          const isPeak = peak !== null && b.key === peak.key && b.total > 0;
          const height = b.total === 0 ? 3 : Math.max(8, (b.total / max) * 100);
          return (
            <div key={b.key} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
              <div className="relative flex w-full flex-1 items-end justify-center">
                {isPeak ? (
                  <span className="absolute -top-1 hidden rounded-full border border-wo-accent/30 bg-wo-accent-soft px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#f3a35c] lg:inline">
                    {b.total}
                  </span>
                ) : null}
                <div
                  className={`w-full rounded-t-[10px] rounded-b-[4px] transition-all duration-200 ${
                    isPeak
                      ? "bg-[linear-gradient(180deg,#f3a35c_0%,#d97732_45%,rgba(200,102,45,0.28)_100%)] shadow-[0_0_24px_-4px_rgba(217,119,50,0.55)]"
                      : "bg-[linear-gradient(180deg,rgba(247,243,238,0.22)_0%,rgba(247,243,238,0.08)_60%,rgba(247,243,238,0.03)_100%)] group-hover:bg-[linear-gradient(180deg,rgba(217,119,50,0.55)_0%,rgba(217,119,50,0.16)_100%)]"
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${b.total} action${b.total > 1 ? "s" : ""}`}
                />
              </div>
              <span className="truncate text-[10px] font-medium text-wo-dim">{b.label}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 hidden grid-cols-3 gap-2 border-t border-wo-border pt-4 lg:mt-5 lg:grid">
        {[
          { label: "Nouveaux prospects", value: totals.prospects, dot: "bg-[#f3a35c]" },
          { label: "Contacts envoyés", value: totals.touches, dot: "bg-[#d97732]" },
          { label: "Rendez-vous", value: totals.meetings, dot: "bg-[#d4b48c]" },
        ].map((item) => (
          <div key={item.label}>
            <span className="flex items-center gap-1.5 text-[11px] text-wo-dim">
              <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
              {item.label}
            </span>
            <p className="mt-1 font-display text-[1.1rem] font-semibold tabular-nums text-wo-text">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
