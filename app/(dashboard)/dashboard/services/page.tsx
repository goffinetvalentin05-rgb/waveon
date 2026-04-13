"use client";

import { useState } from "react";
import { useWavon } from "@/components/wavon/WavonProvider";
import { Modal } from "@/components/wavon/Modal";
import { PageHeader } from "@/components/wavon/ui/PageHeader";
import { useToast } from "@/components/wavon/Toast";
import { formatPriceEUR } from "@/lib/wavon/format";
import type { Service } from "@/lib/wavon/types";
import {
  btnGhostClass,
  btnPrimaryClass,
  cardClass,
  inputClass,
  labelClass,
  linkClass,
  spinnerClass,
  textareaClass,
} from "@/lib/wavon/tokens";

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
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className={spinnerClass} aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <PageHeader
        title="Services"
        description="Chaque prestation définit la durée des créneaux sur ton agenda."
        actions={
          <button type="button" className={btnPrimaryClass} onClick={openCreate}>
            Ajouter un service
          </button>
        }
      />

      <div className="grid gap-5 md:grid-cols-2">
        {state.services.length === 0 ? (
          <div className={`${cardClass} md:col-span-2 text-center`}>
            <p className="text-sm text-neutral-600">Aucun service pour l’instant.</p>
            <button type="button" className={`${btnPrimaryClass} mt-5`} onClick={openCreate}>
              Créer un service
            </button>
          </div>
        ) : (
          state.services.map((s) => (
            <article key={s.id} className={cardClass}>
              <h2 className="text-lg font-semibold tracking-tight text-neutral-950">{s.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {s.description || "Pas de description."}
              </p>
              <dl className="mt-5 flex flex-wrap gap-8 border-t border-neutral-100 pt-5 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                    Durée
                  </dt>
                  <dd className="mt-1 font-medium tabular-nums text-neutral-950">{s.durationMin} min</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-neutral-400">Prix</dt>
                  <dd className="mt-1 font-medium text-neutral-950">{formatPriceEUR(s.price)}</dd>
                </div>
              </dl>
              <div className="mt-6 flex flex-wrap gap-4">
                <button type="button" onClick={() => openEdit(s)} className={linkClass}>
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => remove(s)}
                  className="text-sm font-medium text-red-600/90 underline-offset-4 hover:underline"
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
        <div className="grid gap-5">
          <div>
            <label className={labelClass}>Nom</label>
            <input className={`${inputClass} mt-2`} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Durée (minutes)</label>
              <input
                type="number"
                min={5}
                step={5}
                className={`${inputClass} mt-2`}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
              />
            </div>
            <div>
              <label className={labelClass}>Prix (€)</label>
              <input
                type="number"
                min={0}
                step={1}
                className={`${inputClass} mt-2`}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={`${textareaClass} mt-2`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
