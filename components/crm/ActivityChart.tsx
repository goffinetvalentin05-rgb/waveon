"use client";

import { useMemo, useState } from "react";
import type { ActivityPoint } from "@/lib/crm/dashboard";

const SERIES: { key: keyof Omit<ActivityPoint, "date">; label: string; color: string }[] = [
  { key: "prospects", label: "Prospects", color: "#3DD9A4" },
  { key: "emails", label: "Emails", color: "#5EEAD4" },
  { key: "calls", label: "Appels", color: "#FBBF24" },
  { key: "messages", label: "Messages", color: "#67E8F9" },
  { key: "meetings", label: "RDV", color: "#A78BFA" },
];

export function ActivityChart({
  series7,
  series30,
  series90,
}: {
  series7: ActivityPoint[];
  series30: ActivityPoint[];
  series90: ActivityPoint[];
}) {
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const data = range === "7" ? series7 : range === "90" ? series90 : series30;
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  const max = useMemo(() => {
    let m = 1;
    for (const p of data) {
      for (const s of SERIES) {
        if (!hidden[s.key]) m = Math.max(m, p[s.key]);
      }
    }
    return m;
  }, [data, hidden]);

  const w = 640;
  const h = 180;
  const pad = { t: 12, r: 8, b: 22, l: 22 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const pathFor = (key: keyof Omit<ActivityPoint, "date">) => {
    if (data.length === 0) return "";
    return data
      .map((p, i) => {
        const x = pad.l + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
        const y = pad.t + innerH - (p[key] / max) * innerH;
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  };

  return (
    <section className="wo-widget p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold text-wo-text">Activité de prospection</h2>
        <div className="inline-flex rounded-lg border border-wo-border p-0.5">
          {(["7", "30", "90"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setRange(id)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                range === id ? "bg-wo-accent-soft text-wo-accent" : "text-wo-muted hover:text-wo-text"
              }`}
            >
              {id === "7" ? "7 jours" : id === "30" ? "30 jours" : "3 mois"}
            </button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-[180px] w-full" role="img" aria-label="Activité">
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={pad.l}
            x2={w - pad.r}
            y1={pad.t + innerH * (1 - t)}
            y2={pad.t + innerH * (1 - t)}
            stroke="rgba(180,220,205,0.08)"
          />
        ))}
        {SERIES.map((s) =>
          hidden[s.key] ? null : (
            <path key={s.key} d={pathFor(s.key)} fill="none" stroke={s.color} strokeWidth="1.8" />
          )
        )}
        {data.length > 0 ? (
          <>
            <text x={pad.l} y={h - 4} className="fill-wo-dim" fontSize="10">
              {data[0]?.date.slice(5)}
            </text>
            <text x={w - pad.r} y={h - 4} textAnchor="end" className="fill-wo-dim" fontSize="10">
              {data[data.length - 1]?.date.slice(5)}
            </text>
          </>
        ) : null}
      </svg>
      <div className="mt-1 flex flex-wrap gap-3">
        {SERIES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setHidden((h) => ({ ...h, [s.key]: !h[s.key] }))}
            className={`inline-flex items-center gap-1.5 text-[11px] ${
              hidden[s.key] ? "text-wo-dim line-through" : "text-wo-muted"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </button>
        ))}
      </div>
    </section>
  );
}
