"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type WheelSegment = {
  label: string;
  kind: "win" | "lose";
};

type RewardWheelProps = {
  segments: WheelSegment[];
  primaryColor?: string;
  secondaryColor?: string;
  size?: number;
  businessName: string;
  logoUrl?: string | null;
  /** After spin, the result label to land on */
  resultLabel: string | null;
  /** If false, show wheel already at result (e.g. returning user). If true, animate spin. */
  animateSpin?: boolean;
  /** Callback when spin animation has finished */
  onSpinEnd?: () => void;
};

const DEFAULT_PRIMARY = "#0f172a";
const DEFAULT_SECONDARY = "#6366f1";

const SEGMENT_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f97316",
  "#0ea5e9",
  "#a855f7",
  "#14b8a6",
  "#eab308",
  "#f43f5e",
];

export default function RewardWheel({
  segments,
  primaryColor = DEFAULT_PRIMARY,
  secondaryColor = DEFAULT_SECONDARY,
  size = 280,
  businessName,
  logoUrl,
  resultLabel,
  animateSpin = true,
  onSpinEnd,
}: RewardWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const prevResultRef = useRef<string | null>(null);
  const onSpinEndRef = useRef(onSpinEnd);
  onSpinEndRef.current = onSpinEnd;

  const n = Math.max(segments.length, 1);
  const segmentAngle = 360 / n;

  const MIN_FULL_TURNS = 5;

  const getRotationForLabel = useCallback(
    (label: string) => {
      const index = segments.findIndex((s) => s.label === label);
      const targetIndex = index >= 0 ? index : 0;
      const segmentCenterOffset = 360 - (targetIndex + 0.5) * segmentAngle;
      return segmentCenterOffset;
    },
    [segments, segmentAngle]
  );

  /** Rotation = previous + at least 5 full turns + segment offset so result is deterministic. */
  const spinToResult = useCallback(
    (label: string, animate: boolean) => {
      const index = segments.findIndex((s) => s.label === label);
      const targetIndex = index >= 0 ? index : 0;
      const segmentCenterOffset = 360 - (targetIndex + 0.5) * segmentAngle;
      setRotation((prev) => prev + 360 * MIN_FULL_TURNS + segmentCenterOffset);
      setIsSpinning(animate);
    },
    [segments, segmentAngle]
  );

  useEffect(() => {
    if (!resultLabel) return;
    if (resultLabel !== prevResultRef.current) {
      prevResultRef.current = resultLabel;
      spinToResult(resultLabel, animateSpin);
    }
  }, [resultLabel, animateSpin, spinToResult]);

  useEffect(() => {
    if (resultLabel && !animateSpin) {
      setRotation(getRotationForLabel(resultLabel));
    }
  }, [resultLabel, animateSpin, getRotationForLabel]);

  useEffect(() => {
    if (!isSpinning) return;
    const duration = 4000;
    const id = setTimeout(() => {
      setIsSpinning(false);
      setHasSpun(true);
      prevResultRef.current = null;
      onSpinEndRef.current?.();
    }, duration);
    return () => clearTimeout(id);
  }, [isSpinning]);

  if (segments.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-full border-2 border-zinc-200 bg-zinc-100 text-zinc-500"
        style={{ width: size, height: size }}
      >
        <span className="text-sm">Aucun lot</span>
      </div>
    );
  }

  const radius = size / 2;
  const strokeWidth = 8;
  const innerRadius = radius - strokeWidth;
  const textRadius = innerRadius * 0.65;

  return (
    <div className="relative flex flex-col items-center">
      {/* Pointer fixed at top */}
      <div
        className="absolute z-10 transition-transform"
        style={{
          top: -4,
          left: "50%",
          marginLeft: -20,
          width: 0,
          height: 0,
          borderLeft: "20px solid transparent",
          borderRight: "20px solid transparent",
          borderTop: "28px solid " + primaryColor,
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
        }}
      />
      <div
        className="relative rounded-full transition-transform ease-out"
        style={{
          width: size,
          height: size,
          transform: `rotate(${rotation}deg)`,
          transitionDuration: isSpinning ? "4000ms" : "0ms",
          transitionTimingFunction: isSpinning
            ? "cubic-bezier(0.17, 0.67, 0.12, 0.99)"
            : "ease-out",
          boxShadow:
            "0 0 0 4px rgba(255,255,255,0.9), 0 20px 60px rgba(0,0,0,0.25), 0 0 80px rgba(99,102,241,0.15)",
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible rounded-full"
        >
          <defs>
            <filter id="wheel-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {SEGMENT_COLORS.map((color, i) => (
              <linearGradient
                key={i}
                id={`seg-${i}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={color} stopOpacity={1} />
                <stop offset="100%" stopColor={color} stopOpacity={0.85} />
              </linearGradient>
            ))}
          </defs>
          <g transform={`translate(${radius}, ${radius})`}>
            {segments.map((seg, i) => {
              const startAngle = (i * segmentAngle - 90) * (Math.PI / 180);
              const endAngle = ((i + 1) * segmentAngle - 90) * (Math.PI / 180);
              const x1 = innerRadius * Math.cos(startAngle);
              const y1 = innerRadius * Math.sin(startAngle);
              const x2 = innerRadius * Math.cos(endAngle);
              const y2 = innerRadius * Math.sin(endAngle);
              const largeArc = segmentAngle > 180 ? 1 : 0;
              const pathD = [
                `M 0 0`,
                `L ${x1} ${y1}`,
                `A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${x2} ${y2}`,
                "Z",
              ].join(" ");
              const midAngle = (startAngle + endAngle) / 2;
              const tx = textRadius * Math.cos(midAngle);
              const ty = textRadius * Math.sin(midAngle);
              const rot = (midAngle * 180) / Math.PI + 90;
              const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
              return (
                <g key={`${seg.label}-${i}`}>
                  <path
                    d={pathD}
                    fill={`url(#seg-${i % SEGMENT_COLORS.length})`}
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth={1.5}
                  />
                  <text
                    x={tx}
                    y={ty}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fff"
                    fontSize={Math.min(14, Math.floor(180 / n))}
                    fontWeight="600"
                    transform={`rotate(${rot} ${tx} ${ty})`}
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
                  >
                    {seg.label.length > 12
                      ? seg.label.slice(0, 10) + "…"
                      : seg.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
        {/* Center cap */}
        <div
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-white shadow-lg"
          style={{
            width: size * 0.18,
            height: size * 0.18,
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <span
              className="text-xs font-bold"
              style={{ color: primaryColor }}
            >
              {businessName.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
