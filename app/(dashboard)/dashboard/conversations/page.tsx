"use client";

import { useState } from "react";
import { useWavon } from "@/components/wavon/WavonProvider";
import { PageHeader } from "@/components/wavon/ui/PageHeader";
import { useToast } from "@/components/wavon/Toast";
import { formatDateTime } from "@/lib/wavon/format";
import type { WhatsAppMessage } from "@/lib/wavon/types";
import { btnPrimaryClass, cardClass, inputClass, spinnerClass } from "@/lib/wavon/tokens";

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
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className={spinnerClass} aria-hidden />
      </div>
    );
  }

  if (state.whatsappThreads.length === 0) {
    return (
      <div className="space-y-6 pb-8">
        <PageHeader
          title="Conversations"
          description="Échanges avec tes clients — aperçu simulé pour la démo."
        />
        <div className={cardClass}>
          <p className="text-sm text-neutral-600">
            Aucune conversation pour l’instant. Les exemples réapparaissent avec les données
            d’initialisation.
          </p>
        </div>
      </div>
    );
  }

  const thread = active;
  const selectedId = activeId ?? thread?.id;

  return (
    <div className="space-y-8 pb-8">
      <PageHeader
        title="Conversations"
        description="Vue messagerie sobre — simulation d’une file type WhatsApp Business."
      />

      <div className="grid min-h-[460px] gap-4 overflow-hidden rounded-3xl border border-neutral-200/90 bg-white shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] lg:grid-cols-[minmax(0,17rem)_1fr]">
        <aside className="border-b border-neutral-100 lg:border-b-0 lg:border-r lg:border-neutral-100">
          <ul className="max-h-[280px] divide-y divide-neutral-100 overflow-y-auto lg:max-h-none">
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
                    className={`flex w-full flex-col items-start gap-0.5 px-4 py-3.5 text-left text-sm transition ${
                      sel ? "bg-neutral-50" : "hover:bg-neutral-50/60"
                    }`}
                  >
                    <span className="font-medium text-neutral-950">{t.contactName}</span>
                    <span className="text-xs text-neutral-500">{t.phone}</span>
                    <span className="text-[11px] text-neutral-400">{formatDateTime(t.updatedAt)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="flex min-h-[320px] flex-col lg:min-h-[460px]">
          <div className="border-b border-neutral-100 px-5 py-4">
            <p className="font-semibold text-neutral-950">{thread.contactName}</p>
            <p className="text-xs text-neutral-500">{thread.phone}</p>
          </div>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-[#fafafa] px-4 py-4">
            {thread.messages.length === 0 ? (
              <p className="py-10 text-center text-sm text-neutral-500">Aucun message.</p>
            ) : (
              thread.messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                    m.direction === "in"
                      ? "self-start border border-neutral-200/90 bg-white text-neutral-800"
                      : "self-end border border-neutral-200/80 bg-neutral-900 text-white"
                  }`}
                >
                  <p>{m.content}</p>
                  <p
                    className={`mt-1.5 text-[10px] ${m.direction === "in" ? "text-neutral-400" : "text-white/60"}`}
                  >
                    {formatDateTime(m.at)}
                  </p>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 border-t border-neutral-100 bg-white p-4">
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
            <button type="button" className={btnPrimaryClass + " shrink-0 px-5"} onClick={send}>
              Envoyer
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
