"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { useWavon } from "@/components/wavon/WavonProvider";
import { PageHeader } from "@/components/wavon/ui/PageHeader";
import { StatusBadge } from "@/components/wavon/ui/StatusBadge";
import { activeReservations, fillRateWeekApprox, toYmd } from "@/lib/wavon/booking-logic";
import { formatDateTime } from "@/lib/wavon/format";
import { cardClass, kpiCardClass, linkClass, spinnerClass, userTextBreakClass } from "@/lib/wavon/tokens";
export default function DashboardOverviewPage() {
  const { ready, state } = useWavon();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("welcome") !== "1") return;
    setShowWelcome(true);
    q.delete("welcome");
    const next = `${window.location.pathname}${q.toString() ? `?${q}` : ""}`;
    window.history.replaceState({}, "", next);
  }, []);

  const todayYmd = useMemo(() => toYmd(new Date()), []);

  const stats = useMemo(() => {
    const now = new Date();
    const startWeek = new Date(now);
    startWeek.setHours(0, 0, 0, 0);
    const endWeek = new Date(startWeek);
    endWeek.setDate(endWeek.getDate() + 7);

    const res = activeReservations(state.reservations);
    const todayCount = res.filter((r) => toYmd(new Date(r.start)) === todayYmd).length;
    const weekCount = res.filter((r) => {
      const t = new Date(r.start).getTime();
      return t >= startWeek.getTime() && t < endWeek.getTime();
    }).length;
    const fill = fillRateWeekApprox(state, now);
    return {
      todayCount,
      weekCount,
      fill,
      clients: state.clients.length,
    };
  }, [state, todayYmd]);

  const latest = useMemo(() => {
    const res = [...state.reservations].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return res.slice(0, 5);
  }, [state.reservations]);

  const upcoming = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const t = Date.now();
    return [...state.reservations]
      .filter((r) => r.status !== "cancelled" && new Date(r.start).getTime() >= t)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 5);
  }, [state.reservations]);

  const activity = useMemo(() => {
    return [...state.reservations]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [state.reservations]);

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className={spinnerClass} aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-8">
      {showWelcome ? (
        <div className="rounded-xl border border-emerald-200/90 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <span className="font-medium">Bienvenue !</span> Configure ton activité, puis active ton abonnement
          depuis{" "}
          <Link href="/dashboard/facturation" className="font-semibold underline">
            Facturation
          </Link>{" "}
          pour utiliser toutes les fonctionnalités.
          <button
            type="button"
            className="ml-3 text-xs font-medium text-emerald-800 underline"
            onClick={() => setShowWelcome(false)}
          >
            Fermer
          </button>
        </div>
      ) : null}
      <PageHeader
        title="Vue d'ensemble"
        description={
          state.settings.businessName?.trim()
            ? `${state.settings.businessName.trim()} — activité et rendez-vous en un coup d'œil.`
            : "Activité et rendez-vous en un coup d'œil."
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Aujourd'hui" value={stats.todayCount} sub="Réservations" />
        <StatCard label="Cette semaine" value={stats.weekCount} sub="Réservations" />
        <StatCard label="Taux de remplissage" value={`${stats.fill} %`} sub="Sur 7 jours" />
        <StatCard label="Clients" value={stats.clients} sub="En base" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={cardClass}>
          <div className="mb-5 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-neutral-950">Prochains rendez-vous</h2>
            <Link href="/dashboard/calendrier" className={linkClass}>
              Gérer
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyBlock message="Aucun rendez-vous à venir." />
          ) : (
            <ul className="space-y-2">
              {upcoming.map((r) => {
                const svc = state.services.find((s) => s.id === r.serviceId);
                return (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/40 px-4 py-3"
                  >
                    <div className="min-w-0 max-w-full">
                      <p className={`text-sm font-medium text-neutral-950 ${userTextBreakClass}`}>
                        {r.clientName}
                      </p>
                      <p className={`text-xs text-neutral-500 ${userTextBreakClass}`}>
                        {svc?.name ?? "Service"} · {formatDateTime(r.start)}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={cardClass}>
          <div className="mb-5 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-neutral-950">Dernières réservations</h2>
            <Link href="/dashboard/calendrier" className={linkClass}>
              Voir tout
            </Link>
          </div>
          {latest.length === 0 ? (
            <EmptyBlock message="Aucune réservation enregistrée." />
          ) : (
            <ul className="space-y-2">
              {latest.map((r) => {
                const svc = state.services.find((s) => s.id === r.serviceId);
                return (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/40 px-4 py-3"
                  >
                    <div className="min-w-0 max-w-full">
                      <p className={`text-sm font-medium text-neutral-950 ${userTextBreakClass}`}>
                        {r.clientName}
                      </p>
                      <p className={`text-xs text-neutral-500 ${userTextBreakClass}`}>
                        {svc?.name ?? "Service"} · {formatDateTime(r.start)}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className={cardClass}>
        <div className="mb-5 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-neutral-950">Activité récente</h2>
          <span className="text-xs text-neutral-400">Dernières entrées</span>
        </div>
        {activity.length === 0 ? (
          <EmptyBlock message="L’activité apparaîtra ici dès la première réservation." />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {activity.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                <p className={`min-w-0 max-w-full text-sm text-neutral-700 ${userTextBreakClass}`}>
                  <span className="font-medium text-neutral-950">Réservation</span>
                  {" · "}
                  {r.clientName}
                  <span className="text-neutral-400"> · {formatDateTime(r.createdAt)}</span>
                </p>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className={kpiCardClass}>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 tabular-nums">{value}</p>
      {sub ? <p className="mt-1 text-xs text-neutral-400">{sub}</p> : null}
    </div>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/30 px-4 py-10 text-center text-sm text-neutral-500">
      {message}
    </div>
  );
}
