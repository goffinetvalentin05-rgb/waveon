"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { combineYmdTime, getAvailableSlots, toYmd } from "@/lib/wavon/booking-logic";
import { appendPublicBooking } from "@/lib/wavon/append-public-booking";
import { formatPriceEUR } from "@/lib/wavon/format";
import { readPublicSnapshot, snapshotToBookingState } from "@/lib/wavon/public-snapshot";
import { landingSection } from "@/components/landing/landing-tokens";
import { btnPrimaryClass, inputClass, labelClass } from "@/lib/wavon/tokens";

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
      <div className="min-h-screen bg-[#f7f7f5] px-4 py-20 text-neutral-600">
        <div className={`${landingSection} text-center`}>
          <div className="mx-auto max-w-md rounded-3xl border border-neutral-200/90 bg-white px-8 py-12 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)]">
            <h1 className="text-lg font-semibold text-neutral-950">Page introuvable</h1>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
              Aucune donnée publiée pour « {slug} ». Ouvre le tableau de bord Wavon sur ce navigateur
              pour publier ton lien (même identifiant que dans Paramètres).
            </p>
          </div>
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
    setMsg("Ta demande est enregistrée. À très bientôt.");
    setTick((x) => x + 1);
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-neutral-950">
      <div className={`${landingSection} flex min-h-screen flex-col py-10 sm:py-16`}>
        <header className="mb-10 text-center sm:mb-12">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-neutral-200/90 bg-white shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] sm:size-16">
            <Image src="/waevon-logo.png" alt="" width={36} height={36} className="rounded-lg" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-[1.65rem]">
            {state.settings.businessName}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
            Réserve un créneau en quelques étapes — simple et sécurisé.
          </p>
        </header>

        <div className="mx-auto w-full max-w-lg flex-1">
          <div className="rounded-3xl border border-neutral-200/90 bg-white p-6 shadow-[0_2px_20px_-6px_rgba(0,0,0,0.08)] sm:p-8">
            <div className="space-y-6">
              <div>
                <label className={labelClass}>Prestation</label>
                <select
                  className={`${inputClass} mt-2`}
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
                  <p className="mt-2 text-xs leading-relaxed text-neutral-500">{svc.description}</p>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Jour</label>
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

              <div className="border-t border-neutral-100 pt-6">
                <p className={labelClass}>Tes coordonnées</p>
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
                <div className="rounded-2xl border border-red-200/90 bg-red-50/80 px-4 py-3 text-sm text-red-900">
                  {err}
                </div>
              ) : null}
              {msg ? (
                <div className="rounded-2xl border border-neutral-200/90 bg-neutral-50 px-4 py-3 text-sm text-neutral-800">
                  {msg}
                </div>
              ) : null}

              <button
                type="button"
                disabled={loading || state.services.length === 0}
                onClick={submit}
                className={btnPrimaryClass + " min-h-[48px] w-full text-base"}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="size-5 rounded-full border-2 border-neutral-200 border-t-neutral-950 motion-safe:animate-spin"
                      aria-hidden
                    />
                    Envoi…
                  </span>
                ) : (
                  "Confirmer la réservation"
                )}
              </button>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-neutral-400">
            Réservation proposée par Wavon — démo locale sur ce navigateur.
          </p>
        </div>
      </div>
    </div>
  );
}
