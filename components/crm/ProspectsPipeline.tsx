"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PipelineCard, PipelineCardAvatar } from "@/components/crm/PipelineCard";
import {
  PIPELINE_COLUMNS,
  groupProspectsByPipeline,
  isFollowedProspect,
} from "@/lib/crm/pipeline";
import { prospectDetailHref } from "@/lib/crm/paths";
import type { Prospect, ProspectStatus } from "@/lib/crm/types";

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("button, a, input, textarea, select, label, [draggable='true']")
  );
}

export function ProspectsPipeline({
  prospects,
  listReturnUrl,
  onStatusChange,
}: {
  prospects: Prospect[];
  listReturnUrl: string;
  onStatusChange?: (id: string, status: ProspectStatus) => void;
}) {
  const router = useRouter();
  const groups = groupProspectsByPipeline(prospects);
  const followed = prospects.filter(isFollowedProspect).length;
  const dragged = useRef(false);

  const boardRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);
  const pan = useRef<{
    pointerId: number;
    startX: number;
    startScrollLeft: number;
  } | null>(null);

  const [spacerWidth, setSpacerWidth] = useState(0);
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const updateSpacer = () => {
      setSpacerWidth(board.scrollWidth);
      const top = topScrollRef.current;
      if (top && top.scrollLeft !== board.scrollLeft) {
        syncing.current = true;
        top.scrollLeft = board.scrollLeft;
        syncing.current = false;
      }
    };

    updateSpacer();

    const ro = new ResizeObserver(updateSpacer);
    ro.observe(board);
    Array.from(board.children).forEach((child) => ro.observe(child));

    return () => ro.disconnect();
  }, [prospects]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const onWheel = (e: WheelEvent) => {
      if (!e.shiftKey || e.deltaY === 0) return;
      e.preventDefault();
      board.scrollLeft += e.deltaY;
    };

    board.addEventListener("wheel", onWheel, { passive: false });
    return () => board.removeEventListener("wheel", onWheel);
  }, []);

  const syncScroll = (from: "top" | "board") => {
    if (syncing.current) return;
    const board = boardRef.current;
    const top = topScrollRef.current;
    if (!board || !top) return;

    const source = from === "top" ? top : board;
    const target = from === "top" ? board : top;
    if (target.scrollLeft === source.scrollLeft) return;

    syncing.current = true;
    target.scrollLeft = source.scrollLeft;
    syncing.current = false;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if (isInteractiveTarget(e.target)) return;
    const board = boardRef.current;
    if (!board) return;

    pan.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScrollLeft: board.scrollLeft,
    };
    board.setPointerCapture(e.pointerId);
    setIsPanning(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = pan.current;
    if (!state || state.pointerId !== e.pointerId) return;
    const board = boardRef.current;
    if (!board) return;
    board.scrollLeft = state.startScrollLeft - (e.clientX - state.startX);
  };

  const endPan = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = pan.current;
    if (!state || state.pointerId !== e.pointerId) return;
    pan.current = null;
    setIsPanning(false);
    if (boardRef.current?.hasPointerCapture(e.pointerId)) {
      boardRef.current.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-xs text-wo-muted">
        <span>
          <span className="font-semibold text-wo-text">{followed}</span> prospects en suivi
        </span>
        <span className="text-wo-border">·</span>
        <span>
          <span className="font-semibold text-wo-text">{prospects.length}</span> au total
        </span>
      </div>

      {/* Scrollbar horizontale sticky — desktop / laptop uniquement */}
      <div
        ref={topScrollRef}
        className="wo-pipeline-hscroll sticky top-14 z-20 -mx-4 hidden overflow-x-auto bg-[color:var(--wo-bg)]/95 px-4 py-1.5 backdrop-blur-sm sm:-mx-6 sm:px-6 md:block lg:top-0 lg:-mx-8 lg:px-8"
        onScroll={() => syncScroll("top")}
        aria-hidden="true"
      >
        <div style={{ width: spacerWidth, height: 1 }} />
      </div>

      <div
        ref={boardRef}
        className={`wo-pipeline-board -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 ${
          isPanning ? "cursor-grabbing select-none" : "md:cursor-grab"
        }`}
        onScroll={() => syncScroll("board")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        {PIPELINE_COLUMNS.map((col) => {
          const items = groups[col.id];
          return (
            <div
              key={col.id}
              className="flex w-[260px] shrink-0 flex-col rounded-[1.35rem] border border-wo-border bg-white"
              onDragOver={(e) => {
                if (onStatusChange) e.preventDefault();
              }}
              onDrop={(e) => {
                if (!onStatusChange) return;
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                if (!id) return;
                const current = items.find((p) => p.id === id);
                if (current) return;
                onStatusChange(id, col.status);
              }}
            >
              <div className="flex items-center justify-between gap-2 px-3.5 py-3">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${col.accent}`} />
                  <h3 className="text-[13px] font-medium text-wo-text">{col.label}</h3>
                </div>
                <span className="rounded-full bg-wo-hover px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-wo-muted">
                  {items.length}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1.5 px-2 pb-2">
                {items.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-wo-dim">Vide</p>
                ) : (
                  items.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      draggable={Boolean(onStatusChange)}
                      onDragStart={(e) => {
                        dragged.current = true;
                        e.dataTransfer.setData("text/plain", p.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => {
                        if (dragged.current) {
                          dragged.current = false;
                          return;
                        }
                        router.push(prospectDetailHref(p.id, listReturnUrl));
                      }}
                      className="flex cursor-pointer items-start gap-2.5 rounded-[14px] border border-wo-border bg-slate-50/70 px-2.5 py-3 text-left transition hover:border-indigo-200 hover:bg-white"
                    >
                      <PipelineCard prospect={p} columnId={col.id} />
                      <PipelineCardAvatar name={p.club_name} />
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PipelineStats({ prospects, conversionRate }: { prospects: Prospect[]; conversionRate?: number }) {
  const followed = prospects.filter(isFollowedProspect).length;
  const meetings = prospects.filter((p) => p.status === "Démo").length;
  const clients = prospects.filter((p) => p.status === "Client").length;
  const rate =
    conversionRate ?? (prospects.length ? Math.round((clients / prospects.length) * 100) : 0);

  const cards = [
    { label: "En suivi", value: String(followed) },
    { label: "RDV / démos", value: String(meetings) },
    { label: "Clients", value: String(clients) },
    { label: "Taux de conv.", value: `${rate}%` },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="wo-stat">
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-wo-muted">{c.label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-wo-text">{c.value}</p>
        </div>
      ))}
    </div>
  );
}
