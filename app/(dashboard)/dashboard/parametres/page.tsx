"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useWavon } from "@/components/wavon/WavonProvider";
import { useToast } from "@/components/wavon/Toast";
import { btnPrimaryClass, cardClass, inputClass } from "@/lib/wavon/tokens";

export default function ParametresPage() {
  const { ready, state, patchSettings } = useWavon();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 motion-safe:animate-spin" />
      </div>
    );
  }

  const s = state.settings;

  const onSubmitBusiness = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    patchSettings({
      businessName: String(fd.get("businessName") ?? "").trim(),
      address: String(fd.get("address") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      publicSlug: String(fd.get("publicSlug") ?? "").trim(),
    });
    toast.push({ message: "Informations enregistrées." });
  };

  const onSubmitBooking = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    patchSettings({
      minServiceDurationMin: Math.max(5, Number(fd.get("minServiceDurationMin")) || 15),
      bookingLeadHours: Math.max(0, Number(fd.get("bookingLeadHours")) || 0),
      confirmationMode: fd.get("confirmationMode") === "auto" ? "auto" : "manual",
    });
    toast.push({ message: "Règles de réservation mises à jour." });
    setSaving(false);
  };

  const publicUrl = `/reserver/${s.publicSlug || "demo"}`;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Paramètres</h1>
        <p className="mt-1 text-sm text-white/60">
          Identité du lieu et règles appliquées au planning et à la page publique.
        </p>
      </header>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-white">Infos business</h2>
        <form className="mt-5 grid max-w-xl gap-4" onSubmit={onSubmitBusiness}>
          <Field label="Nom de l'entreprise" name="businessName" defaultValue={s.businessName} />
          <Field label="Adresse" name="address" defaultValue={s.address} />
          <Field label="Téléphone" name="phone" defaultValue={s.phone} />
          <div>
            <label className="text-xs font-medium text-white/55">Identifiant page publique</label>
            <input
              name="publicSlug"
              className={`${inputClass} mt-1`}
              defaultValue={s.publicSlug}
              placeholder="ex: mon-salon"
            />
            <p className="mt-1 text-xs text-white/45">
              URL : <span className="text-emerald-400/90">{publicUrl}</span>
            </p>
          </div>
          <button type="submit" className={`${btnPrimaryClass} w-fit`}>
            Enregistrer
          </button>
        </form>
        <p className="mt-4 text-xs text-white/45">
          Ouvre la page publique sur le même navigateur après une visite ici pour que les réservations
          se synchronisent (démo locale).
        </p>
        <Link
          href={`/reserver/${s.publicSlug || "demo"}`}
          className="mt-3 inline-block text-sm font-medium text-emerald-400 hover:underline"
        >
          Prévisualiser la page publique →
        </Link>
      </section>

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-white">Réservation</h2>
        <form className="mt-5 grid max-w-xl gap-4" onSubmit={onSubmitBooking}>
          <div>
            <label className="text-xs font-medium text-white/55">Durée minimum des services (min)</label>
            <input
              type="number"
              name="minServiceDurationMin"
              min={5}
              step={5}
              className={`${inputClass} mt-1`}
              defaultValue={s.minServiceDurationMin}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-white/55">
              Délai minimum avant la 1ère réservation (heures)
            </label>
            <input
              type="number"
              name="bookingLeadHours"
              min={0}
              step={1}
              className={`${inputClass} mt-1`}
              defaultValue={s.bookingLeadHours}
            />
          </div>
          <div>
            <span className="text-xs font-medium text-white/55">Confirmation</span>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2 text-white/80">
                <input
                  type="radio"
                  name="confirmationMode"
                  value="manual"
                  defaultChecked={s.confirmationMode === "manual"}
                  className="size-4 border-emerald-500/40 text-emerald-500"
                />
                Manuelle (en attente)
              </label>
              <label className="flex items-center gap-2 text-white/80">
                <input
                  type="radio"
                  name="confirmationMode"
                  value="auto"
                  defaultChecked={s.confirmationMode === "auto"}
                  className="size-4 border-emerald-500/40 text-emerald-500"
                />
                Automatique (confirmé)
              </label>
            </div>
          </div>
          <button type="submit" disabled={saving} className={`${btnPrimaryClass} w-fit`}>
            {saving ? "…" : "Enregistrer les règles"}
          </button>
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-white/55">{label}</label>
      <input name={name} className={`${inputClass} mt-1`} defaultValue={defaultValue} />
    </div>
  );
}
