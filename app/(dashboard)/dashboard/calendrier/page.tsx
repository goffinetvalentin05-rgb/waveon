"use client";

import "react-big-calendar/lib/css/react-big-calendar.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addMonths, addWeeks, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useWavon } from "@/components/wavon/WavonProvider";
import { Modal } from "@/components/wavon/Modal";
import { PageHeader } from "@/components/wavon/ui/PageHeader";
import { useToast } from "@/components/wavon/Toast";
import { combineYmdTime, getAvailableSlots, toYmd } from "@/lib/wavon/booking-logic";
import {
  calendarBoundsForRange,
  isSlotOutsideBusiness,
} from "@/lib/wavon/calendar-hours";
import { formatDateShort, formatTime } from "@/lib/wavon/format";
import { formatPrice } from "@/lib/utils/formatPrice";
import type { Client, Reservation, ReservationStatus, WavonState } from "@/lib/wavon/types";
import {
  btnGhostClass,
  btnPrimaryClass,
  cardClass,
  inputClass,
  labelClass,
  linkClass,
  selectCompactClass,
  spinnerClass,
  textareaClass,
  userTextBreakClass,
} from "@/lib/wavon/tokens";

const locales = { fr };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const messages = {
  date: "Date",
  time: "Heure",
  event: "Rendez-vous",
  allDay: "Journée",
  week: "Semaine",
  work_week: "Semaine",
  day: "Jour",
  month: "Mois",
  previous: "Précédent",
  next: "Suivant",
  yesterday: "Hier",
  tomorrow: "Demain",
  today: "Aujourd'hui",
  agenda: "Agenda",
  showMore: (n: number) => `+${n} de plus`,
};

type CalEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Reservation;
};

