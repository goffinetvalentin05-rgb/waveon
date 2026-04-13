"use client";

import { useMemo, useState } from "react";
import { useWavon } from "@/components/wavon/WavonProvider";
import { Modal } from "@/components/wavon/Modal";
import { PageHeader } from "@/components/wavon/ui/PageHeader";
import { useToast } from "@/components/wavon/Toast";
import { combineYmdTime, getAvailableSlots, toYmd } from "@/lib/wavon/booking-logic";
import { formatDateShort, formatTime } from "@/lib/wavon/format";
import type { Reservation, ReservationStatus } from "@/lib/wavon/types";
import {
  btnGhostClass,
  btnPrimaryClass,
  cardClass,
  inputClass,
  labelClass,
  linkClass,
  selectCompactClass,
  spinnerClass,
  tableHeadClass,
  tableRowClass,
} from "@/lib/wavon/tokens";

type FormMode = "create" | "edit";

export default function ReservationsPage() {
  const { ready, state, addReservation, updateReservation, deleteReservation } = useWavon();
  const toast = useToast();
  const [filter, setFilter] = useState("");
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

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((r) => r.clientName.toLowerCase().includes(q));
  }, [sorted, filter]);

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
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className={spinnerClass} aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <PageHeader
        title="Réservations"
        description="Planning clair : créneaux conformes à tes disponibilités, sans chevauchement."
        actions={
          <button type="button" onClick={openCreate} className={btnPrimaryClass}>
            Ajouter une réservation
          </button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md">
          <label className={labelClass}>Filtrer par client</label>
          <input
            className={`${inputClass} mt-2`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Rechercher un nom…"
          />
        </div>
      </div>

      <section className={cardClass}>
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/40 px-6 py-14 text-center">
            <p className="text-sm text-neutral-600">Aucune réservation pour le moment.</p>
            <button type="button" onClick={openCreate} className={`${btnPrimaryClass} mt-5`}>
              Créer la première
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-500">Aucun résultat pour ce filtre.</p>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className={tableHeadClass}>
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">Service</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Heure</th>
                  <th className="px-3 py-3">Statut</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const svc = state.services.find((s) => s.id === r.serviceId);
                  return (
                    <tr key={r.id} className={tableRowClass}>
                      <td className="px-3 py-3.5 font-medium text-neutral-950">{r.clientName}</td>
                      <td className="px-3 py-3.5 text-neutral-600">{svc?.name ?? "—"}</td>
                      <td className="px-3 py-3.5 text-neutral-600">{formatDateShort(r.start)}</td>
                      <td className="px-3 py-3.5 text-neutral-600 tabular-nums">{formatTime(r.start)}</td>
                      <td className="px-3 py-3.5">
                        <select
                          value={r.status}
                          onChange={(e) => setStatus(r, e.target.value as ReservationStatus)}
                          className={selectCompactClass}
                        >
                          <option value="confirmed">Confirmé</option>
                          <option value="pending">En attente</option>
                          <option value="cancelled">Annulé</option>
                        </select>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(r)}
                          className={`${linkClass} text-xs`}
                        >
                          Modifier
                        </button>
                        <span className="mx-2 text-neutral-200">|</span>
                        <button
                          type="button"
                          onClick={() => remove(r)}
                          className="text-xs font-medium text-red-600/90 underline-offset-4 hover:underline"
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
        description="Seuls les créneaux compatibles avec tes disponibilités sont proposés."
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
        <div className="grid gap-5">
          <div>
            <label className={labelClass}>Client enregistré (optionnel)</label>
            <select
              className={`${inputClass} mt-2`}
              value={clientId}
              onChange={(e) => {
                const id = e.target.value;
                setClientId(id);
                const c = state.clients.find((x) => x.id === id);
                if (c) setClientName(c.name);
              }}
            >
              <option value="">Saisie manuelle</option>
              {state.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Nom du client</label>
            <input
              className={`${inputClass} mt-2`}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nom complet"
            />
          </div>
          <div>
            <label className={labelClass}>Service</label>
            <select
              className={`${inputClass} mt-2`}
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
              <label className={labelClass}>Date</label>
              <input
                type="date"
                className={`${inputClass} mt-2`}
                value={dateYmd}
                onChange={(e) => setDateYmd(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Heure</label>
              <select
                className={`${inputClass} mt-2`}
                value={time}
                onChange={(e) => setTime(e.target.value)}
              >
                {slots.length === 0 ? (
                  <option value={time}>Aucun créneau — ajuste la date ou le service</option>
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
