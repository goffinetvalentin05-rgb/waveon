"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  addMinutes,
  combineYmdTime,
  getAvailableSlots,
  toYmd,
  validateBooking,
  weeklyDefault,
} from "@/lib/wavon/booking-logic";
import { formatPriceEUR } from "@/lib/wavon/format";
import { landingSection } from "@/components/landing/landing-tokens";
import { btnPrimaryClass, inputClass, labelClass } from "@/lib/wavon/tokens";
import { supabase } from "@/lib/supabase/client";
import type { DayKey, Service, WavonState } from "@/lib/wavon/types";

type DbBusiness = {
  id: string;
  business_name: string | null;
  public_slug: string | null;
};

type DbSettings = {
  business_id: string;
  minimum_notice_hours: number;
  minimum_service_duration: number;
  auto_confirm_reservations: boolean;
  availability_mode: "fixed" | "custom";
};

type DbService = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  description: string | null;
};

type DbReservation = {
  id: string;
  client_name: string;
  client_id: string | null;
  service_id: string;
  start_at: string;
  end_at: string;
  status: "confirmed" | "cancelled" | "pending";
  created_at: string;
};

type DbWeeklyAvailability = {
  day_of_week: number;
  is_open: boolean;
  segments: unknown;
};

type DbBlockedDate = {
  blocked_date: string;
};

function dayKeyFromDow(dow: number): DayKey {
  const map: Record<number, DayKey> = {
    0: "sun",
    1: "mon",
    2: "tue",
    3: "wed",
    4: "thu",
    5: "fri",
    6: "sat",
  };
  return map[dow] ?? "mon";
}

function segmentsFromJson(value: unknown): { start: string; end: string }[] {
  if (!Array.isArray(value)) return [];
  const out: { start: string; end: string }[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const start = typeof rec.start === "string" ? rec.start : null;
    const end = typeof rec.end === "string" ? rec.end : null;
    if (!start || !end) continue;
    out.push({ start, end });
  }
  return out;
}

