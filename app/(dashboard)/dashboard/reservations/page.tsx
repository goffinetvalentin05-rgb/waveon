"use client";

import { useMemo, useState } from "react";
import { useWavon } from "@/components/wavon/WavonProvider";
import { Modal } from "@/components/wavon/Modal";
import { useToast } from "@/components/wavon/Toast";
import { combineYmdTime, getAvailableSlots, toYmd } from "@/lib/wavon/booking-logic";
import { formatDateTime } from "@/lib/wavon/format";
import type { Reservation, ReservationStatus } from "@/lib/wavon/types";
import { btnGhostClass, btnPrimaryClass, cardClass, inputClass } from "@/lib/wavon/tokens";

type FormMode = "create" | "edit";

export default function ReservationsPage() {
  const { ready, state, addReservation, updateReservation, deleteReservation } = useWavon();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<FormMode>("create");
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [serviceId, setServiceId] = useState("");
  const [dateYmd, setDateYmd] = useState(toYmd(new Date()));
  const [time, setTime] = useState("10:00");

  const sorted = useMemo(
    () =>
      [...state.reservations].sort(
        (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
      ),
    [state.reservations]
  );

  const slots = useMemo(() => {
    const svc = state.services.find((s) => s.id === serviceId);
    if (!svc || !dateYmd) return [];
    return getAvailableSlots(dateYmd, svc, state);
  }, [state, serviceId, dateYmd]);

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    setClientName("");
    setClientId("");
    setServiceId(state.services[0]?.id ?? "");
    setDateYmd(toYmd(new Date()));
    setTime("10:00");
    setModalOpen(true);
  };

  const openEdit = (r: Reservation) => {
    setMode("edit");
    setEditing(r);
    setClientName(r.clientName);
    setClientId(r.clientId ?? "");
    setServiceId(r.serviceId);
    setDateYmd(toYmd(new Date(r.start)));
    const d = new Date(r.start);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    setTime(`${hh}:${mm}`);
    setModalOpen(true);
  };

  const submit = () => {
    const svc = state.services.find((s) => s.id === serviceId);
    if (!svc) {
      toast.push({ kind: "error", message: "Choisis un service." });
      return;
    }
    const start = combineYmdTime(dateYmd, time);
    if (mode === "create") {
      const res = addReservation({
        clientId: clientId || null,
        clientName: clientName || "Client",
        serviceId,
        start,
      });
      if (!res.ok) {
        toast.push({ kind: "error", message: res.error });
        return;
      }
      toast.push({ message: "Réservation ajoutée." });
    } else if (editing) {
      const res = updateReservation(editing.id, {
        clientId: clientId || null,
        clientName,
        serviceId,
        start,
      });
      if (!res.ok) {
        toast.push({ kind: "error", message: res.error });
        return;
      }
      toast.push({ message: "Réservation mise à jour." });
    }
    setModalOpen(false);
  };

  const setStatus = (r: Reservation, status: ReservationStatus) => {
    const res = updateReservation(r.id, { status });
    if (!res.ok) {
      toast.push({ kind: "error", message: res.error });
      return;
    }
    toast.push({ message: "Statut mis à jour." });
  };

  const remove = (r: Reservation) => {
    if (!confirm(`Supprimer la réservation de ${r.clientName} ?`)) return;
    deleteReservation(r.id);
    toast.push({ message: "Réservation supprimée." });
  };

  if (!ready) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Réservations
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Gestion complète — aucun chevauchement ni créneau hors disponibilités.
          </p>
        </div>
        <button type="button" onClick={openCreate} className={btnPrimaryClass}>
          Ajouter une réservation
        </button>
      </header>

      <section className={cardClass}>
        {sorted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-emerald-500/20 bg-black/40 px-4 py-12 text-center">
            <p className="text-sm text-white/65">Aucune réservation pour le moment.</p>
            <button type="button" onClick={openCreate} className={`${btnPrimaryClass} mt-4`}>
              Créer la première
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-emerald-500/15 text-white/55">
                  <th className="px-2 py-3 font-medium">Client</th>
                  <th className="px-2 py-3 font-medium">Service</th>
                  <th className="px-2 py-3 font-medium">Date / heure</th>
                  <th className="px-2 py-3 font-medium">Statut</th>
                  <th className="px-2 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const svc = state.services.find((s) => s.id === r.serviceId);
                  return (
                    <tr key={r.id} className="border-b border-white/5 last:border-0">
                      <td className="px-2 py-3 font-medium text-white">{r.clientName}</td>
                      <td className="px-2 py-3 text-white/75">{svc?.name ?? "—"}</td>
                      <td className="px-2 py-3 text-white/70">{formatDateTime(r.start)}</td>
                      <td className="px-2 py-3">
                        <select
                          value={r.status}
                          onChange={(e) =>
                            setStatus(r, e.target.value as ReservationStatus)
                          }
                          className="rounded-lg border border-emerald-500/25 bg-black px-2 py-1 text-xs text-white"
                        >
                          <option value="confirmed">Confirmé</option>
                          <option value="pending">En attente</option>
                          <option value="cancelled">Annulé</option>
                        </select>
                      </td>
                      <td className="px-2 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className="mr-2 text-xs font-medium text-emerald-400 hover:underline"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(r)}
                          className="text-xs font-medium text-red-300/90 hover:underline"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={mode === "create" ? "Nouvelle réservation" : "Modifier la réservation"}
        description="Seuls les créneaux valides sont proposés selon tes disponibilités."
        footer={
          <>
            <button type="button" className={btnGhostClass} onClick={() => setModalOpen(false)}>
              Annuler
            </button>
            <button type="button" className={btnPrimaryClass} onClick={submit}>
              {mode === "create" ? "Créer" : "Enregistrer"}
            </button>
          </>
        }
      >
        <div className="grid gap-4">
          <div>
            <label className="text-xs font-medium text-white/60">Client existant (optionnel)</label>
            <select
              className={`${inputClass} mt-1`}
              value={clientId}
              onChange={(e) => {
                const id = e.target.value;
                setClientId(id);
                const c = state.clients.find((x) => x.id === id);
                if (c) setClientName(c.name);
              }}
            >
              <option value="">— Manuel —</option>
              {state.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-white/60">Nom client</label>
            <input
              className={`${inputClass} mt-1`}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nom complet"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-white/60">Service</label>
            <select
              className={`${inputClass} mt-1`}
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              {state.services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.durationMin} min)
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-white/60">Date</label>
              <input
                type="date"
                className={`${inputClass} mt-1`}
                value={dateYmd}
                onChange={(e) => setDateYmd(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-white/60">Heure</label>
              <select
                className={`${inputClass} mt-1`}
                value={time}
                onChange={(e) => setTime(e.target.value)}
              >
                {slots.length === 0 ? (
                  <option value={time}>Aucun créneau — ajuste date ou service</option>
                ) : (
                  slots.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PageLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-white/60">
      <div className="h-8 w-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 motion-safe:animate-spin" />
    </div>
  );
}
