"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useWavon } from "@/components/wavon/WavonProvider";
import { Modal } from "@/components/wavon/Modal";
import { useToast } from "@/components/wavon/Toast";
import { getBrandingPublicUrl, uploadEmployeePhoto, deleteEmployeePhoto } from "@/lib/wavon/storage";
import type { Employee } from "@/lib/wavon/types";
import { supabase } from "@/lib/supabase/client";
import {
  btnGhostClass,
  btnPrimaryClass,
  cardClass,
  inputClass,
  labelClass,
  sectionDescClass,
  sectionTitleClass,
  userTextBreakClass,
} from "@/lib/wavon/tokens";

const EMPLOYEE_NAME_MAX = 60;

function isHexColor(v: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(v.trim());
}

function pickDistinctColor(existing: string[]): string {
  const palette = ["#0a0a0a", "#2563eb", "#16a34a", "#ea580c", "#7c3aed", "#dc2626", "#0891b2", "#a21caf"];
  const taken = new Set(existing.map((x) => x.toLowerCase()));
  for (const c of palette) if (!taken.has(c.toLowerCase())) return c;
  return palette[0]!;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.slice(0, 1) ?? "?";
  const b = parts.length > 1 ? (parts[parts.length - 1]?.slice(0, 1) ?? "") : "";
  return (a + b).toUpperCase();
}

