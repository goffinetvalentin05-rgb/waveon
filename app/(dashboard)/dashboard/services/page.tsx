"use client";

import { useState } from "react";
import { useWavon } from "@/components/wavon/WavonProvider";
import { Modal } from "@/components/wavon/Modal";
import { useToast } from "@/components/wavon/Toast";
import { formatPriceEUR } from "@/lib/wavon/format";
import type { Service } from "@/lib/wavon/types";
import { btnGhostClass, btnPrimaryClass, cardClass, inputClass } from "@/lib/wavon/tokens";

export default function ServicesPage() {
  const { ready, state, addService, updateService, deleteService } = useWavon();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [name, setName] = useState("");
  const [durationMin, setDurationMin] = useState(30);
  const [price, setPrice] = useState(30);
  const [description, setDescription] = useState("");

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDurationMin(30);
    setPrice(30);
    setDescription("");
    setOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setName(s.name);
    setDurationMin(s.durationMin);
    setPrice(s.price);
    setDescription(s.description);
    setOpen(true);
  };

  const save = () => {
    if (!name.trim()) {
      toast.push({ kind: "error", message: "Le nom est requis." });
      return;
    }
    if (durationMin < state.settings.minServiceDurationMin) {
      toast.push({
        kind: "error",
        message: `Durée minimum ${state.settings.minServiceDurationMin} min (paramètres).`,
      });
      return;
    }
    if (editing) {
      updateService(editing.id, {
        name: name.trim(),
        durationMin,
        price,
        description: description.trim(),
      });
      toast.push({ message: "Service mis à jour." });
    } else {
      addService({
        name: name.trim(),
        durationMin,
        price,
        description: description.trim(),
      });
      toast.push({ message: "Service créé." });
    }
    setOpen(false);
  };

  const remove = (s: Service) => {
    if (!confirm(`Supprimer « ${s.name} » ?`)) return;
    deleteService(s.id);
    toast.push({ message: "Service supprimé." });
  };

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 motion-safe:animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Services</h1>
          <p className="mt-1 text-sm text-white/60">
            Durée utilisée pour éviter les chevauchements sur le planning.
          </p>
        </div>
        <button type="button" className={btnPrimaryClass} onClick={openCreate}>
          Ajouter un service
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {state.services.length === 0 ? (
          <div className={`${cardClass} md:col-span-2 text-center text-sm text-white/60`}>
            Aucun service. Ajoute ton premier forfait ou prestation.
            <div className="mt-4">
              <button type="button" className={btnPrimaryClass} onClick={openCreate}>
                Créer un service
              </button>
            </div>
          </div>
        ) : (
          state.services.map((s) => (
            <article key={s.id} className={cardClass}>
              <h2 className="text-lg font-semibold text-white">{s.name}</h2>
              <p className="mt-2 text-sm text-white/55">{s.description || "—"}</p>
              <dl className="mt-4 flex flex-wrap gap-4 text-sm">
                <div>
                  <dt className="text-white/45">Durée</dt>
                  <dd className="font-medium text-emerald-300">{s.durationMin} min</dd>
                </div>
                <div>
                  <dt className="text-white/45">Prix</dt>
                  <dd className="font-medium text-white">{formatPriceEUR(s.price)}</dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(s)}
                  className="text-sm font-medium text-emerald-400 hover:underline"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => remove(s)}
                  className="text-sm font-medium text-red-300/90 hover:underline"
                >
                  Supprimer
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Modifier le service" : "Nouveau service"}
        footer={
          <>
            <button type="button" className={btnGhostClass} onClick={() => setOpen(false)}>
              Annuler
            </button>
            <button type="button" className={btnPrimaryClass} onClick={save}>
              Enregistrer
            </button>
          </>
        }
      >
        <div className="grid gap-4">
          <div>
            <label className="text-xs text-white/55">Nom</label>
            <input
              className={`${inputClass} mt-1`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs text-white/55">Durée (minutes)</label>
              <input
                type="number"
                min={5}
                step={5}
                className={`${inputClass} mt-1`}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs text-white/55">Prix (€)</label>
              <input
                type="number"
                min={0}
                step={1}
                className={`${inputClass} mt-1`}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/55">Description</label>
            <textarea
              className={`${inputClass} mt-1 min-h-[88px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
