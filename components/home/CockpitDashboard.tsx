import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  IconArrowRight,
  IconBook2,
  IconBriefcase,
  IconCalendarEvent,
  IconChecklist,
  IconFlame,
} from "@tabler/icons-react";
import { StatusBadge } from "@/components/crm/StatusBadge";
import { TodayTaskList } from "@/components/crm/TodayTaskList";
import { ui } from "@/lib/design/tokens";
import { prospectAvatarTone } from "@/lib/crm/pipeline";
import type { CockpitData } from "@/lib/home/cockpit";
import type { CalendarEvent } from "@/lib/calendar/types";
import type { Prospect } from "@/lib/crm/types";

function fmtFollowUp(value: string | null) {
  if (!value) return null;
  try {
    return format(new Date(`${value.slice(0, 10)}T12:00:00`), "d MMM", { locale: fr });
  } catch {
    return value;
  }
}

function eventTime(event: CalendarEvent) {
  if (event.all_day) return "Journée";
  try {
    return format(new Date(event.start_at), "HH:mm");
  } catch {
    return "—";
  }
}

export function CockpitDashboard({
  firstName,
  dateLabel,
  data,
}: {
  firstName: string;
  dateLabel: string;
  data: CockpitData;
}) {
  const stats = [
    {
      label: "Prospects à rappeler",
      value: data.followUpsDue,
      icon: IconBriefcase,
    },
    {
      label: "RDV aujourd'hui",
      value: data.meetingsToday,
      icon: IconCalendarEvent,
    },
    {
      label: "Mots à réviser",
      value: data.wordsDue,
      icon: IconBook2,
    },
    {
      label: "Tâches restantes",
      value: data.tasksLeft,
      icon: IconChecklist,
    },
  ];

  return (
    <div className="space-y-7">
      <div className="crm-animate-in">
        <p className="text-xs font-medium capitalize tracking-wide text-wo-dim">{dateLabel}</p>
        <h1 className={`${ui.h1} mt-1`}>Bonjour {firstName}</h1>
        <p className="mt-1.5 text-sm text-wo-muted">Voici ce qui t&apos;attend aujourd&apos;hui.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 crm-animate-in-delay-1">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={ui.statCard}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-wo-muted">
                  {s.label}
                </p>
                <Icon className="h-3.5 w-3.5 text-wo-accent" stroke={1.6} />
              </div>
              <p className="mt-2 text-[1.75rem] font-semibold tracking-tight text-wo-text tabular-nums">
                {s.value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2 crm-animate-in-delay-2">
        <ProspectsWidget prospects={data.prospects} />
        <CalendarWidget events={data.events} />
        <EnglishWidget english={data.english} />
        <TasksWidget tasks={data.tasks} />
        <FinanceWidget monthSpend={data.monthSpend} monthlySubs={data.monthlySubs} />
        <ActivityWidget events={data.recentEvents} />
      </div>
    </div>
  );
}

function WidgetHeader({
  title,
  href,
  cta,
}: {
  title: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
      <h2 className="text-sm font-semibold text-wo-text">{title}</h2>
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-xs font-medium text-wo-muted transition hover:text-wo-accent"
      >
        {cta}
        <IconArrowRight className="h-3.5 w-3.5" stroke={1.75} />
      </Link>
    </div>
  );
}

function ProspectsWidget({ prospects }: { prospects: Prospect[] }) {
  return (
    <section className={ui.widget}>
      <WidgetHeader title="Prospection — À rappeler" href="/crm" cta="Voir la prospection" />
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        {prospects.length === 0 ? (
          <p className="px-1 py-8 text-center text-sm text-wo-dim">Aucune relance en attente.</p>
        ) : (
          prospects.map((p) => (
            <Link
              key={p.id}
              href={`/crm/prospects/${p.id}`}
              className="flex items-center gap-3 rounded-[12px] px-2.5 py-2 transition hover:bg-wo-hover"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${prospectAvatarTone(p.club_name)}`}
              >
                {p.club_name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-wo-text">{p.club_name}</p>
                <p className="truncate text-xs text-wo-dim">
                  {[p.ville, p.sport].filter(Boolean).join(" · ") || p.status}
                  {p.next_follow_up ? ` · ${fmtFollowUp(p.next_follow_up)}` : ""}
                </p>
              </div>
              <StatusBadge status={p.status} />
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

function CalendarWidget({ events }: { events: CalendarEvent[] }) {
  return (
    <section className={ui.widget}>
      <WidgetHeader title="Calendrier — Aujourd'hui" href="/calendar" cta="Voir le calendrier" />
      <div className="flex flex-1 flex-col gap-0 p-4 sm:px-5 sm:pb-5">
        {events.length === 0 ? (
          <p className="py-8 text-center text-sm text-wo-dim">Aucun événement aujourd&apos;hui.</p>
        ) : (
          <ol className="relative space-y-0 border-l border-wo-border pl-4">
            {events.map((event) => (
              <li key={event.id} className="relative pb-3 last:pb-0">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-indigo-500" />
                <p className="text-[11px] font-medium tabular-nums text-wo-accent">{eventTime(event)}</p>
                <p className="text-sm font-medium text-wo-text">{event.title}</p>
                {event.location ? (
                  <p className="text-xs text-wo-dim">{event.location}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function EnglishWidget({
  english,
}: {
  english: CockpitData["english"];
}) {
  return (
    <section className={ui.widget}>
      <WidgetHeader title="English" href="/english" cta="Continuer" />
      <div className="flex flex-1 flex-col justify-between gap-5 p-4 sm:p-5">
        <div className="space-y-3">
          <p className="text-2xl font-semibold tracking-tight text-wo-text">
            {english.dueToday}{" "}
            <span className="text-sm font-medium text-wo-muted">
              carte{english.dueToday > 1 ? "s" : ""} à réviser
            </span>
          </p>
          <p className="flex items-center gap-1.5 text-sm text-wo-secondary">
            <IconFlame className="h-4 w-4 text-orange-400" stroke={1.75} />
            Série : {english.streak} jour{english.streak > 1 ? "s" : ""}
          </p>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-wo-muted">
              <span>Progression du jour</span>
              <span className="tabular-nums">{english.progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-wo-hover">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${english.progress}%` }}
              />
            </div>
          </div>
        </div>
        <Link href="/english/review" className={`${ui.btnPrimary} self-start`}>
          Continuer
        </Link>
      </div>
    </section>
  );
}

function TasksWidget({ tasks }: { tasks: CockpitData["tasks"] }) {
  return (
    <section className={ui.widget}>
      <WidgetHeader title="Tâches" href="/tasks" cta="Voir les tâches" />
      <div className="p-4 sm:px-5 sm:pb-5">
        <TodayTaskList
          tasks={tasks}
          emptyLabel="Aucune tâche importante aujourd'hui."
        />
      </div>
    </section>
  );
}

function chf(n: number) {
  return new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF" }).format(n);
}

function FinanceWidget({ monthSpend, monthlySubs }: { monthSpend: number; monthlySubs: number }) {
  return (
    <section className={ui.widget}>
      <WidgetHeader title="Finances" href="/finances" cta="Ouvrir" />
      <div className="grid grid-cols-2 gap-3 p-4 sm:p-5">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-wo-muted">Dépenses du mois</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-wo-text">{chf(monthSpend)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-wo-muted">Abonnements / mois</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-wo-text">{chf(monthlySubs)}</p>
        </div>
      </div>
    </section>
  );
}

function ActivityWidget({ events }: { events: CockpitData["recentEvents"] }) {
  return (
    <section className={ui.widget}>
      <WidgetHeader title="Activité récente" href="/notifications" cta="Alertes" />
      <div className="p-4 sm:p-5">
        {events.length === 0 ? (
          <p className="py-6 text-center text-sm text-wo-dim">Pas encore d&apos;activité enregistrée.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="text-sm">
                <p className="text-wo-text">{e.title}</p>
                <p className="text-[11px] text-wo-dim">
                  {format(new Date(e.created_at), "d MMM HH:mm", { locale: fr })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
