"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type DragEvent } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  IconCake,
  IconChevronLeft,
  IconChevronRight,
  IconLoader2,
  IconPlus,
} from "@tabler/icons-react";
import { ui } from "@/lib/design/tokens";
import { EventModal } from "@/components/calendar/EventModal";
import { expandBirthdayOccurrences } from "@/lib/calendar/helpers";
import {
  CALENDAR_CATEGORY_COLORS,
  type Birthday,
  type BirthdayOccurrence,
  type CalendarEvent,
} from "@/lib/calendar/types";

type ViewMode = "month" | "week" | "day";
type ModalState = { event: CalendarEvent | null; date?: Date; hour?: number };

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAY_START_HOUR = 7;
const DAY_END_HOUR = 21;
const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);
const ROW_HEIGHT = 52;
const MAX_VISIBLE_PER_CELL = 3;

function capitalize(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function chipStyle(color: string): CSSProperties {
  return {
    backgroundColor: `${color}18`,
    borderColor: `${color}40`,
    color,
  };
}

function isDayInEventRange(day: Date, event: CalendarEvent): boolean {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  const evStart = new Date(event.start_at);
  const evEnd = new Date(event.end_at);
  return evStart <= dayEnd && evEnd >= dayStart;
}

function getRange(view: ViewMode, anchor: Date): { start: Date; end: Date } {
  if (view === "month") {
    return {
      start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }),
    };
  }
  if (view === "week") {
    return {
      start: startOfWeek(anchor, { weekStartsOn: 1 }),
      end: endOfWeek(anchor, { weekStartsOn: 1 }),
    };
  }
  return { start: startOfDay(anchor), end: startOfDay(anchor) };
}

