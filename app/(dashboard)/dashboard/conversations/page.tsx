"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/wavon/ui/PageHeader";
import { useToast } from "@/components/wavon/Toast";
import { formatDateTime } from "@/lib/wavon/format";
import { btnPrimaryClass, cardClass, inputClass, spinnerClass } from "@/lib/wavon/tokens";
import { supabase } from "@/lib/supabase/client";

type ProspectRow = {
  id: string;
  name: string;
  phone: string;
};

type ConversationMessage = {
  id: string;
  direction: "in" | "out";
  content: string;
  at: string;
};

type ConversationRow = {
  id: string;
  prospect_id: string | null;
  updated_at: string;
  last_message: string | null;
  last_message_at: string | null;
  messages: unknown;
  prospect?: ProspectRow | ProspectRow[] | null;
};

function messagesFromJson(raw: unknown): ConversationMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: ConversationMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id : crypto.randomUUID();
    const direction =
      rec.direction === "in" || rec.direction === "out"
        ? (rec.direction as "in" | "out")
        : "out";
    const content = typeof rec.content === "string" ? rec.content : "";
    const at = typeof rec.at === "string" ? rec.at : new Date().toISOString();
    if (!content.trim()) continue;
    out.push({ id, direction, content, at });
  }
  return out;
}

function pickProspect(value: ConversationRow["prospect"]): ProspectRow | null {
  if (!value) return null;
  if (Array.isArray(value)) return (value[0] as ProspectRow | undefined) ?? null;
  return value as ProspectRow;
}

export default function ConversationsPage() {
  const toast = useToast();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<ConversationRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setReady(false);
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        if (!cancelled) {
          setThreads([]);
          setLoading(false);
          setReady(true);
        }
        return;
      }

      const { data, error } = await supabase
        .from("conversations")
        .select(
          "id,prospect_id,updated_at,last_message,last_message_at,messages,prospect:prospect_id(id,name,phone)"
        )
        .order("updated_at", { ascending: false });

      if (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[conversations] load error:", error.message);
        }
        if (!cancelled) {
          setThreads([]);
          setLoading(false);
          setReady(true);
        }
        return;
      }

      const rows = (data ?? []) as ConversationRow[];
      if (!cancelled) {
        setThreads(rows);
        setLoading(false);
        setReady(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const active = useMemo(
    () => threads.find((t) => t.id === activeId) ?? threads[0] ?? null,
    [threads, activeId]
  );

  const activeMessages = useMemo(
    () => messagesFromJson(active?.messages),
    [active?.messages]
  );

  const send = async () => {
    if (!active || !draft.trim()) return;
    const msg: ConversationMessage = {
      id: crypto.randomUUID(),
      direction: "out",
      content: draft.trim(),
      at: new Date().toISOString(),
    };
    const next = [...activeMessages, msg];
    setDraft("");

    // Optimistic UI
    setThreads((prev) =>
      prev.map((t) =>
        t.id === active.id
          ? {
              ...t,
              messages: next,
              last_message: msg.content,
              last_message_at: msg.at,
              updated_at: msg.at,
            }
          : t
      )
    );

    const { error } = await supabase
      .from("conversations")
      .update({
        messages: next,
        last_message: msg.content,
        last_message_at: msg.at,
        updated_at: msg.at,
      })
      .eq("id", active.id);

    if (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[conversations] send error:", error.message);
      }
      toast.push({ kind: "error", message: "Impossible d’envoyer le message." });
      // Re-sync from server
      const { data } = await supabase
        .from("conversations")
        .select(
          "id,prospect_id,updated_at,last_message,last_message_at,messages,prospect:prospect_id(id,name,phone)"
        )
        .order("updated_at", { ascending: false });
      setThreads(((data ?? []) as ConversationRow[]) ?? []);
      return;
    }

    toast.push({ message: "Message envoyé." });
  };

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className={spinnerClass} aria-hidden />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className={spinnerClass} aria-hidden />
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="space-y-6 pb-8">
        <PageHeader
          title="Conversations"
          description="Historique des échanges avec tes prospects et clients."
        />
        <div className={cardClass}>
          <p className="text-sm text-neutral-600">
            Aucune conversation pour le moment.
          </p>
        </div>
      </div>
    );
  }

  const thread = active;
  const selectedId = activeId ?? thread?.id ?? null;
  const prospect = thread ? pickProspect(thread.prospect) : null;

  return (
    <div className="space-y-8 pb-8">
      <PageHeader
        title="Conversations"
        description="Vue messagerie sobre — connectée à tes données."
      />

      <div className="grid min-h-[460px] gap-4 overflow-hidden rounded-3xl border border-neutral-200/90 bg-white shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] lg:grid-cols-[minmax(0,17rem)_1fr]">
        <aside className="border-b border-neutral-100 lg:border-b-0 lg:border-r lg:border-neutral-100">
          <ul className="max-h-[280px] divide-y divide-neutral-100 overflow-y-auto lg:max-h-none">
            {threads.map((t) => {
              const sel = (selectedId ?? thread?.id) === t.id;
              const p = pickProspect(t.prospect);
              const name = p?.name || "Conversation";
              const phone = p?.phone || "—";
              const at = t.last_message_at ?? t.updated_at;
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
                    <span className="font-medium text-neutral-950">{name}</span>
                    <span className="text-xs text-neutral-500">{phone}</span>
                    <span className="text-[11px] text-neutral-400">{formatDateTime(at)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="flex min-h-[320px] flex-col lg:min-h-[460px]">
          <div className="border-b border-neutral-100 px-5 py-4">
            <p className="font-semibold text-neutral-950">{prospect?.name || "Conversation"}</p>
            <p className="text-xs text-neutral-500">{prospect?.phone || "—"}</p>
          </div>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-[#fafafa] px-4 py-4">
            {activeMessages.length === 0 ? (
              <p className="py-10 text-center text-sm text-neutral-500">Aucun message.</p>
            ) : (
              activeMessages.map((m) => (
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
