"use client";

import { useState } from "react";
import { useWavon } from "@/components/wavon/WavonProvider";
import { useToast } from "@/components/wavon/Toast";
import { formatDateTime } from "@/lib/wavon/format";
import type { WhatsAppMessage } from "@/lib/wavon/types";
import { btnPrimaryClass, cardClass, inputClass } from "@/lib/wavon/tokens";

export default function ConversationsPage() {
  const { ready, state, replaceWhatsAppMessages } = useWavon();
  const toast = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const active = state.whatsappThreads.find((t) => t.id === activeId) ?? state.whatsappThreads[0];

  const send = () => {
    if (!active || !draft.trim()) return;
    const msg: WhatsAppMessage = {
      id: crypto.randomUUID(),
      direction: "out",
      content: draft.trim(),
      at: new Date().toISOString(),
    };
    replaceWhatsAppMessages(active.id, [...active.messages, msg]);
    setDraft("");
    toast.push({ message: "Message envoyé (simulation)." });
  };

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 motion-safe:animate-spin" />
      </div>
    );
  }

  if (state.whatsappThreads.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-white">Conversations</h1>
        <div className={cardClass + " text-sm text-white/60"}>
          Aucune conversation simulée. Les données d&apos;exemple apparaîtront avec un état initial
          réinitialisé.
        </div>
      </div>
    );
  }

  const thread = active;
  const selectedId = activeId ?? thread?.id;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Conversations WhatsApp
        </h1>
        <p className="mt-1 text-sm text-white/60">
          Interface simulée — liste et fil de messages type WhatsApp Business.
        </p>
      </header>

      <div className="grid min-h-[420px] gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
        <aside className={cardClass + " p-0"}>
          <ul className="divide-y divide-white/5">
            {state.whatsappThreads.map((t) => {
              const sel = (selectedId ?? thread.id) === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(t.id);
                      setDraft("");
                    }}
                    className={`flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left text-sm transition ${
                      sel ? "bg-emerald-500/10 text-white" : "text-white/80 hover:bg-white/5"
                    }`}
                  >
                    <span className="font-medium">{t.contactName}</span>
                    <span className="text-xs text-white/45">{t.phone}</span>
                    <span className="text-[11px] text-white/35">
                      {formatDateTime(t.updatedAt)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className={`${cardClass} flex flex-col p-0`}>
          <div className="border-b border-white/10 px-5 py-4">
            <p className="font-semibold text-white">{thread.contactName}</p>
            <p className="text-xs text-white/50">{thread.phone}</p>
          </div>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
            {thread.messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/50">Aucun message.</p>
            ) : (
              thread.messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm ${
                    m.direction === "in"
                      ? "self-start border border-white/10 bg-black/50 text-white"
                      : "self-end border border-emerald-500/25 bg-emerald-500/10 text-emerald-50"
                  }`}
                >
                  <p>{m.content}</p>
                  <p className="mt-1 text-[10px] text-white/40">{formatDateTime(m.at)}</p>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 border-t border-white/10 p-4">
            <input
              className={inputClass}
              placeholder="Écrire un message…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button type="button" className={btnPrimaryClass + " shrink-0"} onClick={send}>
              Envoyer
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
