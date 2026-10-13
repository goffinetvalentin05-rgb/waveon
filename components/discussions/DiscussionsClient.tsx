"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { IconSend } from "@tabler/icons-react";
import { supabase } from "@/lib/supabase/client";
import { memberInitials } from "@/lib/projects/assignee";
import type { ProjectMessage } from "@/lib/discussions/types";
import { ui } from "@/lib/design/tokens";

function formatMessageTime(iso: string) {
  const date = new Date(iso);
  if (isToday(date)) return format(date, "HH:mm", { locale: fr });
  if (isYesterday(date)) return `Hier · ${format(date, "HH:mm", { locale: fr })}`;
  return format(date, "d MMM · HH:mm", { locale: fr });
}

function newClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function DiscussionsClient({
  projectId,
  projectName,
  currentUserId,
  canWrite,
}: {
  projectId: string;
  projectName: string;
  currentUserId: string;
  canWrite: boolean;
}) {
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const seenIds = useRef(new Set<string>());
  const seenClientIds = useRef(new Set<string>());

  const scrollToBottom = useCallback((force = false) => {
    if (!force && !stickToBottom.current) return;
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: force ? "auto" : "smooth" });
    });
  }, []);

  const upsertMessage = useCallback((msg: ProjectMessage) => {
    if (seenIds.current.has(msg.id)) return;
    if (msg.client_id && seenClientIds.current.has(msg.client_id)) {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.client_id === msg.client_id);
        if (idx === -1) {
          seenIds.current.add(msg.id);
          return [...prev, msg];
        }
        const next = [...prev];
        next[idx] = msg;
        seenIds.current.add(msg.id);
        return next;
      });
      return;
    }
    seenIds.current.add(msg.id);
    if (msg.client_id) seenClientIds.current.add(msg.client_id);
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const markRead = useCallback(() => {
    void fetch(`/api/projects/${projectId}/discussions/unread`, { method: "POST" }).catch(
      () => null
    );
  }, [projectId]);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/discussions?limit=100`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Impossible de charger la discussion.");
        setMessages([]);
        return;
      }
      const list = (data.messages ?? []) as ProjectMessage[];
      seenIds.current = new Set(list.map((m) => m.id));
      seenClientIds.current = new Set(
        list.map((m) => m.client_id).filter(Boolean) as string[]
      );
      setMessages(list);
      stickToBottom.current = true;
      markRead();
    } catch {
      setError("Impossible de charger la discussion.");
    } finally {
      setLoading(false);
    }
  }, [projectId, markRead]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    scrollToBottom(true);
  }, [loading, scrollToBottom]);

  useEffect(() => {
    if (!loading) scrollToBottom();
  }, [messages.length, loading, scrollToBottom]);

  useEffect(() => {
    const channel = supabase
      .channel(`project-messages:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_messages",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            project_id: string;
            author_id: string;
            body: string;
            client_id: string | null;
            created_at: string;
          };
          if (!row?.id) return;
          if (seenIds.current.has(row.id)) return;
          if (row.client_id && seenClientIds.current.has(row.client_id)) {
            upsertMessage({
              ...row,
              author_name: "Membre",
            });
            markRead();
            return;
          }
          void fetch(`/api/projects/${projectId}/discussions?limit=20`)
            .then((r) => r.json())
            .then((data) => {
              const list = (data.messages ?? []) as ProjectMessage[];
              const found = list.find((m) => m.id === row.id);
              if (found) {
                upsertMessage(found);
                markRead();
              } else {
                upsertMessage({
                  ...row,
                  author_name: row.author_id === currentUserId ? "Vous" : "Membre",
                });
                markRead();
              }
            })
            .catch(() => {
              upsertMessage({
                ...row,
                author_name: row.author_id === currentUserId ? "Vous" : "Membre",
              });
            });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, currentUserId, upsertMessage, markRead]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottom.current = distance < 80;
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || sending || !canWrite) return;

    const clientId = newClientId();
    const optimistic: ProjectMessage = {
      id: `tmp-${clientId}`,
      project_id: projectId,
      author_id: currentUserId,
      body: text,
      client_id: clientId,
      created_at: new Date().toISOString(),
      author_name: "Vous",
    };

    seenClientIds.current.add(clientId);
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    setSending(true);
    stickToBottom.current = true;
    scrollToBottom(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/discussions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, client_id: clientId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.client_id !== clientId));
        setError(data.error ?? "Envoi impossible.");
        setDraft(text);
        return;
      }
      const saved = data.message as ProjectMessage;
      setMessages((prev) => {
        const withoutTemp = prev.filter(
          (m) => m.id !== optimistic.id && !(m.client_id && m.client_id === clientId && m.id.startsWith("tmp-"))
        );
        if (withoutTemp.some((m) => m.id === saved.id)) return withoutTemp;
        seenIds.current.add(saved.id);
        if (saved.client_id) seenClientIds.current.add(saved.client_id);
        return [...withoutTemp, saved];
      });
      markRead();
    } catch {
      setMessages((prev) => prev.filter((m) => m.client_id !== clientId));
      setError("Envoi impossible.");
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className={`${ui.widget} flex h-[min(72vh,720px)] flex-col overflow-hidden p-0`}>
      <div className="border-b border-wo-border px-5 py-4 sm:px-6">
        <h2 className={ui.h2}>Discussion · {projectName}</h2>
        <p className="mt-1 text-sm text-wo-muted">
          Espace partagé réservé aux membres de ce projet.
        </p>
      </div>

      <div
        ref={listRef}
        onScroll={onScroll}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6"
      >
        {loading ? (
          <p className="py-10 text-center text-sm text-wo-muted">Chargement des messages…</p>
        ) : error ? (
          <div className="py-10 text-center">
            <p className="text-sm text-[#FB7185]">{error}</p>
            <button type="button" className={`${ui.btnSecondary} mt-3`} onClick={() => void loadMessages()}>
              Réessayer
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-wo-muted">Aucun message pour le moment.</p>
            <p className="mt-1 text-[13px] text-wo-dim">
              Lancez la conversation avec l’équipe du projet.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const mine = msg.author_id === currentUserId;
            const name = mine ? "Vous" : msg.author_name;
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${mine ? "flex-row-reverse" : ""}`}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wo-accent-soft text-[11px] font-semibold text-wo-accent"
                  aria-hidden
                >
                  {memberInitials(name)}
                </div>
                <div className={`max-w-[min(100%,520px)] ${mine ? "items-end text-right" : ""}`}>
                  <div className={`flex items-baseline gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                    <span className="text-[12.5px] font-medium text-wo-text">{name}</span>
                    <span className="text-[11px] text-wo-dim">{formatMessageTime(msg.created_at)}</span>
                  </div>
                  <div
                    className={`mt-1 whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                      mine
                        ? "bg-wo-accent-soft text-wo-text"
                        : "border border-wo-border bg-white/[0.03] text-wo-text"
                    }`}
                  >
                    {msg.body}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-wo-border px-4 py-3 sm:px-6">
        {canWrite ? (
          <div className="flex items-end gap-2">
            <textarea
              className={`${ui.input} max-h-36 min-h-[44px] flex-1 resize-none py-2.5`}
              placeholder="Écrire un message… (Entrée pour envoyer, Maj+Entrée pour une nouvelle ligne)"
              value={draft}
              rows={1}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={sending}
            />
            <button
              type="button"
              className={`${ui.btnPrimary} h-11 shrink-0 px-3`}
              onClick={() => void send()}
              disabled={sending || !draft.trim()}
              aria-label="Envoyer"
            >
              <IconSend className="h-4 w-4" stroke={1.75} />
            </button>
          </div>
        ) : (
          <p className="py-2 text-center text-sm text-wo-muted">
            Lecture seule — vous n’avez pas la permission d’écrire.
          </p>
        )}
      </div>
    </div>
  );
}