export default function CalendrierPage() {
  const { ready, state, addReservation, updateReservation, deleteReservation } = useWavon();
  const toast = useToast();
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(() => new Date());

  const [filterServiceId, setFilterServiceId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterClientQuery, setFilterClientQuery] = useState("");
  const [clientMenuOpen, setClientMenuOpen] = useState(false);
  const [filterClientId, setFilterClientId] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRes, setDetailRes] = useState<Reservation | null>(null);

  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [serviceId, setServiceId] = useState("");
  const [dateYmd, setDateYmd] = useState(toYmd(new Date()));
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");

  const rangeEnd = useMemo(() => {
    if (view === "month") return addMonths(date, 1);
    if (view === "week") return addWeeks(date, 1);
    return addDays(date, 1);
  }, [date, view]);

  const { min, max } = useMemo(
    () => calendarBoundsForRange(state, date, rangeEnd),
    [state, date, rangeEnd]
  );

  const filteredClients = useMemo(() => {
    const q = filterClientQuery.trim().toLowerCase();
    if (!q) return state.clients;
    return state.clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q)
    );
  }, [state.clients, filterClientQuery]);

  const events = useMemo((): CalEvent[] => {
    return state.reservations
      .filter((r) => {
        if (filterServiceId && r.serviceId !== filterServiceId) return false;
        if (filterStatus && r.status !== filterStatus) return false;
        if (filterClientId && r.clientId !== filterClientId) return false;
        return true;
      })
      .map((r) => {
        const svc = state.services.find((s) => s.id === r.serviceId);
        return {
          id: r.id,
          title: `${r.clientName} — ${svc?.name ?? "Service"}`,
          start: new Date(r.start),
          end: new Date(r.end),
          resource: r,
        };
      });
  }, [state.reservations, state.services, filterServiceId, filterStatus, filterClientId]);

  const slots = useMemo(() => {
    const svc = state.services.find((s) => s.id === serviceId);
    if (!svc || !dateYmd) return [];
    return getAvailableSlots(dateYmd, svc, state);
  }, [state, serviceId, dateYmd]);

  const openCreate = () => {
    setModalMode("create");
    setEditing(null);
    setClientName("");
    setClientId("");
    setServiceId(state.services[0]?.id ?? "");
    setDateYmd(toYmd(date));
    setTime("10:00");
    setNotes("");
    setModalOpen(true);
  };

  const openEdit = (r: Reservation) => {
    setModalMode("edit");
    setEditing(r);
    setClientName(r.clientName);
    setClientId(r.clientId ?? "");
    setServiceId(r.serviceId);
    setDateYmd(toYmd(new Date(r.start)));
    const d = new Date(r.start);
    setTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    setNotes(r.notes ?? "");
    setModalOpen(true);
  };

  const submitForm = () => {
    const svc = state.services.find((s) => s.id === serviceId);
    if (!svc) {
      toast.push({ kind: "error", message: "Choisis un service." });
      return;
    }
    const start = combineYmdTime(dateYmd, time);
    if (modalMode === "create") {
      const res = addReservation({
        clientId: clientId || null,
        clientName: clientName || "Client",
        serviceId,
        start,
        notes: notes.trim(),
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
        notes: notes.trim(),
      });
      if (!res.ok) {
        toast.push({ kind: "error", message: res.error });
        return;
      }
      toast.push({ message: "Réservation mise à jour." });
    }
    setModalOpen(false);
  };

  const openDetail = useCallback((r: Reservation) => {
    setDetailRes(r);
    setDetailOpen(true);
  }, []);

  const clientRow = useMemo(() => {
    if (!detailRes) return null;
    const id = detailRes.clientId;
    if (!id) return null;
    return state.clients.find((c) => c.id === id) ?? null;
  }, [detailRes, state.clients]);

  const onSelectEvent = useCallback(
    (ev: CalEvent) => {
      openDetail(ev.resource);
    },
    [openDetail]
  );

  const eventPropGetter = useCallback((event: CalEvent) => {
    const st = event.resource.status;
    if (st === "confirmed") {
      return {
        style: {
          backgroundColor: "#dcfce7",
          borderColor: "#86efac",
          color: "#14532d",
          borderWidth: 1,
          borderStyle: "solid",
        },
      };
    }
    if (st === "pending") {
      return {
        style: {
          backgroundColor: "#fef9c3",
          borderColor: "#fde047",
          color: "#713f12",
          borderWidth: 1,
          borderStyle: "solid",
        },
      };
    }
    return {
      style: {
        backgroundColor: "#e5e7eb",
        borderColor: "#9ca3af",
        color: "#374151",
        borderWidth: 1,
        borderStyle: "solid",
        textDecoration: "line-through",
      },
    };
  }, []);

  const slotPropGetter = useCallback(
    (d: Date) => ({
      className: isSlotOutsideBusiness(state, d) ? "rbc-slot-outside" : "",
    }),
    [state]
  );

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className={spinnerClass} aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        title="Calendrier"
        description="Visualise et gère tes rendez-vous sur une grille horaire."
        actions={
          <button type="button" onClick={openCreate} className={btnPrimaryClass}>
            Nouvelle réservation
          </button>
        }
      />

      <div className={`${cardClass} flex flex-col gap-4`}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={btnGhostClass}
            onClick={() => setDate(view === "month" ? addMonths(date, -1) : view === "week" ? addWeeks(date, -1) : addDays(date, -1))}
          >
            ‹
          </button>
          <button
            type="button"
            className={btnGhostClass}
            onClick={() => setDate(view === "month" ? addMonths(date, 1) : view === "week" ? addWeeks(date, 1) : addDays(date, 1))}
          >
            ›
          </button>
          <button type="button" className={btnPrimaryClass} onClick={() => setDate(new Date())}>
            Aujourd&apos;hui
          </button>
          <div className="ml-auto flex flex-wrap gap-2">
            {(["day", "week", "month"] as const).map((v) => (
              <button
                key={v}
                type="button"
                className={view === v ? btnPrimaryClass : btnGhostClass}
                onClick={() => setView(v)}
              >
                {v === "day" ? "Jour" : v === "week" ? "Semaine" : "Mois"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 border-t border-neutral-100 pt-4 md:grid-cols-3">
          <div>
            <label className={labelClass}>Service</label>
            <select
              className={`${inputClass} mt-2`}
              value={filterServiceId}
              onChange={(e) => setFilterServiceId(e.target.value)}
            >
              <option value="">Tous</option>
              {state.services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Statut</label>
            <select
              className={`${inputClass} mt-2`}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Tous</option>
              <option value="confirmed">Confirmé</option>
              <option value="pending">En attente</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
          <div className="relative">
            <label className={labelClass}>Client</label>
            <input
              className={`${inputClass} mt-2`}
              value={filterClientId ? state.clients.find((c) => c.id === filterClientId)?.name ?? "" : filterClientQuery}
              onChange={(e) => {
                setFilterClientId("");
                setFilterClientQuery(e.target.value);
                setClientMenuOpen(true);
              }}
              onFocus={() => setClientMenuOpen(true)}
              placeholder="Rechercher…"
            />
            {clientMenuOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  aria-label="Fermer"
                  onClick={() => setClientMenuOpen(false)}
                />
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
                    onClick={() => {
                      setFilterClientId("");
                      setFilterClientQuery("");
                      setClientMenuOpen(false);
                    }}
                  >
                    Tous les clients
                  </button>
                  {filteredClients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50 ${userTextBreakClass}`}
                      onClick={() => {
                        setFilterClientId(c.id);
                        setFilterClientQuery("");
                        setClientMenuOpen(false);
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="waevon-calendar-wrap min-h-[560px]">
          <Calendar
            culture="fr"
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 560 }}
            view={view}
            views={["month", "week", "day"]}
            date={date}
            onNavigate={setDate}
            onView={setView}
            messages={messages}
            min={min}
            max={max}
            scrollToTime={date}
            eventPropGetter={eventPropGetter}
            slotPropGetter={slotPropGetter}
            onSelectEvent={onSelectEvent}
          />
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === "create" ? "Nouvelle réservation" : "Modifier la réservation"}
        footer={
          <>
            <button type="button" className={btnGhostClass} onClick={() => setModalOpen(false)}>
              Annuler
            </button>
            <button type="button" className={btnPrimaryClass} onClick={submitForm}>
              {modalMode === "create" ? "Créer" : "Enregistrer"}
            </button>
          </>
        }
      >
        <ReservationFields
          state={state}
          clientName={clientName}
          setClientName={setClientName}
          clientId={clientId}
          setClientId={setClientId}
          serviceId={serviceId}
          setServiceId={setServiceId}
          dateYmd={dateYmd}
          setDateYmd={setDateYmd}
          time={time}
          setTime={setTime}
          slots={slots}
          notes={notes}
          setNotes={setNotes}
        />
      </Modal>

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Détail du rendez-vous"
        footer={
          <>
            <button type="button" className={btnGhostClass} onClick={() => setDetailOpen(false)}>
              Fermer
            </button>
            {detailRes ? (
              <>
                <button
                  type="button"
                  className={btnGhostClass}
                  onClick={() => {
                    if (!detailRes) return;
                    setDetailOpen(false);
                    openEdit(detailRes);
                  }}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  className="text-sm font-medium text-red-600/90 underline-offset-4 hover:underline"
                  onClick={async () => {
                    if (!detailRes || !confirm(`Supprimer la réservation de ${detailRes.clientName} ?`)) return;
                    await deleteReservation(detailRes.id);
                    setDetailOpen(false);
                    toast.push({ message: "Réservation supprimée." });
                  }}
                >
                  Supprimer
                </button>
              </>
            ) : null}
          </>
        }
      >
        {detailRes ? (
          <DetailBody
            reservation={detailRes}
            service={state.services.find((s) => s.id === detailRes.serviceId)}
            currency={state.settings.currency}
            client={clientRow}
            onStatusChange={(status) => {
              const res = updateReservation(detailRes.id, { status });
              if (!res.ok) {
                toast.push({ kind: "error", message: res.error });
                return;
              }
              setDetailRes({ ...detailRes, status });
              toast.push({ message: "Statut mis à jour." });
            }}
            onNotesBlur={(n) => {
              updateReservation(detailRes.id, { notes: n });
              setDetailRes({ ...detailRes, notes: n });
            }}
          />
        ) : null}
      </Modal>

    </div>
  );
}

function ReservationFields({
  state,
  clientName,
  setClientName,
  clientId,
  setClientId,
  serviceId,
  setServiceId,
  dateYmd,
  setDateYmd,
  time,
  setTime,
  slots,
  notes,
  setNotes,
}: {
  state: WavonState;
  clientName: string;
  setClientName: (v: string) => void;
  clientId: string;
  setClientId: (v: string) => void;
  serviceId: string;
  setServiceId: (v: string) => void;
  dateYmd: string;
  setDateYmd: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
  slots: string[];
  notes: string;
  setNotes: (v: string) => void;
}) {
  return (
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
          className={`${inputClass} mt-2 min-w-0 max-w-full ${userTextBreakClass}`}
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Nom complet"
        />
      </div>
      <div>
        <label className={labelClass}>Service</label>
        <select
          className={`${inputClass} mt-2 max-w-full min-w-0`}
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
        >
          {state.services.map((s) => (
            <option key={s.id} value={s.id} title={`${s.name} (${s.durationMin} min)`}>
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
          <select className={`${inputClass} mt-2`} value={time} onChange={(e) => setTime(e.target.value)}>
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
      <div>
        <label className={labelClass}>Notes (interne)</label>
        <textarea
          className={`${textareaClass} mt-2 min-h-[88px] ${userTextBreakClass}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </div>
  );
}

function DetailBody({
  reservation,
  service,
  currency,
  client,
  onStatusChange,
  onNotesBlur,
}: {
  reservation: Reservation;
  service?: { name: string; price: number; durationMin: number };
  currency: string;
  client: Client | null;
  onStatusChange: (s: ReservationStatus) => void;
  onNotesBlur: (notes: string) => void;
}) {
  const [notesLocal, setNotesLocal] = useState(reservation.notes ?? "");
  useEffect(() => {
    setNotesLocal(reservation.notes ?? "");
  }, [reservation.id, reservation.notes]);
  return (
    <div className="grid gap-4 text-sm">
      <div className="grid gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">Client</span>
        <p className={`font-medium text-neutral-950 ${userTextBreakClass}`}>{reservation.clientName}</p>
        {client ? (
          <>
            <p className="text-neutral-600">{client.phone || "—"}</p>
            <p className="text-neutral-600">{client.email || "—"}</p>
          </>
        ) : (
          <p className="text-neutral-500">Pas de fiche client liée</p>
        )}
      </div>
      <div className="grid gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">Prestation</span>
        <p className={`text-neutral-900 ${userTextBreakClass}`}>{service?.name ?? "—"}</p>
      </div>
      {service ? (
        <div className="grid gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">Prix</span>
          <p className="text-neutral-900">{formatPrice(service.price, currency)}</p>
        </div>
      ) : null}
      <div className="grid gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">Date et heure</span>
        <p className="text-neutral-900">
          {formatDateShort(reservation.start)} · {formatTime(reservation.start)} — {service?.durationMin ?? reservation.durationMin}{" "}
          min
        </p>
      </div>
      <div>
        <label className={labelClass}>Statut</label>
        <select
          className={`${selectCompactClass} mt-2`}
          value={reservation.status}
          onChange={(e) => onStatusChange(e.target.value as ReservationStatus)}
        >
          <option value="confirmed">Confirmé</option>
          <option value="pending">En attente</option>
          <option value="cancelled">Annulé</option>
        </select>
      </div>
      <div>
        <label className={labelClass}>Notes (interne)</label>
        <textarea
          className={`${textareaClass} mt-2 min-h-[100px] ${userTextBreakClass}`}
          value={notesLocal}
          onChange={(e) => setNotesLocal(e.target.value)}
          onBlur={() => onNotesBlur(notesLocal.trim())}
        />
      </div>
    </div>
  );
}