export function EquipeTab() {
  const { state, businessId, upsertEmployee, deleteEmployee, updateServiceChecked } = useWavon();
  const toast = useToast();
  const employees = (state.employees ?? []).slice().sort((a, b) => (a.displayOrder - b.displayOrder) || a.createdAt.localeCompare(b.createdAt));
  const services = state.services;

  const servicesCountByEmployee = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of employees) map.set(e.id, 0);
    for (const s of services) {
      const ids = s.employeeIds ?? [];
      if (ids.length === 0) {
        // Tous les employés actifs = on n'incrémente pas (sinon la métrique devient trompeuse)
        continue;
      }
      for (const id of ids) {
        map.set(id, (map.get(id) ?? 0) + 1);
      }
    }
    return map;
  }, [employees, services]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [color, setColor] = useState("#0a0a0a");
  const [isActive, setIsActive] = useState(true);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [allServices, setAllServices] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setEmail("");
    setPhone("");
    setPhotoUrl(null);
    setIsActive(true);
    setColor(pickDistinctColor(employees.map((e) => e.color)));
    setAllServices(true);
    setSelectedServiceIds([]);
    setOpen(true);
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    setName(e.name);
    setEmail(e.email ?? "");
    setPhone(e.phone ?? "");
    setPhotoUrl(e.photoUrl ?? null);
    setIsActive(Boolean(e.isActive));
    setColor(e.color);
    // Services attitrés: on inverse le modèle (service.employeeIds)
    const assigned = services
      .filter((s) => (s.employeeIds ?? []).length > 0 && (s.employeeIds ?? []).includes(e.id))
      .map((s) => s.id);
    setAllServices(assigned.length === 0);
    setSelectedServiceIds(assigned);
    setOpen(true);
  };

  const save = async () => {
    const trimmed = name.trim().slice(0, EMPLOYEE_NAME_MAX);
    if (!trimmed) {
      toast.push({ kind: "error", message: "Le nom est requis." });
      return;
    }
    if (!isHexColor(color)) {
      toast.push({ kind: "error", message: "Couleur invalide (format #RRGGBB)." });
      return;
    }

    const displayOrder = editing?.displayOrder ?? (employees.length ? Math.max(...employees.map((x) => x.displayOrder)) + 1 : 0);
    const res = await upsertEmployee({
      id: editing?.id,
      name: trimmed,
      email: email.trim() ? email.trim() : null,
      phone: phone.trim() ? phone.trim() : null,
      photoUrl: photoUrl?.trim() ? photoUrl.trim() : null,
      color: color.trim(),
      isActive,
      displayOrder,
    });
    if (!res.ok) {
      toast.push({ kind: "error", message: res.error });
      return;
    }

    // Mettre à jour les services (employee_ids) selon le choix
    const employeeId = res.id;
    const activeServices = services.filter((s) => s.isActive);
    const desiredAssigned = allServices ? new Set<string>() : new Set(selectedServiceIds);

    // On met à jour les services via le provider (qui persiste en DB).
    const writes: Array<Promise<{ ok: true } | { ok: false; error: string }>> = [];
    for (const s of activeServices) {
      const cur = new Set((s.employeeIds ?? []).filter(Boolean));
      const next = new Set(cur);
      if (allServices) {
        next.clear();
      } else {
        const shouldHave = desiredAssigned.has(s.id);
        if (shouldHave) next.add(employeeId);
        else next.delete(employeeId);
      }
      const nextArr = Array.from(next);
      const same =
        nextArr.length === (s.employeeIds ?? []).length &&
        nextArr.every((id) => (s.employeeIds ?? []).includes(id));
      if (same) continue;
      writes.push(updateServiceChecked(s.id, { employeeIds: nextArr }));
    }

    if (writes.length > 0) {
      const results = await Promise.all(writes);
      const firstErr = results.find((r) => !r.ok) as { ok: false; error: string } | undefined;
      if (firstErr) {
        toast.push({
          kind: "error",
          message: `Échec d’enregistrement des services attitrés : ${firstErr.error}`,
        });
        return;
      }
    }

    toast.push({ message: editing ? "Membre mis à jour." : "Membre ajouté." });
    setOpen(false);
  };

  const toggleActive = async (e: Employee) => {
    const res = await upsertEmployee({
      id: e.id,
      name: e.name,
      email: e.email,
      phone: e.phone,
      photoUrl: e.photoUrl,
      color: e.color,
      isActive: !e.isActive,
      displayOrder: e.displayOrder,
    });
    if (!res.ok) toast.push({ kind: "error", message: res.error });
  };

  const remove = async (e: Employee) => {
    if (!businessId) {
      toast.push({ kind: "error", message: "Compte non initialisé." });
      return;
    }
    // Bloquer si réservations futures
    const nowIso = new Date().toISOString();
    const { count, error } = await supabase
      .from("wavon_reservations")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("employee_id", e.id)
      .in("status", ["confirmed", "pending"])
      .gt("start_at", nowIso);
    if (error) {
      toast.push({ kind: "error", message: "Impossible de vérifier les réservations." });
      return;
    }
    const future = count ?? 0;
    if (future > 0) {
      toast.push({
        kind: "error",
        message: `Impossible de supprimer : cet employé a ${future} réservation${future > 1 ? "s" : ""} à venir. Désactive-le à la place.`,
      });
      return;
    }
    if (!confirm(`Supprimer « ${e.name} » ?`)) return;
    const del = await deleteEmployee(e.id);
    if (!del.ok) {
      toast.push({ kind: "error", message: del.error });
      return;
    }
    toast.push({ message: "Employé supprimé." });
  };

  const activeServices = services.filter((s) => s.isActive);

  return (
    <div className="space-y-8">
      <div className={`${cardClass} flex flex-wrap items-start justify-between gap-4`}>
        <div>
          <h2 className={sectionTitleClass}>Ton équipe</h2>
          <p className={sectionDescClass}>
            Gère les prestataires de ton établissement. Chaque membre a ses propres horaires, ses services attitrés et son agenda.
          </p>
        </div>
        <button type="button" className={btnPrimaryClass} onClick={openCreate}>
          Ajouter un membre
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {employees.map((e) => {
          const badgeClass = e.isActive
            ? "border-emerald-200/80 bg-emerald-50 text-emerald-900"
            : "border-neutral-200/90 bg-neutral-50 text-neutral-600";
          const n = servicesCountByEmployee.get(e.id) ?? 0;
          const initials = initialsFromName(e.name);
          const photo = e.photoUrl?.trim() ? (getBrandingPublicUrl(e.photoUrl) || e.photoUrl) : null;
          return (
            <article key={e.id} className={`${cardClass} overflow-hidden`}>
              <div className="flex items-start gap-4">
                <div className="relative mt-1 size-12 shrink-0 overflow-hidden rounded-full border border-neutral-200/90 bg-white">
                  {photo ? (
                    <Image src={photo} alt="" fill className="object-cover" />
                  ) : (
                    <div
                      className="flex size-12 items-center justify-center text-sm font-semibold text-white"
                      style={{ backgroundColor: e.color }}
                    >
                      {initials}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={`min-w-0 font-semibold text-neutral-950 ${userTextBreakClass}`}>{e.name}</p>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass}`}>
                      {e.isActive ? "Actif" : "Inactif"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {n} service{n > 1 ? "s" : ""}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" className={btnGhostClass + " min-h-9 px-3 text-xs"} onClick={() => openEdit(e)}>
                      Modifier
                    </button>
                    <button type="button" className={btnGhostClass + " min-h-9 px-3 text-xs"} onClick={() => void toggleActive(e)}>
                      {e.isActive ? "Désactiver" : "Activer"}
                    </button>
                    <button
                      type="button"
                      className="min-h-9 text-xs font-medium text-red-600/90 underline-offset-4 hover:underline"
                      onClick={() => void remove(e)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Modifier un membre" : "Ajouter un membre"}
        footer={
          <>
            <button type="button" className={btnGhostClass} onClick={() => setOpen(false)}>
              Annuler
            </button>
            <button type="button" className={btnPrimaryClass} onClick={() => void save()}>
              Enregistrer
            </button>
          </>
        }
      >
        <div className="grid gap-5">
          <div className="flex items-center gap-4">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-neutral-200/90 bg-white">
              {photoUrl ? (
                <Image src={getBrandingPublicUrl(photoUrl) || photoUrl} alt="" fill className="object-cover" />
              ) : (
                <div className="flex size-14 items-center justify-center text-sm font-semibold text-white" style={{ backgroundColor: color }}>
                  {initialsFromName(name || "?" )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <label className={`${btnPrimaryClass} w-fit cursor-pointer`}>
                {uploadingPhoto ? "Upload…" : "Photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingPhoto || !businessId}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (!file || !businessId) return;
                    void (async () => {
                      setUploadingPhoto(true);
                      try {
                        const { path } = await uploadEmployeePhoto({ businessId, file });
                        const prev = photoUrl;
                        setPhotoUrl(path);
                        if (prev && prev !== path) {
                          await deleteEmployeePhoto({ path: prev });
                        }
                        toast.push({ message: "Photo mise à jour." });
                      } catch {
                        toast.push({ kind: "error", message: "Upload impossible. Réessaie." });
                      } finally {
                        setUploadingPhoto(false);
                      }
                    })();
                  }}
                />
              </label>
              <button
                type="button"
                className={btnGhostClass}
                disabled={!photoUrl || uploadingPhoto}
                onClick={() => {
                  if (!photoUrl) return;
                  void (async () => {
                    try {
                      await deleteEmployeePhoto({ path: photoUrl });
                      setPhotoUrl(null);
                      toast.push({ message: "Photo supprimée." });
                    } catch {
                      toast.push({ kind: "error", message: "Suppression impossible." });
                    }
                  })();
                }}
              >
                Supprimer
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>Nom</label>
            <input
              className={`${inputClass} mt-2`}
              value={name}
              maxLength={EMPLOYEE_NAME_MAX}
              onChange={(e) => setName(e.target.value.slice(0, EMPLOYEE_NAME_MAX))}
            />
            <p className="mt-1 text-xs tabular-nums text-neutral-400">
              {name.length}/{EMPLOYEE_NAME_MAX}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Email (optionnel)</label>
              <input className={`${inputClass} mt-2`} value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </div>
            <div>
              <label className={labelClass}>Téléphone (optionnel)</label>
              <input className={`${inputClass} mt-2`} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Couleur</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={isHexColor(color) ? color : "#0a0a0a"}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-12 rounded-xl border border-neutral-200 bg-white p-1"
                />
                <input
                  className={`${inputClass} flex-1`}
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#0a0a0a"
                />
              </div>
            </div>
            <label className="mt-7 flex cursor-pointer items-center gap-3 text-sm text-neutral-700 sm:mt-8">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 rounded border-neutral-300 text-neutral-950"
              />
              <span className="font-medium text-neutral-950">Actif</span>
            </label>
          </div>

          <div className="rounded-2xl border border-neutral-200/90 bg-neutral-50/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Services attitrés
            </p>
            <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={allServices}
                onChange={(e) => {
                  const v = e.target.checked;
                  setAllServices(v);
                  if (v) setSelectedServiceIds([]);
                }}
                className="size-4 rounded border-neutral-300 text-neutral-950"
              />
              <span className="font-medium text-neutral-950">Tous les services</span>
            </label>
            {!allServices ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {activeServices.map((s) => (
                  <label key={s.id} className={`flex cursor-pointer items-center gap-3 text-sm text-neutral-700 ${userTextBreakClass}`}>
                    <input
                      type="checkbox"
                      checked={selectedServiceIds.includes(s.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedServiceIds((prev) =>
                          checked ? [...prev, s.id] : prev.filter((x) => x !== s.id)
                        );
                      }}
                      className="size-4 rounded border-neutral-300 text-neutral-950"
                    />
                    <span className="font-medium text-neutral-950">{s.name}</span>
                  </label>
                ))}
              </div>
            ) : null}
            {activeServices.length === 0 ? (
              <p className="mt-3 text-xs text-neutral-500">Aucun service actif.</p>
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  );
}

