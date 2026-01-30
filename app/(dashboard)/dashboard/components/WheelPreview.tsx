import type { WheelItem } from "@/types/db";

type WheelPreviewItem = Pick<
  WheelItem,
  "label" | "max_wins" | "kind" | "is_active"
>;

type WheelPreviewProps = {
  items: WheelPreviewItem[];
  baseParticipations: number;
  size?: number;
};

const palette = [
  "#6366f1",
  "#22c55e",
  "#f97316",
  "#0ea5e9",
  "#f43f5e",
  "#a855f7",
  "#14b8a6",
  "#eab308",
];

const buildGradient = (
  items: WheelPreviewItem[],
  baseParticipations: number
) => {
  const filtered = items.filter((item) => item.is_active && item.max_wins > 0);
  const totalWins = filtered.reduce((sum, item) => sum + item.max_wins, 0);
  const perte = Math.max(0, baseParticipations - totalWins);
  const total = totalWins + perte;
  if (!total) {
    return "conic-gradient(#1f2937 0deg 360deg)";
  }
  let current = 0;
  const parts: string[] = [];
  filtered.forEach((item, index) => {
    const start = (current / total) * 360;
    current += item.max_wins;
    const end = (current / total) * 360;
    const color = palette[index % palette.length];
    parts.push(`${color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`);
  });
  if (perte > 0) {
    const start = (current / total) * 360;
    current += perte;
    const end = (current / total) * 360;
    parts.push(`#64748b ${start.toFixed(2)}deg ${end.toFixed(2)}deg`);
  }
  return `conic-gradient(${parts.join(", ")})`;
};

export default function WheelPreview({
  items,
  baseParticipations,
  size = 220,
}: WheelPreviewProps) {
  const gradient = buildGradient(items, baseParticipations);
  const activeItems = items.filter((item) => item.is_active && item.max_wins > 0);
  const totalUsed = activeItems.reduce((sum, item) => sum + item.max_wins, 0);
  const perteCount = Math.max(0, baseParticipations - totalUsed);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative flex items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-[0_15px_35px_rgba(15,23,42,0.25)]"
        style={{
          width: size,
          height: size,
          background: gradient,
        }}
      >
        <div className="h-5 w-5 rounded-full bg-white shadow-md" />
      </div>
      <div className="grid w-full gap-2 text-xs text-slate-300">
        {activeItems.length === 0 && perteCount <= 0 ? (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-center text-slate-400">
            Ajoutez des lots actifs pour voir la roue.
          </p>
        ) : (
          <>
            {activeItems.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: palette[index % palette.length] }}
                  />
                  <span>{item.label}</span>
                </div>
                <span className="text-slate-400">{item.max_wins} fois</span>
              </div>
            ))}
            {perteCount > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: "#64748b" }}
                  />
                  <span>Perdu</span>
                </div>
                <span className="text-slate-400">{perteCount} fois</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