export function CalendarClient({
  scope,
  projectId,
  showBirthdays = true,
  hideTitle = false,
}: {
  scope?: "personal" | "project";
  projectId?: string;
  showBirthdays?: boolean;
  hideTitle?: boolean;
}) {
  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const range = useMemo(() => getRange(view, anchor), [view, anchor]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = range.start.toISOString();
      const to = endOfDay(range.end).toISOString();
      const sp = new URLSearchParams({
        from,
        to,
      });
      if (scope === "personal") sp.set("scope", "personal");
      else if (projectId) sp.set("project", projectId);
      const res = await fetch(`/api/calendar/events?${sp.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors du chargement des événements.");
        return;
      }
      setEvents(data.events ?? []);
    } catch {
      setError("Erreur réseau lors du chargement des événements.");
    } finally {
      setLoading(false);
    }
  }, [range.start, range.end, scope, projectId]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (!showBirthdays) return;
    let active = true;
    fetch("/api/calendar/birthdays")
      .then((r) => r.json())
      .then((d) => {
        if (active && Array.isArray(d.birthdays)) setBirthdays(d.birthdays);
      })
      .catch(() => {
        /* non bloquant */
      });
    return () => {
      active = false;
    };
  }, [showBirthdays]);

  const occurrences = useMemo(
    () =>
      expandBirthdayOccurrences(
        birthdays,
        format(range.start, "yyyy-MM-dd"),
        format(range.end, "yyyy-MM-dd")
      ),
    [birthdays, range.start, range.end]
  );

  const monthDays = useMemo(
    () => eachDayOfInterval({ start: range.start, end: range.end }),
    [range.start, range.end]
  );

  const weekDays = useMemo(() => {
    if (view !== "week") return [];
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [view, anchor]);

  const goPrev = () => {
    setAnchor((d) => {
      if (view === "month") return addMonths(d, -1);
      if (view === "week") return addWeeks(d, -1);
      return addDays(d, -1);
    });
  };
  const goNext = () => {
    setAnchor((d) => {
      if (view === "month") return addMonths(d, 1);
      if (view === "week") return addWeeks(d, 1);
      return addDays(d, 1);
    });
  };
  const goToday = () => setAnchor(new Date());

  const headerLabel = useMemo(() => {
    if (view === "month") return capitalize(format(anchor, "MMMM yyyy", { locale: fr }));
    if (view === "week") {
      const start = startOfWeek(anchor, { weekStartsOn: 1 });
      const end = endOfWeek(anchor, { weekStartsOn: 1 });
      return `${format(start, "d MMM", { locale: fr })} – ${format(end, "d MMM yyyy", { locale: fr })}`;
    }
    return capitalize(format(anchor, "EEEE d MMMM yyyy", { locale: fr }));
  }, [view, anchor]);

  const openCreate = (date: Date, hour?: number) => setModalState({ event: null, date, hour });
  const openEdit = (event: CalendarEvent) => setModalState({ event });
  const closeModal = () => setModalState(null);

  const handleSaved = () => {
    closeModal();
    void loadEvents();
  };
  const handleDeleted = () => {
    closeModal();
    void loadEvents();
  };

  const handleDropEvent = useCallback(
    async (day: Date, eventId: string) => {
      setDraggingId(null);
      const ev = events.find((e) => e.id === eventId);
      if (!ev) return;
      const originalDay = startOfDay(new Date(ev.start_at));
      const delta = differenceInCalendarDays(startOfDay(day), originalDay);
      if (delta === 0) return;
      const newStart = addDays(new Date(ev.start_at), delta).toISOString();
      const newEnd = addDays(new Date(ev.end_at), delta).toISOString();
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId ? { ...e, start_at: newStart, end_at: newEnd } : e))
      );
      try {
        const res = await fetch(`/api/calendar/events/${eventId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ start_at: newStart, end_at: newEnd }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        setEvents((prev) => prev.map((e) => (e.id === eventId ? data.event : e)));
      } catch {
        void loadEvents();
      }
    },
    [events, loadEvents]
  );

  return (
    <div className="crm-animate-in space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {hideTitle ? (
          <p className="text-sm text-[#8b869c]">
            {headerLabel}
            {loading ? <IconLoader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-[#6a6578]" /> : null}
          </p>
        ) : (
          <div>
            <h1 className={ui.h1}>Calendrier</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-[#8b869c]">
              {headerLabel}
              {loading ? <IconLoader2 className="h-3.5 w-3.5 animate-spin text-[#6a6578]" /> : null}
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {showBirthdays ? (
            <Link href="/personal/calendar/birthdays" className={ui.btnSecondary}>
              <IconCake className="h-4 w-4" stroke={1.75} />
              Anniversaires
            </Link>
          ) : null}
          <button type="button" className={ui.btnPrimary} onClick={() => openCreate(anchor)}>
            <IconPlus className="h-4 w-4" stroke={2} />
            Nouvel événement
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-[12px] border border-white/[0.08] bg-[#14121c] p-1">
          {(["month", "week", "day"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-[10px] px-3 py-1.5 text-sm font-medium transition ${
                view === v ? "bg-violet-500/15 text-violet-200" : "text-[#8b869c] hover:bg-white/[0.04] hover:text-[#f3f0fa]"
              }`}
            >
              {v === "month" ? "Mois" : v === "week" ? "Semaine" : "Jour"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button type="button" className={ui.btnGhost} onClick={goPrev} aria-label="Précédent">
            <IconChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" className={ui.btnSecondary} onClick={goToday}>
            Aujourd&apos;hui
          </button>
          <button type="button" className={ui.btnGhost} onClick={goNext} aria-label="Suivant">
            <IconChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error ? (
        <p className={ui.alertError}>{error}</p>
      ) : null}

      <div className={`flex flex-col gap-4 lg:flex-row ${loading ? "opacity-60" : ""}`}>
        <div className="min-w-0 flex-1">
        {view === "month" ? (
          <MonthGrid
            days={monthDays}
            anchor={anchor}
            events={events}
            occurrences={occurrences}
            onDayClick={(day) => openCreate(day)}
            onEventClick={openEdit}
            onExpandDay={(day) => {
              setAnchor(day);
              setView("day");
            }}
            onDropEvent={handleDropEvent}
            draggingId={draggingId}
            setDraggingId={setDraggingId}
          />
        ) : null}

        {view === "week" ? (
          <>
            <div className="hidden md:block">
              <TimeGrid
                days={weekDays}
                events={events}
                occurrences={occurrences}
                onSlotClick={openCreate}
                onEventClick={openEdit}
              />
            </div>
            <div className="md:hidden">
              <AgendaList
                days={weekDays}
                events={events}
                occurrences={occurrences}
                onDayClick={(day) => {
                  setAnchor(day);
                  setView("day");
                }}
                onEventClick={openEdit}
                onAddClick={(day) => openCreate(day)}
              />
            </div>
          </>
        ) : null}

        {view === "day" ? (
          <TimeGrid
            days={[anchor]}
            events={events}
            occurrences={occurrences}
            onSlotClick={openCreate}
            onEventClick={openEdit}
          />
        ) : null}
        </div>
        <TodaySidebar
          events={events}
          occurrences={occurrences}
          onEventClick={openEdit}
        />
      </div>

      {modalState ? (
        <EventModal
          open
          event={modalState.event}
          defaultDate={modalState.date}
          defaultStartHour={modalState.hour}
          scope={scope}
          projectId={projectId}
          onClose={closeModal}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      ) : null}
    </div>
  );
}

function TodaySidebar({
  events,
  occurrences,
  onEventClick,
}: {
  events: CalendarEvent[];
  occurrences: BirthdayOccurrence[];
  onEventClick: (event: CalendarEvent) => void;
}) {
  const todayEvents = events
    .filter((e) => isToday(new Date(e.start_at)) || (e.all_day && isDayInEventRange(new Date(), e)))
    .sort((a, b) => a.start_at.localeCompare(b.start_at));
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayBirthdays = occurrences.filter((o) => o.date === todayStr);

  return (
    <aside className={`${ui.widget} w-full shrink-0 lg:w-[280px]`}>
      <div className="px-4 pt-4">
        <h2 className="text-sm font-semibold text-[#f3f0fa]">Aujourd&apos;hui</h2>
        <p className="mt-0.5 text-xs capitalize text-[#6a6578]">
          {format(new Date(), "EEEE d MMMM", { locale: fr })}
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        {todayBirthdays.map((o) => (
          <BirthdayChip key={`${o.birthdayId}-${o.date}`} occurrence={o} />
        ))}
        {todayEvents.map((e) => (
          <EventChip key={e.id} event={e} onClick={() => onEventClick(e)} />
        ))}
        {todayEvents.length === 0 && todayBirthdays.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-[#6a6578]">Rien de prévu.</p>
        ) : null}
      </div>
    </aside>
  );
}

function BirthdayChip({ occurrence }: { occurrence: BirthdayOccurrence }) {
  return (
    <Link
      href="/personal/calendar/birthdays"
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-1 truncate rounded-md border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-medium text-rose-300 transition hover:bg-rose-500/20"
      title={occurrence.person_name}
    >
      <IconCake className="h-3 w-3 shrink-0" stroke={1.75} />
      <span className="truncate">
        {occurrence.person_name}
        {occurrence.age != null ? ` · ${occurrence.age} ans` : ""}
      </span>
    </Link>
  );
}

function EventChip({
  event,
  onClick,
  draggable,
  onDragStart,
  onDragEnd,
  className,
}: {
  event: CalendarEvent;
  onClick: () => void;
  draggable?: boolean;
  onDragStart?: (e: DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: () => void;
  className?: string;
}) {
  const color = event.color || CALENDAR_CATEGORY_COLORS[event.category];
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex w-full items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-left text-[11px] font-medium transition hover:brightness-95 ${className ?? ""}`}
      style={chipStyle(color)}
      title={event.title}
    >
      {!event.all_day ? (
        <span className="shrink-0 tabular-nums opacity-70">
          {format(new Date(event.start_at), "HH:mm")}
        </span>
      ) : null}
      <span className="truncate">{event.title}</span>
    </button>
  );
}

function MonthGrid({
  days,
  anchor,
  events,
  occurrences,
  onDayClick,
  onEventClick,
  onExpandDay,
  onDropEvent,
  draggingId,
  setDraggingId,
}: {
  days: Date[];
  anchor: Date;
  events: CalendarEvent[];
  occurrences: BirthdayOccurrence[];
  onDayClick: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onExpandDay: (day: Date) => void;
  onDropEvent: (day: Date, eventId: string) => void;
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#14121c]">
      <div className="grid grid-cols-7 border-b border-white/[0.06] bg-[#12101a]">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-[#8b869c]">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dStr = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, anchor);
          const dayEvents = events
            .filter((e) => isDayInEventRange(day, e))
            .sort((a, b) => a.start_at.localeCompare(b.start_at));
          const dayBirthdays = occurrences.filter((o) => o.date === dStr);
          const totalItems = dayBirthdays.length + dayEvents.length;
          const visibleBirthdays = dayBirthdays.slice(0, MAX_VISIBLE_PER_CELL);
          const remainingSlots = Math.max(0, MAX_VISIBLE_PER_CELL - visibleBirthdays.length);
          const visibleEvents = dayEvents.slice(0, remainingSlots);
          const hiddenCount = totalItems - visibleBirthdays.length - visibleEvents.length;

          return (
            <div
              key={dStr}
              role="button"
              tabIndex={0}
              onClick={() => onDayClick(day)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onDayClick(day);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                if (id) onDropEvent(day, id);
              }}
              className={`flex min-h-[92px] cursor-pointer flex-col gap-1 border-b border-r border-white/[0.04] p-1.5 transition hover:bg-white/[0.03] [&:nth-of-type(7n)]:border-r-0 sm:min-h-[120px] ${
                inMonth ? "bg-transparent" : "bg-white/[0.015]"
              }`}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isToday(day) ? "bg-violet-500 text-white" : inMonth ? "text-[#c8c3d6]" : "text-[#4a4658]"
                }`}
              >
                {format(day, "d")}
              </span>
              <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                {visibleBirthdays.map((o) => (
                  <BirthdayChip key={`${o.birthdayId}-${o.date}`} occurrence={o} />
                ))}
                {visibleEvents.map((e) => (
                  <EventChip
                    key={e.id}
                    event={e}
                    draggable
                    className={draggingId === e.id ? "opacity-40" : ""}
                    onDragStart={(dragEvt) => {
                      dragEvt.dataTransfer.setData("text/plain", e.id);
                      setDraggingId(e.id);
                    }}
                    onDragEnd={() => setDraggingId(null)}
                    onClick={() => onEventClick(e)}
                  />
                ))}
                {hiddenCount > 0 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExpandDay(day);
                    }}
                    className="text-left text-[11px] font-medium text-[#6a6578] hover:text-violet-300"
                  >
                    +{hiddenCount} de plus
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeGrid({
  days,
  events,
  occurrences,
  onSlotClick,
  onEventClick,
}: {
  days: Date[];
  events: CalendarEvent[];
  occurrences: BirthdayOccurrence[];
  onSlotClick: (day: Date, hour: number) => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const gridCols = `56px repeat(${days.length}, 1fr)`;

  return (
    <div className="overflow-hidden rounded-[14px] border border-white/[0.07] bg-[#14121c]">
      <div className="grid border-b border-white/[0.06]" style={{ gridTemplateColumns: gridCols }}>
        <div />
        {days.map((d) => (
          <div key={d.toISOString()} className="border-l border-white/[0.04] px-2 py-2 text-center">
            <div className="text-[11px] font-medium uppercase text-[#6a6578]">
              {format(d, "EEE", { locale: fr })}
            </div>
            <div
              className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                isToday(d) ? "bg-violet-500 text-white" : "text-[#f3f0fa]"
              }`}
            >
              {format(d, "d")}
            </div>
          </div>
        ))}
      </div>

      <div className="grid border-b border-white/[0.06] bg-[#12101a]" style={{ gridTemplateColumns: gridCols }}>
        <div className="px-2 py-1.5 text-[10px] text-[#6a6578]">Journée</div>
        {days.map((d) => {
          const dStr = format(d, "yyyy-MM-dd");
          const allDayEvents = events.filter((e) => e.all_day && isDayInEventRange(d, e));
          const dayBirthdays = occurrences.filter((o) => o.date === dStr);
          return (
            <div key={d.toISOString()} className="flex flex-col gap-1 border-l border-white/[0.04] p-1">
              {dayBirthdays.map((o) => (
                <BirthdayChip key={`${o.birthdayId}-${o.date}`} occurrence={o} />
              ))}
              {allDayEvents.map((e) => (
                <EventChip key={e.id} event={e} onClick={() => onEventClick(e)} />
              ))}
            </div>
          );
        })}
      </div>

      <div className="relative max-h-[560px] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: gridCols }}>
          <div>
            {HOURS.map((h) => (
              <div
                key={h}
                style={{ height: ROW_HEIGHT }}
                className="relative -top-2.5 pr-2 text-right text-[11px] text-[#6a6578]"
              >
                {h}h
              </div>
            ))}
          </div>
          {days.map((d) => {
            const timedEvents = events.filter((e) => !e.all_day && isSameDay(new Date(e.start_at), d));
            return (
              <div key={d.toISOString()} className="relative border-l border-white/[0.04]">
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{ height: ROW_HEIGHT }}
                    className="cursor-pointer border-b border-white/[0.04] transition hover:bg-violet-500/10"
                    onClick={() => onSlotClick(d, h)}
                  />
                ))}
                {timedEvents.map((e) => {
                  const start = new Date(e.start_at);
                  const end = new Date(e.end_at);
                  const startFrac = start.getHours() + start.getMinutes() / 60;
                  const endFrac = Math.max(startFrac + 0.25, end.getHours() + end.getMinutes() / 60);
                  const top = Math.max(0, (startFrac - DAY_START_HOUR) * ROW_HEIGHT);
                  const height = Math.max(22, (endFrac - startFrac) * ROW_HEIGHT);
                  const color = e.color || CALENDAR_CATEGORY_COLORS[e.category];
                  return (
                    <button
                      type="button"
                      key={e.id}
                      className="absolute left-1 right-1 overflow-hidden rounded-lg border px-1.5 py-1 text-left text-[11px] font-medium shadow-sm transition hover:brightness-95"
                      style={{ top, height, ...chipStyle(color) }}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        onEventClick(e);
                      }}
                      title={e.title}
                    >
                      <div className="truncate">{e.title}</div>
                      <div className="truncate text-[10px] opacity-70">
                        {format(start, "HH:mm")}–{format(end, "HH:mm")}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AgendaList({
  days,
  events,
  occurrences,
  onDayClick,
  onEventClick,
  onAddClick,
}: {
  days: Date[];
  events: CalendarEvent[];
  occurrences: BirthdayOccurrence[];
  onDayClick: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onAddClick: (day: Date) => void;
}) {
  return (
    <div className="space-y-2">
      {days.map((d) => {
        const dStr = format(d, "yyyy-MM-dd");
        const dayEvents = events
          .filter((e) => isDayInEventRange(d, e))
          .sort((a, b) => a.start_at.localeCompare(b.start_at));
        const dayBirthdays = occurrences.filter((o) => o.date === dStr);
        const hasItems = dayEvents.length > 0 || dayBirthdays.length > 0;
        return (
          <div key={dStr} className={`${ui.card} p-3`}>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => onDayClick(d)}
                className={`text-sm font-semibold capitalize ${isToday(d) ? "text-violet-300" : "text-[#f3f0fa]"}`}
              >
                {format(d, "EEEE d MMMM", { locale: fr })}
              </button>
              <button
                type="button"
                onClick={() => onAddClick(d)}
                className="rounded-lg p-1 text-[#6a6578] hover:bg-white/[0.06] hover:text-violet-300"
                aria-label="Ajouter un événement"
              >
                <IconPlus className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 space-y-1.5">
              {!hasItems ? <p className="text-xs text-[#6a6578]">Aucun événement</p> : null}
              {dayBirthdays.map((o) => (
                <BirthdayChip key={`${o.birthdayId}-${o.date}`} occurrence={o} />
              ))}
              {dayEvents.map((e) => (
                <EventChip key={e.id} event={e} onClick={() => onEventClick(e)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