export default function PublicBookingClient({ slug }: { slug: string }) {
  const [loadingInit, setLoadingInit] = useState(true);
  const [state, setState] = useState<WavonState | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [publishedName, setPublishedName] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingInit(true);
      setState(null);
      setBusinessId(null);
      try {
        const { data: business, error: businessErr } = await supabase
          .from("wavon_businesses")
          .select("id,business_name,public_slug")
          .eq("public_slug", slug)
          .maybeSingle();
        if (businessErr) throw businessErr;
        if (!business) {
          if (!cancelled) setLoadingInit(false);
          return;
        }
        const b = business as DbBusiness;
        const id = b.id;

        const [settingsRes, servicesRes, weeklyRes, blockedRes, reservationsRes] =
          await Promise.all([
            supabase
              .from("wavon_settings")
              .select(
                "business_id,minimum_notice_hours,minimum_service_duration,auto_confirm_reservations,availability_mode"
              )
              .eq("business_id", id)
              .maybeSingle(),
            supabase
              .from("wavon_services")
              .select("id,name,duration_minutes,price,description")
              .eq("business_id", id)
              .order("created_at", { ascending: true }),
            supabase
              .from("wavon_availability_rules")
              .select("day_of_week,is_open,segments")
              .eq("business_id", id),
            supabase
              .from("wavon_blocked_dates")
              .select("blocked_date")
              .eq("business_id", id),
            supabase
              .from("wavon_reservations")
              .select("id,client_name,client_id,service_id,start_at,end_at,status,created_at")
              .eq("business_id", id)
              .order("start_at", { ascending: true }),
          ]);

        if (
          settingsRes.error ||
          servicesRes.error ||
          weeklyRes.error ||
          blockedRes.error ||
          reservationsRes.error
        ) {
          throw (
            settingsRes.error ||
            servicesRes.error ||
            weeklyRes.error ||
            blockedRes.error ||
            reservationsRes.error
          );
        }

        const dbSettings = (settingsRes.data as DbSettings | null) ?? null;
        const dbServices = (servicesRes.data as DbService[]) ?? [];
        const dbWeekly = (weeklyRes.data as DbWeeklyAvailability[]) ?? [];
        const dbBlocked = (blockedRes.data as DbBlockedDate[]) ?? [];
        const dbReservations = (reservationsRes.data as DbReservation[]) ?? [];

        const baseWeekly = weeklyDefault();
        const weekly: WavonState["weekly"] = {
          mon: { ...baseWeekly.mon, enabled: false, segments: [] },
          tue: { ...baseWeekly.tue, enabled: false, segments: [] },
          wed: { ...baseWeekly.wed, enabled: false, segments: [] },
          thu: { ...baseWeekly.thu, enabled: false, segments: [] },
          fri: { ...baseWeekly.fri, enabled: false, segments: [] },
          sat: { ...baseWeekly.sat, enabled: false, segments: [] },
          sun: { ...baseWeekly.sun, enabled: false, segments: [] },
        };

        for (const row of dbWeekly) {
          const k = dayKeyFromDow(row.day_of_week);
          const segs = segmentsFromJson(row.segments);
          weekly[k] = { enabled: Boolean(row.is_open), segments: Boolean(row.is_open) ? segs : [] };
        }

        const next: WavonState = {
          version: 1,
          weekly,
          availabilityMode: dbSettings?.availability_mode ?? "fixed",
          customDays: [],
          blockedDates: dbBlocked.map((x) => String(x.blocked_date)).sort(),
          services: dbServices.map(
            (s): Service => ({
              id: s.id,
              name: s.name,
              durationMin: s.duration_minutes,
              price: s.price,
              description: s.description ?? "",
            })
          ),
          clients: [],
          reservations: dbReservations.map((r) => ({
            id: r.id,
            clientId: r.client_id,
            clientName: r.client_name || "Client",
            serviceId: r.service_id,
            start: r.start_at,
            end: r.end_at,
            status: r.status,
            createdAt: r.created_at,
          })),
          settings: {
            businessName: b.business_name ?? "",
            address: "",
            phone: "",
            publicSlug: b.public_slug ?? slug,
            minServiceDurationMin: dbSettings?.minimum_service_duration ?? 15,
            bookingLeadHours: dbSettings?.minimum_notice_hours ?? 0,
            confirmationMode: dbSettings?.auto_confirm_reservations ? "auto" : "manual",
          },
          whatsappThreads: [],
        };

        if (cancelled) return;
        setBusinessId(id);
        setPublishedName(b.business_name ?? "");
        setState(next);
        setLoadingInit(false);
      } catch (e) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[public booking] load error:", e);
        }
        if (!cancelled) {
          setLoadingInit(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

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
            <h1 className="text-lg font-semibold text-neutral-950">
              {loadingInit ? "Chargement…" : "Page introuvable"}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
              {loadingInit
                ? "Connexion au planning…"
                : `Aucune page publique n’est configurée pour « ${slug} ».`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const submit = async () => {
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
    if (!businessId) {
      setErr("Page indisponible.");
      return;
    }
    if (slots.length === 0) {
      setErr("Aucun créneau disponible pour ce jour.");
      return;
    }
    setLoading(true);
    try {
      const start = combineYmdTime(dateYmd, time);
      const end = addMinutes(start, svc.durationMin);
      const validationErr = validateBooking({
        state,
        service: svc,
        start,
        end,
      });
      if (validationErr) {
        setErr(validationErr);
        return;
      }

      // Client: create if we have at least a name; try to reuse by email/phone if provided.
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPhone = phone.trim();
      let clientId: string | null = null;

      if (normalizedEmail) {
        const { data } = await supabase
          .from("wavon_clients")
          .select("id")
          .eq("business_id", businessId)
          .eq("email", normalizedEmail)
          .maybeSingle();
        clientId = (data as { id: string } | null)?.id ?? null;
      } else if (normalizedPhone) {
        const { data } = await supabase
          .from("wavon_clients")
          .select("id")
          .eq("business_id", businessId)
          .eq("phone", normalizedPhone)
          .maybeSingle();
        clientId = (data as { id: string } | null)?.id ?? null;
      }

      if (!clientId) {
        const { data: created, error: cErr } = await supabase
          .from("wavon_clients")
          .insert({
            business_id: businessId,
            full_name: clientName.trim(),
            email: normalizedEmail || null,
            phone: normalizedPhone || null,
          })
          .select("id")
          .single();
        if (cErr) throw cErr;
        clientId = (created as { id: string }).id;
      }

      const status = state.settings.confirmationMode === "auto" ? "confirmed" : "pending";
      const displayName = clientName.trim();
      const { data: createdRes, error: rErr } = await supabase
        .from("wavon_reservations")
        .insert({
          business_id: businessId,
          client_id: clientId,
          client_name: displayName,
          service_id: svc.id,
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          status,
        })
        .select("id,created_at")
        .single();
      if (rErr) throw rErr;

      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          reservations: [
            ...prev.reservations,
            {
              id: (createdRes as { id: string }).id,
              clientId,
              clientName: displayName,
              serviceId: svc.id,
              start: start.toISOString(),
              end: end.toISOString(),
              status,
              createdAt: (createdRes as { created_at: string }).created_at,
            },
          ],
        };
      });

      setMsg("Ta demande est enregistrée. À très bientôt.");
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[public booking] submit error:", e);
      }
      setErr("Impossible d’enregistrer la réservation. Réessaie dans un instant.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-neutral-950">
      <div className={`${landingSection} flex min-h-screen flex-col py-10 sm:py-16`}>
        <header className="mb-10 text-center sm:mb-12">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-neutral-200/90 bg-white shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] sm:size-16">
            <Image src="/waevon-logo.png" alt="" width={36} height={36} className="rounded-lg" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 sm:text-[1.65rem]">
            {state.settings.businessName || publishedName || "Réservation"}
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
            Réservation proposée par Wavon.
          </p>
        </div>
      </div>
    </div>
  );
}
