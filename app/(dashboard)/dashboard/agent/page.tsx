"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { cardClass, mapProfile, type ProfileItem, type RawRow } from "../components/dashboardData";

export default function AgentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileItem | null>(null);

  const [offerDescription, setOfferDescription] = useState("");
  const [communicationStyle, setCommunicationStyle] = useState("");
  const [commonObjections, setCommonObjections] = useState("");
  const [bookingLink, setBookingLink] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace("/login");
        return;
      }

      const currentUserId = session.user.id;
      setUserId(currentUserId);
      await fetchAgentConfig(currentUserId, session.user.email ?? "");
      setLoading(false);
    };
    void init();
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`agent-profile-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        async () => {
          await fetchAgentConfig(userId);
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
        Chargement de l&apos;agent...
      </div>
    );
  }

  return (
    <div>
      <header>
        <h1 className="text-2xl font-semibold text-white">Mon agent IA</h1>
        <p className="mt-1 text-sm text-white/65">
          Configure l&apos;offre, le ton et les objections traitées automatiquement.
        </p>
      </header>

      {error ? (
        <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <section className={`${cardClass} mt-6`}>
        <form className="grid gap-4" onSubmit={handleSave}>
          <FieldLabel title="Offre" />
          <textarea
            className="min-h-24 rounded-xl border border-[#39FF14]/20 bg-[#080808] px-3 py-2 text-sm text-white outline-none focus:border-[#39FF14]"
            value={offerDescription}
            onChange={(event) => setOfferDescription(event.target.value)}
            placeholder="Décris ton offre."
          />

          <FieldLabel title="Style de communication" />
          <textarea
            className="min-h-24 rounded-xl border border-[#39FF14]/20 bg-[#080808] px-3 py-2 text-sm text-white outline-none focus:border-[#39FF14]"
            value={communicationStyle}
            onChange={(event) => setCommunicationStyle(event.target.value)}
            placeholder="Ex: direct, bienveillant, tutoiement."
          />

          <FieldLabel title="Objections fréquentes" />
          <textarea
            className="min-h-24 rounded-xl border border-[#39FF14]/20 bg-[#080808] px-3 py-2 text-sm text-white outline-none focus:border-[#39FF14]"
            value={commonObjections}
            onChange={(event) => setCommonObjections(event.target.value)}
            placeholder="Ex: trop cher, pas le temps."
          />

          <FieldLabel title="Lien Calendly" />
          <input
            className="rounded-xl border border-[#39FF14]/20 bg-[#080808] px-3 py-2 text-sm text-white outline-none focus:border-[#39FF14]"
            value={bookingLink}
            onChange={(event) => setBookingLink(event.target.value)}
            placeholder="https://calendly.com/..."
          />

          <button
            type="submit"
            disabled={saving || !userId}
            className="mt-2 w-fit rounded-xl bg-[#39FF14] px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-60"
          >
            {saving ? "Enregistrement..." : "Modifier la configuration"}
          </button>
        </form>
      </section>

      {profile ? (
        <section className={`${cardClass} mt-6`}>
          <h2 className="text-base font-semibold text-white">Configuration actuelle</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/75">
            <li>
              Offre: <span className="text-white">{profile.offerDescription || "-"}</span>
            </li>
            <li>
              Style:{" "}
              <span className="text-white">{profile.communicationStyle || "-"}</span>
            </li>
            <li>
              Objections:{" "}
              <span className="text-white">{profile.commonObjections || "-"}</span>
            </li>
            <li>
              Calendly: <span className="text-white">{profile.bookingLink || "-"}</span>
            </li>
          </ul>
        </section>
      ) : null}
    </div>
  );

  async function fetchAgentConfig(currentUserId: string, fallbackEmail = "") {
    setError(null);
    const [{ data: profileRow, error: profileError }, { data: userData, error: userError }] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", currentUserId).maybeSingle(),
        supabase.auth.getUser(),
      ]);

    const firstError = profileError ?? userError;
    if (firstError) {
      setError(firstError.message);
      return;
    }

    const user = userData.user;
    if (!user) return;

    const mapped = mapProfile((profileRow ?? null) as RawRow | null, user, fallbackEmail);
    setProfile(mapped);
    setOfferDescription(mapped.offerDescription);
    setCommunicationStyle(mapped.communicationStyle);
    setCommonObjections(mapped.commonObjections);
    setBookingLink(mapped.bookingLink);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;

    setSaving(true);
    setError(null);

    const payload = {
      id: userId,
      offer_description: offerDescription.trim() || null,
      communication_style: communicationStyle.trim() || null,
      common_objections: commonObjections.trim() || null,
      booking_link: bookingLink.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase.from("profiles").upsert(payload);
    if (upsertError) {
      setError(upsertError.message);
      setSaving(false);
      return;
    }

    await fetchAgentConfig(userId);
    setSaving(false);
  }
}

function FieldLabel({ title }: { title: string }) {
  return <label className="text-sm font-medium text-white/80">{title}</label>;
}
