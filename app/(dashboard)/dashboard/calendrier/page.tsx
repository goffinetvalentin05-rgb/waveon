"use client";

import "react-big-calendar/lib/css/react-big-calendar.css";

import { useCallback, useMemo, useState } from "react";
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
import type {
  BlockedSlot,
  Client,
  Employee,
  Reservation,
  ReservationStatus,
  WavonState,
} from "@/lib/wavon/types";
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
import { canUsePremiumFeatures, canUseProInvoices } from "@/lib/wavon/premium-access";
import Link from "next/link";

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
  resource:
    | { kind: "reservation"; reservation: Reservation }
    | { kind: "blocked_slot"; blockedSlot: BlockedSlot };
};

function WavonCalendarEventContent({
  event,
  employees,
}: {
  event: CalEvent;
  employees: Employee[] | undefined;
}) {
  const resource = event.resource;
  if (resource.kind === "blocked_slot") {
    const b = resource.blockedSlot;
    const base = b.reason?.trim() ? b.reason.trim() : "Créneau bloqué";
    const empName =
      b.employeeId && employees
        ? (employees.find((e) => e.id === b.employeeId)?.name ?? null)
        : null;
    return (
      <div className="leading-tight text-[#374151]">
        <div className="truncate text-[11px] font-medium">{base}</div>
        {empName ? <div className="truncate text-[10px] text-neutral-600">{empName}</div> : null}
      </div>
    );
  }
  return <span className="line-clamp-2 text-[11px]">{event.title}</span>;
}

