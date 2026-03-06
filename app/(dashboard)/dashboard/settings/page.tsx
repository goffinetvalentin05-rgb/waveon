"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { cardClass, mapProfile, type ProfileItem, type RawRow } from "../components/dashboardData";

export default function DashboardSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileItem | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
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
      await fetchProfile(currentUserId, session.user.email ?? "");
      setLoading(false);
    };
    void init();
  }, [router]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`settings-profile-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        async () => {
          await fetchProfile(userId);
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
        Chargement des paramètres...
      </div>
    );
  }

  return (
    <div>
      <header>
        <h1 className="text-2xl font-semibold text-white">Paramètres</h1>
        <p className="mt-1 text-sm text-white/65">
          Mets à jour ton identité et tes liens de booking.
        </p>
      </header>

      {error ? (
        <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mt-5 rounded-xl border border-[#39FF14]/30 bg-[#39FF14]/10 px-4 py-3 text-sm text-[#9eff8a]">
          {success}
        </div>
      ) : null}

      <section className={`${cardClass} mt-6`}>
        <form className="grid gap-4 md:max-w-2xl" onSubmit={handleSave}>
          <FieldLabel title="Prénom / nom" />
          <input
            className="rounded-xl border border-[#39FF14]/20 bg-[#080808] px-3 py-2 text-sm text-white outline-none focus:border-[#39FF14]"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Ex: Thomas Bernard"
            required
          />

          <FieldLabel title="Email" />
          <input
            className="rounded-xl border border-[#39FF14]/20 bg-[#080808] px-3 py-2 text-sm text-white outline-none focus:border-[#39FF14]"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Ex: contact@mail.com"
            type="email"
            required
          />

          <FieldLabel title="Numéro WhatsApp Business" />
          <input
            className="rounded-xl border border-[#39FF14]/20 bg-[#080808] px-3 py-2 text-sm text-white outline-none focus:border-[#39FF14]"
            value={whatsappNumber}
            onChange={(event) => setWhatsappNumber(event.target.value)}
            placeholder="+33 6 00 00 00 00"
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
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </form>
      </section>

      {profile ? (
        <section className={`${cardClass} mt-6`}>
          <h2 className="text-base font-semibold text-white">Profil actuel</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/75">
            <li>
              Nom: <span className="text-white">{profile.fullName || "-"}</span>
            </li>
            <li>
              Email: <span className="text-white">{profile.email || "-"}</span>
            </li>
            <li>
              WhatsApp: <span className="text-white">{profile.whatsappNumber || "-"}</span>
            </li>
            <li>
              Calendly: <span className="text-white">{profile.bookingLink || "-"}</span>
            </li>
          </ul>
        </section>
      ) : null}
    </div>
  );

  async function fetchProfile(currentUserId: string, fallbackEmail = "") {
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
    setFullName(mapped.fullName);
    setEmail(mapped.email);
    setWhatsappNumber(mapped.whatsappNumber);
    setBookingLink(mapped.bookingLink);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const payloadWithEmail = {
      id: userId,
      full_name: fullName.trim(),
      email: email.trim(),
      whatsapp_number: whatsappNumber.trim() || null,
      booking_link: bookingLink.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const payloadWithoutEmail = {
      id: userId,
      full_name: fullName.trim(),
      whatsapp_number: whatsappNumber.trim() || null,
      booking_link: bookingLink.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let saveError: string | null = null;
    const { error: firstUpsertError } = await supabase
      .from("profiles")
      .upsert(payloadWithEmail);

    if (firstUpsertError) {
      const { error: fallbackUpsertError } = await supabase
        .from("profiles")
        .upsert(payloadWithoutEmail);
      if (fallbackUpsertError) {
        saveError = fallbackUpsertError.message;
      }
    }

    if (saveError) {
      setError(saveError);
      setSaving(false);
      return;
    }

    await fetchProfile(userId, email);
    setSuccess("Paramètres enregistrés.");
    setSaving(false);
  }
}

function FieldLabel({ title }: { title: string }) {
  return <label className="text-sm font-medium text-white/80">{title}</label>;
}
