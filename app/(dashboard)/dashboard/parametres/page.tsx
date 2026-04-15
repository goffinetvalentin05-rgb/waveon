"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useWavon } from "@/components/wavon/WavonProvider";
import { PageHeader } from "@/components/wavon/ui/PageHeader";
import { SectionCard } from "@/components/wavon/ui/SectionCard";
import { useToast } from "@/components/wavon/Toast";
import {
  btnPrimaryClass,
  btnGhostClass,
  inputClass,
  labelClass,
  linkClass,
  spinnerClass,
} from "@/lib/wavon/tokens";
import { deleteBrandingAsset, getBrandingPublicUrl, uploadBrandingAsset } from "@/lib/wavon/storage";

export default function ParametresPage() {
  const { ready, state, patchSettings, upsertEmailTemplate, businessId } = useWavon();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [templateType, setTemplateType] = useState<"confirmation" | "reminder" | "cancellation">("confirmation");
  const [brandingLoading, setBrandingLoading] = useState<null | "logo" | "cover">(null);

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
      businessType: String(fd.get("businessType") ?? "").trim(),
      address: String(fd.get("address") ?? "").trim(),
      city: String(fd.get("city") ?? "").trim(),
      postalCode: String(fd.get("postalCode") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      website: String(fd.get("website") ?? "").trim(),
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
      minNoticeHours: Math.max(0, Number(fd.get("minNoticeHours")) || 0),
      maxDaysInAdvance: Math.max(0, Number(fd.get("maxDaysInAdvance")) || 365),
      slotIntervalMinutes: Number(fd.get("slotIntervalMinutes")) === 60
        ? 60
        : Number(fd.get("slotIntervalMinutes")) === 30
          ? 30
          : Number(fd.get("slotIntervalMinutes")) === 20
            ? 20
            : Number(fd.get("slotIntervalMinutes")) === 10
              ? 10
              : Number(fd.get("slotIntervalMinutes")) === 5
                ? 5
                : 15,
      sameDayBookingAllowed: fd.get("sameDayBookingAllowed") === "on",
      confirmationMode: fd.get("confirmationMode") === "auto" ? "auto" : "manual",
    });
    toast.push({ message: "Règles de réservation mises à jour." });
    setSaving(false);
  };

  const onSubmitPublic = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    patchSettings({
      publicDisplayName: String(fd.get("publicDisplayName") ?? "").trim(),
      publicWelcomeMessage: String(fd.get("publicWelcomeMessage") ?? "").trim(),
      publicDescription: String(fd.get("publicDescription") ?? "").trim(),
      publicShowPhone: fd.get("publicShowPhone") === "on",
      publicShowAddress: fd.get("publicShowAddress") === "on",
      publicShowDescription: fd.get("publicShowDescription") === "on",
      publicAfterBookingMessage: String(fd.get("publicAfterBookingMessage") ?? "").trim(),
    });
    toast.push({ message: "Page publique mise à jour." });
  };

  const uploadAsset = async (kind: "logo" | "cover", file: File | null) => {
    if (!businessId) {
      toast.push({ kind: "error", message: "Business non initialisé." });
      return;
    }
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.push({ kind: "error", message: "Fichier invalide (image requise)." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.push({ kind: "error", message: "Image trop lourde (max 5 Mo)." });
      return;
    }
    setBrandingLoading(kind);
    try {
      const prevPath = kind === "logo" ? state.settings.publicLogoPath : state.settings.publicCoverPath;
      const { path, publicUrl } = await uploadBrandingAsset({ businessId, kind, file });

      patchSettings(
        kind === "logo"
          ? { publicLogoPath: path }
          : { publicCoverPath: path }
      );

      // Best-effort delete old file after DB points to new one.
      if (prevPath && prevPath !== path) {
        await deleteBrandingAsset({ path: prevPath });
      }
      toast.push({ message: kind === "logo" ? "Logo mis à jour." : "Bannière mise à jour." });
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.error("[branding] upload error:", e);
      toast.push({ kind: "error", message: "Upload impossible. Réessaie." });
    } finally {
      setBrandingLoading(null);
    }
  };

  const removeAsset = async (kind: "logo" | "cover") => {
    setBrandingLoading(kind);
    try {
      const path = kind === "logo" ? state.settings.publicLogoPath : state.settings.publicCoverPath;
      if (path) await deleteBrandingAsset({ path });
      patchSettings(
        kind === "logo"
          ? { publicLogoPath: "", publicLogoUrl: "" }
          : { publicCoverPath: "", publicCoverUrl: "" }
      );
      toast.push({ message: kind === "logo" ? "Logo supprimé." : "Bannière supprimée." });
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.error("[branding] delete error:", e);
      toast.push({ kind: "error", message: "Suppression impossible. Réessaie." });
    } finally {
      setBrandingLoading(null);
    }
  };

  const slug = s.publicSlug?.trim() ?? "";
  const publicUrl = slug ? `/reserver/${slug}` : null;
  const logoUrl = getBrandingPublicUrl(s.publicLogoPath) || s.publicLogoUrl || "";
  const coverUrl = getBrandingPublicUrl(s.publicCoverPath) || s.publicCoverUrl || "";

  return (
    <div className="space-y-10 pb-12">
      <PageHeader
        title="Paramètres"
        description="Identité de ton établissement et règles de réservation. Tout est regroupé par sections pour rester clair."
      />

      <SectionCard
        title="Informations business"
        description="Identité de l’entreprise. Ces infos servent à personnaliser l’expérience et les communications."
      >
        <form className="grid max-w-2xl gap-6" onSubmit={onSubmitBusiness}>
          <Field label="Nom de l'entreprise" name="businessName" defaultValue={s.businessName} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Type d’activité</label>
              <select name="businessType" className={`${inputClass} mt-2`} defaultValue={s.businessType ?? ""}>
                <option value="">—</option>
                <option value="coiffure">Coiffure</option>
                <option value="beaute">Beauté</option>
                <option value="automobile">Automobile</option>
                <option value="formation">Formation</option>
                <option value="coaching">Coaching</option>
                <option value="sante-bien-etre">Santé / bien-être</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <Field label="Email" name="email" defaultValue={s.email ?? ""} />
          </div>
          <Field label="Site web (optionnel)" name="website" defaultValue={s.website ?? ""} />
          <Field label="Adresse" name="address" defaultValue={s.address} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ville" name="city" defaultValue={s.city ?? ""} />
            <Field label="Code postal" name="postalCode" defaultValue={s.postalCode ?? ""} />
          </div>
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
            <label className={labelClass}>Délai minimum avant réservation (heures)</label>
            <input
              type="number"
              name="minNoticeHours"
              min={0}
              step={1}
              className={`${inputClass} mt-2`}
              defaultValue={s.minNoticeHours}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Réservation max à l’avance (jours)</label>
              <input
                type="number"
                name="maxDaysInAdvance"
                min={0}
                step={1}
                className={`${inputClass} mt-2`}
                defaultValue={s.maxDaysInAdvance}
              />
            </div>
            <div>
              <label className={labelClass}>Granularité des créneaux</label>
              <select
                name="slotIntervalMinutes"
                className={`${inputClass} mt-2`}
                defaultValue={s.slotIntervalMinutes}
              >
                <option value={5}>5 min</option>
                <option value={10}>10 min</option>
                <option value={15}>15 min</option>
                <option value={20}>20 min</option>
                <option value={30}>30 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700">
            <input
              type="checkbox"
              name="sameDayBookingAllowed"
              defaultChecked={s.sameDayBookingAllowed}
              className="size-4 rounded border-neutral-300 text-neutral-950"
            />
            <span>
              <span className="font-medium text-neutral-950">Autoriser les réservations le jour même</span>
              <span className="mt-0.5 block text-xs text-neutral-500">Pratique selon les métiers et l’organisation.</span>
            </span>
          </label>
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

      <SectionCard
        title="Page publique"
        description="Message d’accueil, description et texte après réservation. Simple, premium, et fidèle à ton activité."
      >
        <form className="grid max-w-2xl gap-6" onSubmit={onSubmitPublic}>
          <div>
            <label className={labelClass}>Nom affiché publiquement</label>
            <input
              name="publicDisplayName"
              className={`${inputClass} mt-2`}
              defaultValue={s.publicDisplayName ?? ""}
              placeholder="Ex. Salon Jeanne"
            />
            <p className="mt-2 text-xs leading-relaxed text-neutral-400">
              Si vide, on utilise le nom business.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-neutral-200/90 bg-white p-5 shadow-[0_2px_16px_-6px_rgba(0,0,0,0.06)]">
              <p className="text-sm font-semibold text-neutral-950">Branding</p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                Ces images s’affichent sur ta page publique. Remplace le branding Wavon par le tien.
              </p>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className={labelClass}>Logo</p>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="relative size-16 overflow-hidden rounded-2xl border border-neutral-200/90 bg-neutral-50">
                      {logoUrl ? (
                        <Image
                          src={logoUrl}
                          alt=""
                          fill
                          className="object-cover"
                          onError={() => {
                            if (process.env.NODE_ENV !== "production") {
                              console.warn("[branding] logo failed:", { path: s.publicLogoPath, url: logoUrl });
                            }
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-neutral-500">
                          {((s.publicDisplayName || s.businessName || "?").trim().slice(0, 2) || "?").toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className={`${btnPrimaryClass} w-fit cursor-pointer`}>
                        {brandingLoading === "logo" ? "Upload…" : "Uploader"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => void uploadAsset("logo", e.target.files?.[0] ?? null)}
                          disabled={brandingLoading !== null}
                        />
                      </label>
                      <button
                        type="button"
                        className={`${btnGhostClass} w-fit`}
                        onClick={() => void removeAsset("logo")}
                        disabled={!s.publicLogoPath && !s.publicLogoUrl || brandingLoading !== null}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-neutral-400">PNG/JPG/WebP/SVG, max 5 Mo.</p>
                </div>

                <div>
                  <p className={labelClass}>Bannière</p>
                  <div className="mt-2 overflow-hidden rounded-2xl border border-neutral-200/90 bg-neutral-50">
                    {coverUrl ? (
                      <div className="relative h-16 w-full">
                        <Image
                          src={coverUrl}
                          alt=""
                          fill
                          className="object-cover"
                          onError={() => {
                            if (process.env.NODE_ENV !== "production") {
                              console.warn("[branding] cover failed:", { path: s.publicCoverPath, url: coverUrl });
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex h-16 w-full items-center justify-center text-xs text-neutral-400">
                        Aucune bannière
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <label className={`${btnPrimaryClass} w-fit cursor-pointer`}>
                      {brandingLoading === "cover" ? "Upload…" : "Uploader"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => void uploadAsset("cover", e.target.files?.[0] ?? null)}
                        disabled={brandingLoading !== null}
                      />
                    </label>
                    <button
                      type="button"
                      className={`${btnGhostClass} w-fit`}
                      onClick={() => void removeAsset("cover")}
                      disabled={!s.publicCoverPath && !s.publicCoverUrl || brandingLoading !== null}
                    >
                      Supprimer
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-neutral-400">Recommandé: image horizontale (ex. 1600×500).</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Message d’accueil</label>
            <input
              name="publicWelcomeMessage"
              className={`${inputClass} mt-2`}
              defaultValue={s.publicWelcomeMessage ?? ""}
              placeholder="Ex. Bienvenue — choisissez votre prestation."
            />
          </div>
          <div>
            <label className={labelClass}>Description courte</label>
            <input
              name="publicDescription"
              className={`${inputClass} mt-2`}
              defaultValue={s.publicDescription ?? ""}
              placeholder="Ex. Salon premium — centre-ville."
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700">
              <input
                type="checkbox"
                name="publicShowPhone"
                defaultChecked={s.publicShowPhone}
                className="size-4 rounded border-neutral-300 text-neutral-950"
              />
              <span className="font-medium text-neutral-950">Afficher téléphone</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700">
              <input
                type="checkbox"
                name="publicShowAddress"
                defaultChecked={s.publicShowAddress}
                className="size-4 rounded border-neutral-300 text-neutral-950"
              />
              <span className="font-medium text-neutral-950">Afficher adresse</span>
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700">
              <input
                type="checkbox"
                name="publicShowDescription"
                defaultChecked={s.publicShowDescription}
                className="size-4 rounded border-neutral-300 text-neutral-950"
              />
              <span className="font-medium text-neutral-950">Afficher description</span>
            </label>
          </div>
          <div>
            <label className={labelClass}>Message après réservation</label>
            <input
              name="publicAfterBookingMessage"
              className={`${inputClass} mt-2`}
              defaultValue={s.publicAfterBookingMessage}
              placeholder="Ex. Merci, nous revenons vers vous rapidement."
            />
          </div>
          <button type="submit" className={`${btnPrimaryClass} w-fit`}>
            Enregistrer la page publique
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title="Communications"
        description="Personnalise les emails (templates enregistrés en base). Variables disponibles : {{business_name}}, {{client_name}}, {{service_name}}, {{reservation_date}}, {{reservation_time}}, {{business_phone}}"
      >
        <div className="grid max-w-3xl gap-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTemplateType("confirmation")}
              className={`${btnPrimaryClass} ${templateType === "confirmation" ? "" : "bg-neutral-100 text-neutral-900 hover:bg-neutral-100"}`}
            >
              Confirmation
            </button>
            <button
              type="button"
              onClick={() => setTemplateType("reminder")}
              className={`${btnPrimaryClass} ${templateType === "reminder" ? "" : "bg-neutral-100 text-neutral-900 hover:bg-neutral-100"}`}
            >
              Rappel
            </button>
            <button
              type="button"
              onClick={() => setTemplateType("cancellation")}
              className={`${btnPrimaryClass} ${templateType === "cancellation" ? "" : "bg-neutral-100 text-neutral-900 hover:bg-neutral-100"}`}
            >
              Annulation
            </button>
          </div>

          <TemplateEditor
            key={templateType}
            type={templateType}
            initial={state.emailTemplates.find((t) => t.type === templateType) ?? null}
            onSave={(next) => {
              upsertEmailTemplate(next);
              toast.push({ message: "Template enregistré." });
            }}
          />
          <p className="text-xs leading-relaxed text-neutral-400">
            L’envoi d’emails peut être branché ensuite (SendGrid/Resend). Ici, on pose une base persistante et editable.
          </p>
        </div>
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

function TemplateEditor({
  type,
  initial,
  onSave,
}: {
  type: "confirmation" | "reminder" | "cancellation";
  initial: { isEnabled: boolean; subject: string; body: string } | null;
  onSave: (next: { type: "confirmation" | "reminder" | "cancellation"; isEnabled: boolean; subject: string; body: string }) => void;
}) {
  const [isEnabled, setIsEnabled] = useState(initial?.isEnabled ?? true);
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");

  return (
    <form
      className="grid gap-5 rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-[0_2px_16px_-6px_rgba(0,0,0,0.06)]"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ type, isEnabled, subject: subject.trim(), body });
      }}
    >
      <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => setIsEnabled(e.target.checked)}
          className="size-4 rounded border-neutral-300 text-neutral-950"
        />
        <span className="font-medium text-neutral-950">Activer cet email</span>
      </label>
      <div>
        <label className={labelClass}>Objet</label>
        <input className={`${inputClass} mt-2`} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Contenu</label>
        <textarea
          className={`${inputClass} mt-2 min-h-[180px] resize-y leading-relaxed`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <p className="mt-2 text-xs leading-relaxed text-neutral-400">
          Astuce : garde un ton cohérent avec ton activité (premium, rassurant, direct).
        </p>
      </div>
      <button type="submit" className={`${btnPrimaryClass} w-fit`}>
        Enregistrer le template
      </button>
    </form>
  );
}
