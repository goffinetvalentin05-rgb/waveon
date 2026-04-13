"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { combineYmdTime, getAvailableSlots, toYmd } from "@/lib/wavon/booking-logic";
import { appendPublicBooking } from "@/lib/wavon/append-public-booking";
import { formatPriceEUR } from "@/lib/wavon/format";
import {
  readPublicSnapshot,
  snapshotToBookingState,
} from "@/lib/wavon/public-snapshot";
import { btnPrimaryClass, inputClass } from "@/lib/wavon/tokens";

export default function PublicBookingClient({ slug }: { slug: string }) {
  const [tick, setTick] = useState(0);
  const state = useMemo(() => {
    void tick;
    const snap = readPublicSnapshot(slug);
    if (!snap) return null;
    return snapshotToBookingState(snap);
  }, [slug, tick]);

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [dateYmd, setDateYmd] = useState(() => toYmd(new Date()));
  const [time, setTime] = useState("10:00");
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resolvedServiceId =
    serviceId && state?.services.some((s) => s.id === serviceId)
      ? serviceId
      : (state?.services[0]?.id ?? null);
  const svc = state?.services.find((s) => s.id === resolvedServiceId) ?? null;

  const slots = useMemo(() => {
    if (!state || !svc || !dateYmd) return [];
    return getAvailableSlots(dateYmd, svc, state);
  }, [state, svc, dateYmd]);

  if (!state) {
    return (
      <div className="min-h-screen bg-black px-4 py-16 text-center text-white/70">
        <div className="mx-auto max-w-md rounded-2xl border border-emerald-500/20 bg-[#0a0a0a] px-6 py-10">
          <h1 className="text-lg font-semibold text-white">Page introuvable</h1>
          <p className="mt-2 text-sm text-white/60">
            Aucune donnée publiée pour « {slug} ». Connecte-toi au tableau de bord Wavon sur ce
            navigateur pour initialiser le lien (slug identique dans Paramètres).
          </p>
        </div>
      </div>
    );
  }

  const submit = () => {
    setErr(null);
    setMsg(null);
    if (!state.services.length) {
      setErr("Aucun service disponible.");
      return;
    }
    if (!svc) {
      setErr("Choisis un service.");
      return;
    }
    if (!clientName.trim()) {
      setErr("Indique ton nom.");
      return;
    }
    setLoading(true);
    const start = combineYmdTime(dateYmd, time);
    const res = appendPublicBooking(slug, {
      clientName: `${clientName.trim()}${phone ? ` · ${phone}` : ""}${email ? ` · ${email}` : ""}`,
      serviceId: svc.id,
      start,
    });
    setLoading(false);
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setMsg("Demande enregistrée. À bientôt !");
    setTick((x) => x + 1);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8 sm:py-12">
        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10 shadow-[0_0_32px_-8px_rgba(34,197,94,0.4)]">
            <Image src="/waevon-logo.png" alt="" width={40} height={40} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            {state.settings.businessName}
          </h1>
          <p className="mt-2 text-sm text-white/55">Réserve en quelques étapes.</p>
        </header>

        <div className="flex flex-1 flex-col gap-5 rounded-2xl border border-emerald-500/15 bg-[#080808] p-5 sm:p-6">
          <div>
            <label className="text-xs font-medium text-emerald-400/90">Service</label>
            <select
              className={`${inputClass} mt-1`}
              value={resolvedServiceId ?? ""}
              onChange={(e) => setServiceId(e.target.value)}
            >
              {state.services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.durationMin} min — {formatPriceEUR(s.price)}
                </option>
              ))}
            </select>
            {svc?.description ? (
              <p className="mt-2 text-xs text-white/45">{svc.description}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-emerald-400/90">Date</label>
              <input
                type="date"
                className={`${inputClass} mt-1`}
                value={dateYmd}
                onChange={(e) => setDateYmd(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-emerald-400/90">Heure</label>
              <select
                className={`${inputClass} mt-1`}
                value={time}
                onChange={(e) => setTime(e.target.value)}
              >
                {slots.length === 0 ? (
                  <option value={time}>Aucun créneau</option>
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

          <div className="border-t border-white/10 pt-4">
            <p className="text-xs font-medium text-white/55">Tes coordonnées</p>
            <div className="mt-3 grid gap-3">
              <input
                className={inputClass}
                placeholder="Nom complet"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Téléphone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
              />
              <input
                className={inputClass}
                placeholder="Email (optionnel)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />
            </div>
          </div>

          {err ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              {err}
            </div>
          ) : null}
          {msg ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              {msg}
            </div>
          ) : null}

          <button
            type="button"
            disabled={loading || state.services.length === 0}
            onClick={submit}
            className={btnPrimaryClass + " mt-auto min-h-[48px] w-full text-base"}
          >
            {loading ? "Envoi…" : "Confirmer la réservation"}
          </button>
        </div>

        <p className="mt-8 text-center text-[11px] text-white/35">
          Propulsé par Wavon — démo hors ligne sur ce navigateur.
        </p>
      </div>
    </div>
  );
}
