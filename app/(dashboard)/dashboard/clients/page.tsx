"use client";

import { useMemo, useState } from "react";
import { useWavon } from "@/components/wavon/WavonProvider";
import { Modal } from "@/components/wavon/Modal";
import { useToast } from "@/components/wavon/Toast";
import type { Client } from "@/lib/wavon/types";
import { btnGhostClass, btnPrimaryClass, cardClass, inputClass } from "@/lib/wavon/tokens";

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
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 motion-safe:animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Clients</h1>
          <p className="mt-1 text-sm text-white/60">Base clients liée aux réservations.</p>
        </div>
        <button type="button" className={btnPrimaryClass} onClick={openCreate}>
          Ajouter un client
        </button>
      </header>

      <section className={cardClass}>
        {state.clients.length === 0 ? (
          <div className="py-10 text-center text-sm text-white/60">
            Aucun client enregistré.
            <div className="mt-4">
              <button type="button" className={btnPrimaryClass} onClick={openCreate}>
                Ajouter
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-emerald-500/15 text-white/55">
                  <th className="px-2 py-3 font-medium">Nom</th>
                  <th className="px-2 py-3 font-medium">Téléphone</th>
                  <th className="px-2 py-3 font-medium">Email</th>
                  <th className="px-2 py-3 font-medium">Réservations</th>
                  <th className="px-2 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.clients.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 last:border-0">
                    <td className="px-2 py-3 font-medium text-white">{c.name}</td>
                    <td className="px-2 py-3 text-white/70">{c.phone || "—"}</td>
                    <td className="px-2 py-3 text-white/70">{c.email || "—"}</td>
                    <td className="px-2 py-3 text-emerald-300/90">{counts.get(c.id) ?? 0}</td>
                    <td className="px-2 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="mr-2 text-xs font-medium text-emerald-400 hover:underline"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(c)}
                        className="text-xs font-medium text-red-300/90 hover:underline"
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
        <div className="grid gap-4">
          <div>
            <label className="text-xs text-white/55">Nom</label>
            <input className={`${inputClass} mt-1`} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-white/55">Téléphone</label>
            <input className={`${inputClass} mt-1`} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-white/55">Email</label>
            <input
              type="email"
              className={`${inputClass} mt-1`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
