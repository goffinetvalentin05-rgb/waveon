"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useWavon } from "@/components/wavon/WavonProvider";
import { PageHeader } from "@/components/wavon/ui/PageHeader";
import { SectionCard } from "@/components/wavon/ui/SectionCard";
import { useToast } from "@/components/wavon/Toast";
import {
  btnPrimaryClass,
  inputClass,
  labelClass,
  linkClass,
  spinnerClass,
} from "@/lib/wavon/tokens";

export default function ParametresPage() {
  const { ready, state, patchSettings } = useWavon();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className={spinnerClass} aria-hidden />
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

  const slug = s.publicSlug?.trim() ?? "";
  const publicUrl = slug ? `/reserver/${slug}` : null;

  return (
    <div className="space-y-10 pb-12">
      <PageHeader
        title="Paramètres"
        description="Identité de ton établissement et règles de réservation. Tout est regroupé par sections pour rester clair."
      />

      <SectionCard
        title="Informations business"
        description="Nom affiché sur la page publique et dans l’espace pro."
      >
        <form className="grid max-w-2xl gap-6" onSubmit={onSubmitBusiness}>
          <Field label="Nom de l'entreprise" name="businessName" defaultValue={s.businessName} />
          <Field label="Adresse" name="address" defaultValue={s.address} />
          <Field label="Téléphone" name="phone" defaultValue={s.phone} />
          <div>
            <label className={labelClass}>Page publique — identifiant (slug)</label>
            <input
              name="publicSlug"
              className={`${inputClass} mt-2`}
              defaultValue={s.publicSlug}
              placeholder="ex. mon-salon"
            />
            <p className="mt-2 text-sm text-neutral-500">
              {publicUrl ? (
                <>
                  Lien :{" "}
                  <code className="rounded-lg bg-neutral-100 px-2 py-0.5 text-xs text-neutral-800">
                    {publicUrl}
                  </code>
                </>
              ) : (
                <span className="text-neutral-400">
                  Définis un identifiant public pour activer ta page de réservation.
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button type="submit" className={btnPrimaryClass}>
              Enregistrer
            </button>
            {publicUrl ? (
              <Link href={publicUrl} className={linkClass}>
                Prévisualiser la page publique
              </Link>
            ) : (
              <span className={`${linkClass} pointer-events-none opacity-40`}>Prévisualiser</span>
            )}
          </div>
          <p className="text-xs leading-relaxed text-neutral-400">
            La page publique utilise les données Supabase de ton compte.
          </p>
        </form>
      </SectionCard>

      <SectionCard
        title="Réservation"
        description="Durées, délais et confirmation : ce que voient tes clients et comment les créneaux sont validés."
      >
        <form className="grid max-w-2xl gap-6" onSubmit={onSubmitBooking}>
          <div>
            <label className={labelClass}>Durée minimum d’un service (minutes)</label>
            <input
              type="number"
              name="minServiceDurationMin"
              min={5}
              step={5}
              className={`${inputClass} mt-2`}
              defaultValue={s.minServiceDurationMin}
            />
          </div>
          <div>
            <label className={labelClass}>Délai minimum avant la première réservation (heures)</label>
            <input
              type="number"
              name="bookingLeadHours"
              min={0}
              step={1}
              className={`${inputClass} mt-2`}
              defaultValue={s.bookingLeadHours}
            />
          </div>
          <div>
            <span className={labelClass}>Confirmation des réservations</span>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:gap-8">
              <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700">
                <input
                  type="radio"
                  name="confirmationMode"
                  value="manual"
                  defaultChecked={s.confirmationMode === "manual"}
                  className="size-4 border-neutral-300 text-neutral-950"
                />
                <span>
                  <span className="font-medium text-neutral-950">Manuelle</span>
                  <span className="mt-0.5 block text-xs text-neutral-500">Statut « en attente » par défaut</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700">
                <input
                  type="radio"
                  name="confirmationMode"
                  value="auto"
                  defaultChecked={s.confirmationMode === "auto"}
                  className="size-4 border-neutral-300 text-neutral-950"
                />
                <span>
                  <span className="font-medium text-neutral-950">Automatique</span>
                  <span className="mt-0.5 block text-xs text-neutral-500">Confirmée dès la prise de rendez-vous</span>
                </span>
              </label>
            </div>
          </div>
          <button type="submit" disabled={saving} className={`${btnPrimaryClass} w-fit`}>
            {saving ? "…" : "Enregistrer les règles"}
          </button>
        </form>
      </SectionCard>
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
      <label className={labelClass}>{label}</label>
      <input name={name} className={`${inputClass} mt-2`} defaultValue={defaultValue} />
    </div>
  );
}
