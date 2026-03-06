"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  cardClass,
  formatDate,
  mapConversation,
  type ConversationItem,
  type RawRow,
} from "../components/dashboardData";

export default function ConversationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace("/login");
        return;
      }
      setUserId(session.user.id);
      await fetchConversations(session.user.id);
      setLoading(false);
    };
    void init();
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`conversations-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          await fetchConversations(userId);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080808] text-white/70">
        Chargement des conversations...
      </div>
    );
  }

  return (
    <div>
      <header>
        <h1 className="text-2xl font-semibold text-white">Conversations</h1>
        <p className="mt-1 text-sm text-white/65">
          Messages échangés entre tes prospects et ton agent IA.
        </p>
      </header>

      {error ? (
        <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className="mt-6 space-y-4">
        {conversations.length === 0 ? (
          <div className={`${cardClass} text-sm text-white/65`}>
            Aucune conversation pour le moment.
          </div>
        ) : (
          conversations.map((conversation) => (
            <article key={conversation.id} className={cardClass}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-white">{conversation.prospectName}</p>
                <p className="text-xs text-white/60">
                  Mise à jour: {formatDate(conversation.updatedAt)}
                </p>
              </div>

              {conversation.messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#39FF14]/20 bg-[#080808] px-3 py-4 text-sm text-white/60">
                  Aucun message disponible.
                </div>
              ) : (
                <div className="space-y-2">
                  {conversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                        message.direction === "in"
                          ? "border border-[#39FF14]/20 bg-[#080808] text-white"
                          : "ml-auto border border-[#39FF14]/30 bg-[#39FF14]/10 text-[#b7ffaa]"
                      }`}
                    >
                      {message.content}
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );

  async function fetchConversations(currentUserId: string) {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", currentUserId)
      .order("updated_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setConversations(((data ?? []) as RawRow[]).map(mapConversation));
  }
}
