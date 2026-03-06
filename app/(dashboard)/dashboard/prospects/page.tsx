"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  cardClass,
  formatDate,
  mapProspect,
  statusBadgeClass,
  type ProspectItem,
  type RawRow,
} from "../components/dashboardData";

const statusOptions = ["Nouveau", "En conversation", "Appel booké", "Closé"];

export default function ProspectsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [prospects, setProspects] = useState<ProspectItem[]>([]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("Nouveau");

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace("/login");
        return;
      }
      setUserId(session.user.id);
      await fetchProspects(session.user.id);
      setLoading(false);
    };
    void init();
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`prospects-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "prospects",
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          await fetchProspects(userId);
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
        Chargement des prospects...
      </div>
    );
  }

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Mes prospects</h1>
          <p className="mt-1 text-sm text-white/65">
            Gère tous les leads envoyés à ton agent WhatsApp.
          </p>
        </div>
      </header>

      {error ? (
        <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className={`${cardClass} mt-6`}>
        <h2 className="text-base font-semibold text-white">Ajouter un prospect</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={handleCreate}>
          <input
            className="rounded-xl border border-[#39FF14]/20 bg-[#080808] px-3 py-2 text-sm text-white outline-none focus:border-[#39FF14]"
            placeholder="Nom"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <input
            className="rounded-xl border border-[#39FF14]/20 bg-[#080808] px-3 py-2 text-sm text-white outline-none focus:border-[#39FF14]"
            placeholder="Numéro"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            required
          />
          <select
            className="rounded-xl border border-[#39FF14]/20 bg-[#080808] px-3 py-2 text-sm text-white outline-none focus:border-[#39FF14]"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#39FF14] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Ajout..." : "Ajouter un prospect"}
          </button>
        </form>
      </section>

      <section className={`${cardClass} mt-6`}>
        {prospects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#39FF14]/20 bg-[#080808] px-4 py-5 text-sm text-white/65">
            Aucun prospect pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-[#39FF14]/15 text-white/60">
                  <th className="px-2 py-3 font-medium">Nom</th>
                  <th className="px-2 py-3 font-medium">Numéro</th>
                  <th className="px-2 py-3 font-medium">Statut</th>
                  <th className="px-2 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((prospect) => (
                  <tr
                    key={prospect.id}
                    className="border-b border-[#39FF14]/10 last:border-none"
                  >
                    <td className="px-2 py-3 text-white">{prospect.name}</td>
                    <td className="px-2 py-3 text-white/80">{prospect.phone}</td>
                    <td className="px-2 py-3">
                      <span
                        className={`rounded-full border px-2 py-1 text-xs ${statusBadgeClass[prospect.status]}`}
                      >
                        {prospect.status}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-white/70">
                      {formatDate(prospect.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );

  async function fetchProspects(currentUserId: string) {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("prospects")
      .select("*")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setProspects(((data ?? []) as RawRow[]).map(mapProspect));
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;

    setSaving(true);
    setError(null);

    const payloads: RawRow[] = [
      {
        user_id: userId,
        name: name.trim(),
        phone: phone.trim(),
        status,
      },
      {
        user_id: userId,
        full_name: name.trim(),
        phone_number: phone.trim(),
        status,
      },
      {
        user_id: userId,
        prospect_name: name.trim(),
        whatsapp_number: phone.trim(),
        status,
      },
    ];

    let created = false;
    let lastMessage = "Impossible d'ajouter ce prospect.";

    for (const payload of payloads) {
      const { error: insertError } = await supabase.from("prospects").insert(payload);
      if (!insertError) {
        created = true;
        break;
      }
      lastMessage = insertError.message;
    }

    if (!created) {
      setError(lastMessage);
      setSaving(false);
      return;
    }

    setName("");
    setPhone("");
    setStatus("Nouveau");
    await fetchProspects(userId);
    setSaving(false);
  }
}
