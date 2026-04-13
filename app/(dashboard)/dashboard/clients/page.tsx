"use client";

import { useMemo, useState } from "react";
import { useWavon } from "@/components/wavon/WavonProvider";
import { Modal } from "@/components/wavon/Modal";
import { PageHeader } from "@/components/wavon/ui/PageHeader";
import { useToast } from "@/components/wavon/Toast";
import type { Client } from "@/lib/wavon/types";
import {
  btnGhostClass,
  btnPrimaryClass,
  cardClass,
  inputClass,
  labelClass,
  linkClass,
  spinnerClass,
  tableHeadClass,
  tableRowClass,
} from "@/lib/wavon/tokens";
import { formatDateShort } from "@/lib/wavon/format";

export default function ClientsPage() {
  const { ready, state, addClient, updateClient, deleteClient } = useWavon();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of state.reservations) {
      if (!r.clientId) continue;
      m.set(r.clientId, (m.get(r.clientId) ?? 0) + 1);
    }
    return m;
  }, [state.reservations]);

  const lastByClient = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of state.reservations) {
      if (!r.clientId) continue;
      const prev = m.get(r.clientId);
      if (!prev || new Date(r.start) > new Date(prev)) {
        m.set(r.clientId, r.start);
      }
    }
    return m;
  }, [state.reservations]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setPhone("");
    setEmail("");
    setOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setName(c.name);
    setPhone(c.phone);
    setEmail(c.email);
    setOpen(true);
  };

  const save = () => {
    if (!name.trim()) {
      toast.push({ kind: "error", message: "Le nom est requis." });
      return;
    }
    if (editing) {
      updateClient(editing.id, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      toast.push({ message: "Client mis à jour." });
    } else {
      addClient({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      toast.push({ message: "Client ajouté." });
    }
    setOpen(false);
  };

  const remove = (c: Client) => {
    if (!confirm(`Supprimer ${c.name} ?`)) return;
    deleteClient(c.id);
    toast.push({ message: "Client supprimé." });
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
        title="Clients"
        description="Fiches clients liées aux réservations enregistrées."
        actions={
          <button type="button" className={btnPrimaryClass} onClick={openCreate}>
            Ajouter un client
          </button>
        }
      />

      <section className={cardClass}>
        {state.clients.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm text-neutral-600">Aucun client enregistré.</p>
            <button type="button" className={`${btnPrimaryClass} mt-5`} onClick={openCreate}>
              Ajouter
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className={tableHeadClass}>
                  <th className="px-3 py-3">Nom</th>
                  <th className="px-3 py-3">Téléphone</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Réservations</th>
                  <th className="px-3 py-3">Dernière réservation</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.clients.map((c) => (
                  <tr key={c.id} className={tableRowClass}>
                    <td className="px-3 py-3.5 font-medium text-neutral-950">{c.name}</td>
                    <td className="px-3 py-3.5 text-neutral-600">{c.phone || "—"}</td>
                    <td className="px-3 py-3.5 text-neutral-600">{c.email || "—"}</td>
                    <td className="px-3 py-3.5 tabular-nums text-neutral-700">{counts.get(c.id) ?? 0}</td>
                    <td className="px-3 py-3.5 text-neutral-600">
                      {lastByClient.get(c.id) ? formatDateShort(lastByClient.get(c.id)!) : "—"}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <button type="button" onClick={() => openEdit(c)} className={`${linkClass} text-xs`}>
                        Modifier
                      </button>
                      <span className="mx-2 text-neutral-200">|</span>
                      <button
                        type="button"
                        onClick={() => remove(c)}
                        className="text-xs font-medium text-red-600/90 underline-offset-4 hover:underline"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Modifier le client" : "Nouveau client"}
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
          <div>
            <label className={labelClass}>Téléphone</label>
            <input className={`${inputClass} mt-2`} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              className={`${inputClass} mt-2`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
