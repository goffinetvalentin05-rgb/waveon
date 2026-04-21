"use client";

import { useMemo, useState } from "react";
import { useWavon } from "@/components/wavon/WavonProvider";
import { Modal } from "@/components/wavon/Modal";
import { PageHeader } from "@/components/wavon/ui/PageHeader";
import { useToast } from "@/components/wavon/Toast";
import type { Client } from "@/lib/wavon/types";
import { formatDateShort } from "@/lib/wavon/format";
import { formatPrice } from "@/lib/utils/formatPrice";
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
  textareaClass,
} from "@/lib/wavon/tokens";

export default function ClientsPage() {
  const { ready, state, addClient, updateClient, deleteClient } = useWavon();
  const toast = useToast();
  const currency = state.settings.currency;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [drawerClient, setDrawerClient] = useState<Client | null>(null);
  const [privateNote, setPrivateNote] = useState("");

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

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return state.clients;
    return state.clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q)
    );
  }, [state.clients, search]);

  const openDrawer = (c: Client) => {
    setDrawerClient(c);
    setPrivateNote(c.privateNote ?? "");
  };

  const closeDrawer = () => setDrawerClient(null);

  const history = useMemo(() => {
    if (!drawerClient) return [];
    return state.reservations
      .filter((r) => r.clientId === drawerClient.id)
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
      .map((r) => {
        const svc = state.services.find((s) => s.id === r.serviceId);
        return {
          id: r.id,
          start: r.start,
          serviceName: svc?.name ?? "—",
          status: r.status,
          price: svc?.price ?? 0,
        };
      });
  }, [drawerClient, state.reservations, state.services]);

  const totalSpent = useMemo(() => history.reduce((a, b) => a + b.price, 0), [history]);

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
        privateNote: "",
      });
      toast.push({ message: "Client ajouté." });
    }
    setOpen(false);
  };

  const remove = (c: Client) => {
    if (!confirm(`Supprimer ${c.name} ?`)) return;
    deleteClient(c.id);
    if (drawerClient?.id === c.id) closeDrawer();
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

      <div className="max-w-md">
        <label className={labelClass}>Recherche</label>
        <input
          className={`${inputClass} mt-2`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nom, email ou téléphone…"
        />
      </div>

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
                {filteredClients.map((c) => (
                  <tr
                    key={c.id}
                    className={`${tableRowClass} cursor-pointer hover:bg-neutral-50/80`}
                    onClick={() => openDrawer(c)}
                  >
                    <td className="px-3 py-3.5 font-medium text-neutral-950">{c.name}</td>
                    <td className="px-3 py-3.5 text-neutral-600">{c.phone || "—"}</td>
                    <td className="px-3 py-3.5 text-neutral-600">{c.email || "—"}</td>
                    <td className="px-3 py-3.5 tabular-nums text-neutral-700">{counts.get(c.id) ?? 0}</td>
                    <td className="px-3 py-3.5 text-neutral-600">
                      {lastByClient.get(c.id) ? formatDateShort(lastByClient.get(c.id)!) : "—"}
                    </td>
                    <td className="px-3 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
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
        {filteredClients.length === 0 && state.clients.length > 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">Aucun résultat.</p>
        ) : null}
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

      {drawerClient ? (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-neutral-950/25 backdrop-blur-[1px]"
            aria-label="Fermer"
            onClick={closeDrawer}
          />
          <aside className="relative z-[71] flex h-full w-full max-w-md flex-col border-l border-neutral-200/90 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-neutral-950">{drawerClient.name}</h2>
                <p className="mt-1 text-sm text-neutral-600">{drawerClient.phone || "—"}</p>
                <p className="text-sm text-neutral-600">{drawerClient.email || "—"}</p>
              </div>
              <button type="button" className={btnGhostClass} onClick={closeDrawer}>
                Fermer
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-2 gap-4 rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Total dépensé</p>
                  <p className="mt-1 text-lg font-semibold text-neutral-950">{formatPrice(totalSpent, currency)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">Nombre de RDV</p>
                  <p className="mt-1 text-lg font-semibold text-neutral-950">{history.length}</p>
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-semibold text-neutral-950">Historique des rendez-vous</h3>
                {history.length === 0 ? (
                  <p className="mt-3 text-sm text-neutral-500">Aucun rendez-vous lié.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-xl border border-neutral-100">
                    <table className="w-full min-w-[320px] text-left text-xs">
                      <thead>
                        <tr className="border-b border-neutral-100 bg-neutral-50/80">
                          <th className="px-3 py-2 font-medium text-neutral-600">Date</th>
                          <th className="px-3 py-2 font-medium text-neutral-600">Service</th>
                          <th className="px-3 py-2 font-medium text-neutral-600">Statut</th>
                          <th className="px-3 py-2 text-right font-medium text-neutral-600">Prix</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((h) => (
                          <tr key={h.id} className="border-b border-neutral-50 last:border-0">
                            <td className="px-3 py-2 text-neutral-800">{formatDateShort(h.start)}</td>
                            <td className="px-3 py-2 text-neutral-700">{h.serviceName}</td>
                            <td className="px-3 py-2 text-neutral-700">
                              {h.status === "confirmed"
                                ? "Confirmé"
                                : h.status === "pending"
                                  ? "En attente"
                                  : "Annulé"}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-neutral-800">
                              {formatPrice(h.price, currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="mt-8">
                <label className={labelClass}>Note privée</label>
                <p className="mt-1 text-xs text-neutral-400">Visible uniquement par toi.</p>
                <textarea
                  className={`${textareaClass} mt-2 min-h-[120px]`}
                  value={privateNote}
                  onChange={(e) => setPrivateNote(e.target.value)}
                  onBlur={() => {
                    updateClient(drawerClient.id, { privateNote: privateNote.trim() });
                    setDrawerClient({ ...drawerClient, privateNote: privateNote.trim() });
                  }}
                  placeholder="Rappels internes sur ce client…"
                />
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
