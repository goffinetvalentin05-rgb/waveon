"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useWavon } from "@/components/wavon/WavonProvider";
import { activeReservations, fillRateWeekApprox, toYmd } from "@/lib/wavon/booking-logic";
import { formatDateTime } from "@/lib/wavon/format";
import { cardClass } from "@/lib/wavon/tokens";

export default function DashboardOverviewPage() {
  const { ready, state } = useWavon();

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
    // eslint-disable-next-line react-hooks/purity -- instantané pour « à venir »
    const t = Date.now();
    return [...state.reservations]
      .filter((r) => r.status !== "cancelled" && new Date(r.start).getTime() >= t)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 5);
  }, [state.reservations]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-white/60">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 motion-safe:animate-spin" />
          <p className="text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Vue d&apos;ensemble
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-white/60">
          {state.settings.businessName} — aperçu rapide de l&apos;activité et des prochains
          rendez-vous.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Réservations aujourd'hui" value={stats.todayCount} />
        <StatCard label="Cette semaine" value={stats.weekCount} />
        <StatCard label="Taux de remplissage" value={`${stats.fill} %`} hint="sur 7 jours" />
        <StatCard label="Clients" value={stats.clients} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={cardClass}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-white">Dernières réservations</h2>
            <Link
              href="/dashboard/reservations"
              className="text-xs font-medium text-emerald-400/90 hover:text-emerald-300"
            >
              Voir tout
            </Link>
          </div>
          {latest.length === 0 ? (
            <EmptyBlock message="Aucune réservation pour le moment." />
          ) : (
            <ul className="space-y-3">
              {latest.map((r) => {
                const svc = state.services.find((s) => s.id === r.serviceId);
                return (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/40 px-3 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium text-white">{r.clientName}</p>
                      <p className="text-xs text-white/55">
                        {svc?.name ?? "Service"} · {formatDateTime(r.start)}
                      </p>
                    </div>
                    <StatusPill status={r.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={cardClass}>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-white">Prochains rendez-vous</h2>
            <Link
              href="/dashboard/reservations"
              className="text-xs font-medium text-emerald-400/90 hover:text-emerald-300"
            >
              Gérer
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyBlock message="Aucun rendez-vous à venir." />
          ) : (
            <ul className="space-y-3">
              {upcoming.map((r) => {
                const svc = state.services.find((s) => s.id === r.serviceId);
                return (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/5 bg-black/40 px-3 py-2.5 text-sm"
                  >
                    <div>
                      <p className="font-medium text-white">{r.clientName}</p>
                      <p className="text-xs text-white/55">
                        {svc?.name ?? "Service"} · {formatDateTime(r.start)}
                      </p>
                    </div>
                    <StatusPill status={r.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className={cardClass}>
      <p className="text-sm text-white/60">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-emerald-400">{value}</p>
      {hint ? <p className="mt-1 text-xs text-white/45">{hint}</p> : null}
    </div>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-emerald-500/20 bg-black/50 px-4 py-8 text-center text-sm text-white/55">
      {message}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
    pending: "border-amber-500/35 bg-amber-500/10 text-amber-200",
    cancelled: "border-white/15 bg-white/5 text-white/50",
  };
  const label =
    status === "confirmed"
      ? "Confirmé"
      : status === "pending"
        ? "En attente"
        : status === "cancelled"
          ? "Annulé"
          : status;
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[status] ?? map.pending}`}
    >
      {label}
    </span>
  );
}