export default function CalendrierPage() {
  const {
    ready,
    state,
    addReservation,
    updateReservation,
    deleteReservation,
    addBlockedSlot,
    updateBlockedSlot,
    deleteBlockedSlot,
  } = useWavon();
  const toast = useToast();
  const premium = canUsePremiumFeatures(state.workspaceAccess);
  const canInvoices = canUseProInvoices(state);
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(() => new Date());

  const [filterServiceId, setFilterServiceId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterClientQuery, setFilterClientQuery] = useState("");
  const [clientMenuOpen, setClientMenuOpen] = useState(false);
  const [filterClientId, setFilterClientId] = useState<string>("");
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRes, setDetailRes] = useState<Reservation | null>(null);

  const [blockedModalOpen, setBlockedModalOpen] = useState(false);
  const [blockedModalMode, setBlockedModalMode] = useState<"create" | "edit">("create");
  const [editingBlocked, setEditingBlocked] = useState<BlockedSlot | null>(null);
  const [blockedStartDate, setBlockedStartDate] = useState(toYmd(new Date()));
  const [blockedStartTime, setBlockedStartTime] = useState("12:00");
  const [blockedEndDate, setBlockedEndDate] = useState(toYmd(new Date()));
  const [blockedEndTime, setBlockedEndTime] = useState("13:00");
  const [blockedReason, setBlockedReason] = useState("");
  const [blockedEmployeeId, setBlockedEmployeeId] = useState<string>(""); // "" = tous

  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [serviceId, setServiceId] = useState("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [dateYmd, setDateYmd] = useState(toYmd(new Date()));
  const [time, setTime] = useState("10:00");
  const [notes, setNotes] = useState("");

  const employees = state.employees ?? [];
  const activeEmployees = employees.filter((e) => e.isActive);
  const showEmployeeFilter = activeEmployees.length > 1;

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
    const resEvents: CalEvent[] = state.reservations
      .filter((r) => {
        if (filterServiceId && r.serviceId !== filterServiceId) return false;
        if (filterStatus && r.status !== filterStatus) return false;
        if (filterClientId && r.clientId !== filterClientId) return false;
        if (filterEmployeeId && (r.employeeId ?? "") !== filterEmployeeId) return false;
        return true;
      })
      .map((r) => {
        const svc = state.services.find((s) => s.id === r.serviceId);
        return {
          id: r.id,
          title: `${r.clientName} — ${svc?.name ?? "Service"}`,
          start: new Date(r.start),
          end: new Date(r.end),
          resource: { kind: "reservation" as const, reservation: r },
        };
      });

    const blocked = (state.blockedSlots ?? [])
      .filter((b) => {
        if (!filterEmployeeId) return true;
        return b.employeeId === null || b.employeeId === filterEmployeeId;
      })
      .map((b) => {
        const base = b.reason?.trim() ? b.reason.trim() : "Créneau bloqué";
        const title = base;
        return {
          id: `blocked:${b.id}`,
          title,
          start: new Date(b.start),
          end: new Date(b.end),
          resource: { kind: "blocked_slot" as const, blockedSlot: b },
        };
      });

    return [...resEvents, ...blocked];
  }, [
    state.reservations,
    state.services,
    state.blockedSlots,
    filterServiceId,
    filterStatus,
    filterClientId,
    filterEmployeeId,
  ]);

  const slots = useMemo(() => {
    const svc = state.services.find((s) => s.id === serviceId);
    if (!svc || !dateYmd) return [];
    return getAvailableSlots(dateYmd, svc, state, employeeId || null);
  }, [state, serviceId, dateYmd, employeeId]);

  const openCreate = () => {
    if (!premium) {
      toast.push({
        kind: "error",
        message: "Choisissez une offre pour créer des réservations.",
      });
      return;
    }
    setModalMode("create");
    setEditing(null);
    setClientName("");
    setClientId("");
    setServiceId(state.services[0]?.id ?? "");
    setEmployeeId(activeEmployees[0]?.id ?? "");
    setDateYmd(toYmd(date));
    setTime("10:00");
    setNotes("");
    setModalOpen(true);
  };

  const openEdit = (r: Reservation) => {
    if (!premium) {
      toast.push({ kind: "error", message: "Cette fonctionnalité nécessite un abonnement actif." });
      return;
    }
    setModalMode("edit");
    setEditing(r);
    setClientName(r.clientName);
    setClientId(r.clientId ?? "");
    setServiceId(r.serviceId);
    setEmployeeId(r.employeeId ?? "");
    setDateYmd(toYmd(new Date(r.start)));
    const d = new Date(r.start);
    setTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    setNotes(r.notes ?? "");
    setModalOpen(true);
  };

  const timeOptions15 = useMemo(() => {
    const out: string[] = [];
    for (let m = 0; m < 24 * 60; m += 15) {
      const h = Math.floor(m / 60);
      const mm = m % 60;
      out.push(`${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
    }
    return out;
  }, []);

  const openBlockedCreate = useCallback(
    (prefill?: { start: Date; end: Date }) => {
      if (!premium) {
        toast.push({ kind: "error", message: "Cette fonctionnalité nécessite un abonnement actif." });
        return;
      }
      setBlockedModalMode("create");
      setEditingBlocked(null);
      const s = prefill?.start ?? new Date();
      const e = prefill?.end ?? new Date(s.getTime() + 60 * 60_000);
      setBlockedStartDate(toYmd(s));
      setBlockedEndDate(toYmd(e));
      setBlockedStartTime(`${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`);
      setBlockedEndTime(`${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`);
      setBlockedReason("");
      setBlockedEmployeeId("");
      setBlockedModalOpen(true);
    },
    [premium, toast]
  );

  const openBlockedEdit = useCallback(
    (b: BlockedSlot) => {
      if (!premium) {
        toast.push({ kind: "error", message: "Cette fonctionnalité nécessite un abonnement actif." });
        return;
      }
      setBlockedModalMode("edit");
      setEditingBlocked(b);
      const s = new Date(b.start);
      const e = new Date(b.end);
      setBlockedStartDate(toYmd(s));
      setBlockedEndDate(toYmd(e));
      setBlockedStartTime(`${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`);
      setBlockedEndTime(`${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`);
      setBlockedReason(b.reason ?? "");
      setBlockedEmployeeId(b.employeeId ?? "");
      setBlockedModalOpen(true);
    },
    [premium, toast]
  );

  const submitForm = () => {
    if (!premium) {
      toast.push({ kind: "error", message: "Cette fonctionnalité nécessite un abonnement actif." });
      return;
    }
    const svc = state.services.find((s) => s.id === serviceId);
    if (!svc) {
      toast.push({ kind: "error", message: "Choisis un service." });
      return;
    }
    const selectedEmployeeId = employeeId || null;
    const start = combineYmdTime(dateYmd, time);
    if (modalMode === "create") {
      const res = addReservation({
        clientId: clientId || null,
        clientName: clientName || "Client",
        serviceId,
        employeeId: selectedEmployeeId,
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
        employeeId: selectedEmployeeId,
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
      if (ev.resource.kind === "reservation") {
        openDetail(ev.resource.reservation);
        return;
      }
      if (!premium) {
        toast.push({ kind: "error", message: "Cette fonctionnalité nécessite un abonnement actif." });
        return;
      }
      openBlockedEdit(ev.resource.blockedSlot);
    },
    [openDetail, openBlockedEdit, premium, toast]
  );

  const eventPropGetter = useCallback((event: CalEvent) => {
    const resource = event.resource;
    if (resource.kind === "blocked_slot") {
      const stripeBg =
        "repeating-linear-gradient(135deg, rgba(0,0,0,0.055) 0 8px, rgba(0,0,0,0.02) 8px 16px)";
      return {
        style: {
          backgroundImage: stripeBg,
          backgroundColor: "#f3f4f6",
          border: "1px solid #e5e7eb",
          borderLeft: "6px solid #9ca3af",
          color: "#374151",
        },
      };
    }

    const st = resource.reservation.status;
    const empColor =
      (state.employees ?? []).find((e) => e.id === (resource.reservation.employeeId ?? ""))?.color ?? null;
    const pale =
      empColor && /^#[0-9a-fA-F]{6}$/.test(empColor)
        ? `${empColor}1A` // ~10% alpha
        : null;
    if (st === "confirmed") {
      return {
        style: {
          backgroundColor: pale ?? "#dcfce7",
          borderColor: empColor ?? "#86efac",
          color: "#14532d",
          borderWidth: empColor ? 0 : 1,
          borderStyle: "solid",
          borderLeft: empColor ? `6px solid ${empColor}` : undefined,
        },
      };
    }
    if (st === "pending") {
      return {
        style: {
          backgroundColor: pale ?? "#fef9c3",
          borderColor: empColor ?? "#fde047",
          color: "#713f12",
          borderWidth: empColor ? 0 : 1,
          borderStyle: "solid",
          borderLeft: empColor ? `6px solid ${empColor}` : undefined,
        },
      };
    }
    return {
      style: {
        backgroundColor: pale ?? "#e5e7eb",
        borderColor: empColor ?? "#9ca3af",
        color: "#374151",
        borderWidth: empColor ? 0 : 1,
        borderStyle: "solid",
        borderLeft: empColor ? `6px solid ${empColor}` : undefined,
        textDecoration: "line-through",
      },
    };
  }, [state.employees]);

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
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openBlockedCreate()}
              className={`${btnGhostClass} ${!premium ? "opacity-50" : ""}`}
              disabled={!premium}
            >
              Bloquer un créneau
            </button>
            <button
              type="button"
              onClick={() => openCreate()}
              className={`${btnPrimaryClass} ${!premium ? "opacity-50" : ""}`}
              disabled={!premium}
            >
              Nouvelle réservation
            </button>
          </div>
        }
      />

      {!premium ? (
        <p className="text-sm text-neutral-600">
          Mode découverte : consultation de l’agenda.{" "}
          <Link href="/dashboard/facturation#waevon-pricing" className={`${linkClass} font-medium`}>
            Voir les offres
          </Link>
        </p>
      ) : null}

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
          {showEmployeeFilter ? (
            <div>
              <label className={labelClass}>Prestataire</label>
              <select
                className={`${inputClass} mt-2`}
                value={filterEmployeeId}
                onChange={(e) => setFilterEmployeeId(e.target.value)}
              >
                <option value="">Tous les prestataires</option>
                {activeEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
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
          <div className="relative md:col-span-1">
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
          <Calendar<CalEvent>
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
            components={{
              event: ({ event }) => (
                <WavonCalendarEventContent event={event} employees={state.employees} />
              ),
            }}
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
            <button
              type="button"
              className={btnPrimaryClass}
              onClick={submitForm}
              disabled={!premium}
            >
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
          employeeId={employeeId}
          setEmployeeId={setEmployeeId}
          dateYmd={dateYmd}
          setDateYmd={setDateYmd}
          time={time}
          setTime={setTime}
          slots={slots}
          notes={notes}
          setNotes={setNotes}
        />
      </Modal>

      <BlockedSlotModal
        open={blockedModalOpen}
        mode={blockedModalMode}
        state={state}
        activeEmployees={activeEmployees}
        timeOptions={timeOptions15}
        startDate={blockedStartDate}
        startTime={blockedStartTime}
        endDate={blockedEndDate}
        endTime={blockedEndTime}
        reason={blockedReason}
        employeeId={blockedEmployeeId}
        onChangeStartDate={setBlockedStartDate}
        onChangeStartTime={setBlockedStartTime}
        onChangeEndDate={setBlockedEndDate}
        onChangeEndTime={setBlockedEndTime}
        onChangeReason={setBlockedReason}
        onChangeEmployeeId={setBlockedEmployeeId}
        onClose={() => setBlockedModalOpen(false)}
        onSubmit={async () => {
          if (!premium) {
            toast.push({ kind: "error", message: "Cette fonctionnalité nécessite un abonnement actif." });
            return;
          }
          const onlyOne = activeEmployees.length === 1;
          const effectiveEmployeeId = onlyOne ? (activeEmployees[0]?.id ?? null) : (blockedEmployeeId ? blockedEmployeeId : null);
          const start = combineYmdTime(blockedStartDate, blockedStartTime);
          const end = combineYmdTime(blockedEndDate, blockedEndTime);
          if (blockedModalMode === "create") {
            const res = await addBlockedSlot({
              employeeId: effectiveEmployeeId,
              start,
              end,
              reason: blockedReason.trim() ? blockedReason.trim() : null,
            });
            if (!res.ok) {
              toast.push({ kind: "error", message: res.error });
              return;
            }
            toast.push({ message: "Créneau bloqué." });
          } else if (editingBlocked) {
            const res = await updateBlockedSlot(editingBlocked.id, {
              employeeId: effectiveEmployeeId,
              start,
              end,
              reason: blockedReason.trim() ? blockedReason.trim() : null,
            });
            if (!res.ok) {
              toast.push({ kind: "error", message: res.error });
              return;
            }
            toast.push({ message: "Blocage mis à jour." });
          }
          setBlockedModalOpen(false);
        }}
        onDelete={async () => {
          if (!premium) {
            toast.push({ kind: "error", message: "Cette fonctionnalité nécessite un abonnement actif." });
            return;
          }
          if (!editingBlocked) return;
          if (!confirm("Supprimer ce blocage ?")) return;
          const res = await deleteBlockedSlot(editingBlocked.id);
          if (!res.ok) {
            toast.push({ kind: "error", message: res.error });
            return;
          }
          setBlockedModalOpen(false);
          toast.push({ message: "Blocage supprimé." });
        }}
      />

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
                  className={`${btnGhostClass} ${!canInvoices || detailRes.status !== "confirmed" ? "opacity-50" : ""}`}
                  disabled={!canInvoices || detailRes.status !== "confirmed"}
                  onClick={async () => {
                    if (!detailRes) return;
                    if (!canInvoices) {
                      toast.push({
                        kind: "error",
                        message: "La création de factures est disponible avec le plan Pro.",
                      });
                      return;
                    }
                    if (detailRes.status !== "confirmed") {
                      toast.push({
                        kind: "error",
                        message: "Confirme la réservation avant de créer une facture.",
                      });
                      return;
                    }
                    try {
                      const res = await fetch("/api/invoices", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ reservationId: detailRes.id }),
                        credentials: "same-origin",
                      });
                      const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string; code?: string };
                      if (!res.ok) {
                        if (res.status === 403 && body.code === "feature_locked") {
                          toast.push({
                            kind: "error",
                            message: "La création de factures est disponible avec le plan Pro.",
                          });
                          return;
                        }
                        throw new Error(body.error ?? "Création de facture impossible.");
                      }
                      if (!body.id) throw new Error("Facture créée sans identifiant.");
                      setDetailOpen(false);
                      window.location.href = `/dashboard/factures/${body.id}`;
                    } catch (e) {
                      toast.push({ kind: "error", message: e instanceof Error ? e.message : "Erreur." });
                    }
                  }}
                  title={
                    !canInvoices
                      ? "Disponible avec le plan Pro"
                      : detailRes.status !== "confirmed"
                        ? "Réservation à confirmer"
                        : "Créer une facture liée à ce rendez-vous"
                  }
                >
                  Créer une facture
                </button>
                <button
                  type="button"
                  className={btnGhostClass}
                  disabled={!premium}
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
                  className="text-sm font-medium text-red-600/90 underline-offset-4 hover:underline disabled:opacity-45"
                  disabled={!premium}
                  onClick={async () => {
                    if (!premium) return;
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
            key={detailRes.id}
            reservation={detailRes}
            service={state.services.find((s) => s.id === detailRes.serviceId)}
            currency={state.settings.currency}
            client={clientRow}
            onStatusChange={(status) => {
              if (!premium) {
                toast.push({ kind: "error", message: "Cette fonctionnalité nécessite un abonnement actif." });
                return;
              }
              const res = updateReservation(detailRes.id, { status });
              if (!res.ok) {
                toast.push({ kind: "error", message: res.error });
                return;
              }
              setDetailRes({ ...detailRes, status });
              toast.push({ message: "Statut mis à jour." });
            }}
            onNotesBlur={(n) => {
              if (!premium) return;
              updateReservation(detailRes.id, { notes: n });
              setDetailRes({ ...detailRes, notes: n });
            }}
          />
        ) : null}
      </Modal>

    </div>
  );
}

function BlockedSlotModal({
  open,
  mode,
  state,
  activeEmployees,
  timeOptions,
  startDate,
  startTime,
  endDate,
  endTime,
  reason,
  employeeId,
  onChangeStartDate,
  onChangeStartTime,
  onChangeEndDate,
  onChangeEndTime,
  onChangeReason,
  onChangeEmployeeId,
  onClose,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  mode: "create" | "edit";
  state: WavonState;
  activeEmployees: Array<{ id: string; name: string }>;
  timeOptions: string[];
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  reason: string;
  employeeId: string; // "" = tous
  onChangeStartDate: (v: string) => void;
  onChangeStartTime: (v: string) => void;
  onChangeEndDate: (v: string) => void;
  onChangeEndTime: (v: string) => void;
  onChangeReason: (v: string) => void;
  onChangeEmployeeId: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void | Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const start = useMemo(() => combineYmdTime(startDate, startTime), [startDate, startTime]);
  const end = useMemo(() => combineYmdTime(endDate, endTime), [endDate, endTime]);
  const endValid = end > start;
  const remaining = Math.max(0, 80 - (reason?.length ?? 0));
  const onlyOneEmployee = activeEmployees.length === 1;
  const effectiveEmployeeId = onlyOneEmployee ? (activeEmployees[0]?.id ?? "") : employeeId;

  const overlappingReservations = useMemo(() => {
    if (!endValid) return [];
    const list = state.reservations.filter((r) => r.status === "confirmed" || r.status === "pending");
    const targetEmployeeId = onlyOneEmployee ? (activeEmployees[0]?.id ?? null) : (effectiveEmployeeId ? effectiveEmployeeId : null);
    return list
      .filter((r) => {
        if (targetEmployeeId) {
          return (r.employeeId ?? null) === targetEmployeeId;
        }
        return true; // blocage tous prestataires
      })
      .filter((r) => start < new Date(r.end) && end > new Date(r.start))
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 6);
  }, [state.reservations, start, end, endValid, effectiveEmployeeId, onlyOneEmployee, activeEmployees]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Bloquer un créneau" : "Modifier le blocage"}
      footer={
        <>
          {mode === "edit" ? (
            <button
              type="button"
              className="mr-auto text-sm font-medium text-red-600/90 underline-offset-4 hover:underline"
              onClick={() => void onDelete()}
            >
              Supprimer
            </button>
          ) : null}
          <button type="button" className={btnGhostClass} onClick={onClose}>
            Annuler
          </button>
          <button type="button" className={btnPrimaryClass} onClick={onSubmit} disabled={!endValid}>
            {mode === "create" ? "Confirmer le blocage" : "Enregistrer"}
          </button>
        </>
      }
    >
      <div className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Date début</label>
            <input type="date" className={`${inputClass} mt-2`} value={startDate} onChange={(e) => onChangeStartDate(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Heure début</label>
            <select className={`${inputClass} mt-2`} value={startTime} onChange={(e) => onChangeStartTime(e.target.value)}>
              {timeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Date fin</label>
            <input type="date" className={`${inputClass} mt-2`} value={endDate} onChange={(e) => onChangeEndDate(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Heure fin</label>
            <select className={`${inputClass} mt-2`} value={endTime} onChange={(e) => onChangeEndTime(e.target.value)}>
              {timeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!endValid ? (
          <p className="text-sm text-red-700">La fin doit être strictement après le début.</p>
        ) : null}

        {!onlyOneEmployee ? (
          <div>
            <label className={labelClass}>Prestataire concerné</label>
            <select
              className={`${inputClass} mt-2`}
              value={employeeId}
              onChange={(e) => onChangeEmployeeId(e.target.value)}
            >
              <option value="">Tous les prestataires</option>
              {activeEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label className={labelClass}>Raison (optionnel)</label>
          <div className="mt-2">
            <input
              className={`${inputClass} ${userTextBreakClass}`}
              value={reason}
              onChange={(e) => onChangeReason(e.target.value.slice(0, 80))}
              placeholder="ex: Rendez-vous personnel, pause déjeuner, livraison…"
              maxLength={80}
            />
            <div className="mt-2 flex items-start justify-between gap-4 text-xs text-neutral-500">
              <p className="leading-relaxed">Uniquement visible par toi, tes clients ne voient rien.</p>
              <p className="shrink-0 tabular-nums">{remaining}</p>
            </div>
          </div>
        </div>

        {overlappingReservations.length > 0 ? (
          <div className="rounded-2xl border border-amber-200/90 bg-amber-50/70 px-4 py-3 text-sm text-amber-950">
            <p className="font-medium">
              Attention, {overlappingReservations.length} réservation(s) existent déjà sur cette plage :
            </p>
            <ul className="mt-2 list-disc pl-5 text-xs text-amber-900">
              {overlappingReservations.map((r) => {
                const d = new Date(r.start);
                const hh = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                return (
                  <li key={r.id} className={userTextBreakClass}>
                    {r.clientName} · {hh}
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-amber-900">
              Tu peux quand même confirmer : les réservations existantes restent valides.
            </p>
          </div>
        ) : null}
      </div>
    </Modal>
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
  employeeId,
  setEmployeeId,
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
  employeeId: string;
  setEmployeeId: (v: string) => void;
  dateYmd: string;
  setDateYmd: (v: string) => void;
  time: string;
  setTime: (v: string) => void;
  slots: string[];
  notes: string;
  setNotes: (v: string) => void;
}) {
  const employees = state.employees ?? [];
  const activeEmployees = employees.filter((e) => e.isActive);
  const svc = state.services.find((s) => s.id === serviceId) ?? null;
  const eligibleEmployees = useMemo(() => {
    if (!svc) return activeEmployees;
    const ids = svc.employeeIds ?? [];
    if (ids.length === 0) return activeEmployees;
    return activeEmployees.filter((e) => ids.includes(e.id));
  }, [activeEmployees, svc]);

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
          onChange={(e) => {
            const next = e.target.value;
            setServiceId(next);
            // Reset prestataire si plus éligible
            const s = state.services.find((x) => x.id === next) ?? null;
            if (!s) return;
            const ids = s.employeeIds ?? [];
            const current = employeeId || "";
            if (ids.length === 0) return;
            if (!ids.includes(current)) {
              const first = eligibleEmployees[0]?.id ?? "";
              setEmployeeId(first);
            }
          }}
        >
          {state.services.map((s) => (
            <option key={s.id} value={s.id} title={`${s.name} (${s.durationMin} min)`}>
              {s.name} ({s.durationMin} min)
            </option>
          ))}
        </select>
      </div>

      {eligibleEmployees.length > 1 ? (
        <div>
          <label className={labelClass}>Prestataire</label>
          <select
            className={`${inputClass} mt-2`}
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            {eligibleEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
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
