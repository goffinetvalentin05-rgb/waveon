"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { addMinutes, validateBooking, weeklyDefault } from "@/lib/wavon/booking-logic";
import type {
  Client,
  CustomDaySlot,
  DayKey,
  Reservation,
  ReservationStatus,
  Service,
  WeeklyDaySchedule,
  WavonState,
} from "@/lib/wavon/types";
import { supabase } from "@/lib/supabase/client";

type DbBusiness = {
  id: string;
  user_id: string;
  business_name: string | null;
  public_slug: string | null;
  phone: string | null;
  address: string | null;
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
  business_id: string;
  name: string;
  duration_minutes: number;
  price: number;
  description: string | null;
};

type DbClient = {
  id: string;
  business_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
};

type DbReservation = {
  id: string;
  business_id: string;
  client_id: string | null;
  client_name: string;
  service_id: string;
  start_at: string;
  end_at: string;
  status: "confirmed" | "cancelled" | "pending";
  created_at: string;
};

type DbWeeklyAvailability = {
  business_id: string;
  day_of_week: number;
  is_open: boolean;
  segments: unknown;
};

type DbCustomDay = {
  business_id: string;
  day: string; // date
  segments: unknown;
};

type DbBlockedDate = {
  business_id: string;
  blocked_date: string; // date
};

function emptyWeekly(): Record<DayKey, WeeklyDaySchedule> {
  const base = weeklyDefault();
  // Nouveau compte: tout fermé par défaut
  return {
    mon: { ...base.mon, enabled: false, segments: [] },
    tue: { ...base.tue, enabled: false, segments: [] },
    wed: { ...base.wed, enabled: false, segments: [] },
    thu: { ...base.thu, enabled: false, segments: [] },
    fri: { ...base.fri, enabled: false, segments: [] },
    sat: { ...base.sat, enabled: false, segments: [] },
    sun: { ...base.sun, enabled: false, segments: [] },
  };
}

function createEmptyState(): WavonState {
  return {
    version: 1,
    weekly: emptyWeekly(),
    availabilityMode: "fixed",
    customDays: [],
    blockedDates: [],
    services: [],
    clients: [],
    reservations: [],
    settings: {
      businessName: "",
      address: "",
      phone: "",
      publicSlug: "",
      minServiceDurationMin: 15,
      bookingLeadHours: 0,
      confirmationMode: "manual",
    },
    whatsappThreads: [],
  };
}

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

type Ctx = {
  ready: boolean;
  state: WavonState;
  setWeeklyDay: (day: DayKey, patch: WeeklyDaySchedule) => void;
  setAvailabilityMode: (mode: WavonState["availabilityMode"]) => void;
  setCustomDays: (days: CustomDaySlot[]) => void;
  setBlockedDates: (dates: string[]) => void;
  addService: (s: Omit<Service, "id">) => void;
  updateService: (id: string, patch: Partial<Service>) => void;
  deleteService: (id: string) => void;
  addClient: (c: Omit<Client, "id">) => void;
  updateClient: (id: string, patch: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addReservation: (input: {
    clientId: string | null;
    clientName: string;
    serviceId: string;
    start: Date;
  }) => { ok: true; id: string } | { ok: false; error: string };
  updateReservation: (
    id: string,
    patch: Partial<{
      clientId: string | null;
      clientName: string;
      serviceId: string;
      start: Date;
      status: ReservationStatus;
    }>
  ) => { ok: true } | { ok: false; error: string };
  deleteReservation: (id: string) => void;
  patchSettings: (patch: Partial<WavonState["settings"]>) => void;
  replaceWhatsAppMessages: (
    threadId: string,
    messages: WavonState["whatsappThreads"][0]["messages"]
  ) => void;
};

const WavonContext = createContext<Ctx | null>(null);

export function WavonProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<WavonState>(() => createEmptyState());
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setReady(false);
      setBusinessId(null);
      setState(createEmptyState());

      // Business row should exist thanks to DB trigger; keep a safe fallback.
      const { data: business, error: businessErr } = await supabase
        .from("wavon_businesses")
        .select("id,user_id,business_name,public_slug,phone,address")
        .eq("user_id", userId)
        .maybeSingle();
      if (businessErr) throw businessErr;

      const ensuredBusiness: DbBusiness =
        (business as DbBusiness | null) ??
        (await (async () => {
          const { data: created, error } = await supabase
            .from("wavon_businesses")
            .insert({ user_id: userId })
            .select("id,user_id,business_name,public_slug,phone,address")
            .single();
          if (error) throw error;
          return created as DbBusiness;
        })());

      if (cancelled) return;
      setBusinessId(ensuredBusiness.id);

      const [
        settingsRes,
        servicesRes,
        clientsRes,
        reservationsRes,
        weeklyRes,
        customDaysRes,
        blockedRes,
      ] = await Promise.all([
        supabase
          .from("wavon_settings")
          .select(
            "business_id,minimum_notice_hours,minimum_service_duration,auto_confirm_reservations,availability_mode"
          )
          .eq("business_id", ensuredBusiness.id)
          .maybeSingle(),
        supabase
          .from("wavon_services")
          .select("id,business_id,name,duration_minutes,price,description")
          .eq("business_id", ensuredBusiness.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("wavon_clients")
          .select("id,business_id,full_name,email,phone")
          .eq("business_id", ensuredBusiness.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("wavon_reservations")
          .select("id,business_id,client_id,client_name,service_id,start_at,end_at,status,created_at")
          .eq("business_id", ensuredBusiness.id)
          .order("start_at", { ascending: true }),
        supabase
          .from("wavon_availability_rules")
          .select("business_id,day_of_week,is_open,segments")
          .eq("business_id", ensuredBusiness.id),
        supabase
          .from("wavon_custom_days")
          .select("business_id,day,segments")
          .eq("business_id", ensuredBusiness.id),
        supabase
          .from("wavon_blocked_dates")
          .select("business_id,blocked_date")
          .eq("business_id", ensuredBusiness.id),
      ]);

      if (
        settingsRes.error ||
        servicesRes.error ||
        clientsRes.error ||
        reservationsRes.error ||
        weeklyRes.error ||
        customDaysRes.error ||
        blockedRes.error
      ) {
        throw (
          settingsRes.error ||
          servicesRes.error ||
          clientsRes.error ||
          reservationsRes.error ||
          weeklyRes.error ||
          customDaysRes.error ||
          blockedRes.error
        );
      }

      const dbSettings = (settingsRes.data as DbSettings | null) ?? null;
      const dbServices = (servicesRes.data as DbService[]) ?? [];
      const dbClients = (clientsRes.data as DbClient[]) ?? [];
      const dbReservations = (reservationsRes.data as DbReservation[]) ?? [];
      const dbWeekly = (weeklyRes.data as DbWeeklyAvailability[]) ?? [];
      const dbCustomDays = (customDaysRes.data as DbCustomDay[]) ?? [];
      const dbBlocked = (blockedRes.data as DbBlockedDate[]) ?? [];

      const weekly = emptyWeekly();
      for (const row of dbWeekly) {
        const k = dayKeyFromDow(row.day_of_week);
        const segs = segmentsFromJson(row.segments);
        weekly[k] = { enabled: Boolean(row.is_open), segments: Boolean(row.is_open) ? segs : [] };
      }

      const customDays: CustomDaySlot[] = dbCustomDays.map((r) => ({
        date: String(r.day),
        segments: segmentsFromJson(r.segments),
      }));

      const next: WavonState = {
        version: 1,
        weekly,
        availabilityMode: dbSettings?.availability_mode ?? "fixed",
        customDays,
        blockedDates: dbBlocked.map((r) => String(r.blocked_date)).sort(),
        services: dbServices.map((s) => ({
          id: s.id,
          name: s.name,
          durationMin: s.duration_minutes,
          price: s.price,
          description: s.description ?? "",
        })),
        clients: dbClients.map((c) => ({
          id: c.id,
          name: c.full_name,
          phone: c.phone ?? "",
          email: c.email ?? "",
        })),
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
          businessName: ensuredBusiness.business_name ?? "",
          address: ensuredBusiness.address ?? "",
          phone: ensuredBusiness.phone ?? "",
          publicSlug: ensuredBusiness.public_slug ?? "",
          minServiceDurationMin: dbSettings?.minimum_service_duration ?? 15,
          bookingLeadHours: dbSettings?.minimum_notice_hours ?? 0,
          confirmationMode: dbSettings?.auto_confirm_reservations ? "auto" : "manual",
        },
        whatsappThreads: [],
      };

      if (cancelled) return;
      setState(next);
      setReady(true);
    }

    void bootstrap().catch((err) => {
      if (process.env.NODE_ENV !== "production") {
        console.error("[WavonProvider] bootstrap error:", err);
      }
      if (!cancelled) {
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const setWeeklyDay = useCallback((day: DayKey, patch: WeeklyDaySchedule) => {
    setState((prev) => ({ ...prev, weekly: { ...prev.weekly, [day]: patch } }));
    if (!businessId) return;
    const dayOfWeek: Record<DayKey, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };
    void supabase.from("wavon_availability_rules").upsert(
      {
        business_id: businessId,
        day_of_week: dayOfWeek[day],
        is_open: patch.enabled,
        segments: patch.enabled ? patch.segments : [],
      },
      { onConflict: "business_id,day_of_week" }
    );
  }, [businessId]);

  const setAvailabilityMode = useCallback((mode: WavonState["availabilityMode"]) => {
    setState((prev) => ({ ...prev, availabilityMode: mode }));
    if (!businessId) return;
    void supabase
      .from("wavon_settings")
      .update({ availability_mode: mode })
      .eq("business_id", businessId);
  }, [businessId]);

  const setCustomDays = useCallback((days: CustomDaySlot[]) => {
    setState((prev) => ({ ...prev, customDays: days }));
    if (!businessId) return;
    // Simple sync: replace all (acceptable for now; can be optimized later)
    void (async () => {
      await supabase.from("wavon_custom_days").delete().eq("business_id", businessId);
      if (days.length === 0) return;
      await supabase.from("wavon_custom_days").insert(
        days.map((d) => ({
          business_id: businessId,
          day: d.date,
          segments: d.segments,
        }))
      );
    })();
  }, [businessId]);

  const setBlockedDates = useCallback((dates: string[]) => {
    setState((prev) => ({ ...prev, blockedDates: dates }));
    if (!businessId) return;
    void (async () => {
      await supabase.from("wavon_blocked_dates").delete().eq("business_id", businessId);
      if (dates.length === 0) return;
      await supabase.from("wavon_blocked_dates").insert(
        dates.map((d) => ({
          business_id: businessId,
          blocked_date: d,
        }))
      );
    })();
  }, [businessId]);

  const addService = useCallback((s: Omit<Service, "id">) => {
    if (!businessId) return;
    void (async () => {
      const { data, error } = await supabase
        .from("wavon_services")
        .insert({
          business_id: businessId,
          name: s.name,
          duration_minutes: s.durationMin,
          price: s.price,
          description: s.description ?? "",
        })
        .select("id,business_id,name,duration_minutes,price,description")
        .single();
      if (error) throw error;
      const row = data as DbService;
      setState((prev) => ({
        ...prev,
        services: [
          ...prev.services,
          {
            id: row.id,
            name: row.name,
            durationMin: row.duration_minutes,
            price: row.price,
            description: row.description ?? "",
          },
        ],
      }));
    })();
  }, [businessId]);

  const updateService = useCallback((id: string, patch: Partial<Service>) => {
    setState((prev) => ({
      ...prev,
      services: prev.services.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
    if (!businessId) return;
    void supabase
      .from("wavon_services")
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.durationMin !== undefined ? { duration_minutes: patch.durationMin } : {}),
        ...(patch.price !== undefined ? { price: patch.price } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
      })
      .eq("id", id)
      .eq("business_id", businessId);
  }, [businessId]);

  const deleteService = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      services: prev.services.filter((x) => x.id !== id),
      reservations: prev.reservations.filter((r) => r.serviceId !== id),
    }));
    if (!businessId) return;
    void supabase.from("wavon_services").delete().eq("id", id).eq("business_id", businessId);
  }, [businessId]);

  const addClient = useCallback((c: Omit<Client, "id">) => {
    if (!businessId) return;
    void (async () => {
      const { data, error } = await supabase
        .from("wavon_clients")
        .insert({
          business_id: businessId,
          full_name: c.name,
          phone: c.phone || null,
          email: c.email || null,
        })
        .select("id,business_id,full_name,email,phone")
        .single();
      if (error) throw error;
      const row = data as DbClient;
      setState((prev) => ({
        ...prev,
        clients: [
          ...prev.clients,
          {
            id: row.id,
            name: row.full_name,
            phone: row.phone ?? "",
            email: row.email ?? "",
          },
        ],
      }));
    })();
  }, [businessId]);

  const updateClient = useCallback((id: string, patch: Partial<Client>) => {
    setState((prev) => ({
      ...prev,
      clients: prev.clients.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
    if (!businessId) return;
    void supabase
      .from("wavon_clients")
      .update({
        ...(patch.name !== undefined ? { full_name: patch.name } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone || null } : {}),
        ...(patch.email !== undefined ? { email: patch.email || null } : {}),
      })
      .eq("id", id)
      .eq("business_id", businessId);
  }, [businessId]);

  const deleteClient = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      clients: prev.clients.filter((x) => x.id !== id),
      reservations: prev.reservations.map((r) =>
        r.clientId === id ? { ...r, clientId: null } : r
      ),
    }));
    if (!businessId) return;
    void supabase.from("wavon_clients").delete().eq("id", id).eq("business_id", businessId);
  }, [businessId]);

  const addReservation = useCallback(
    (input: {
      clientId: string | null;
      clientName: string;
      serviceId: string;
      start: Date;
    }): { ok: true; id: string } | { ok: false; error: string } => {
      if (!businessId) {
        return { ok: false, error: "Compte non initialisé." };
      }

      const outcome: {
        current:
          | { kind: "ok"; reservation: Reservation }
          | { kind: "err"; message: string };
      } = { current: { kind: "err", message: "Erreur" } };

      setState((prev) => {
        const service = prev.services.find((s) => s.id === input.serviceId);
        if (!service) {
          outcome.current = { kind: "err", message: "Service introuvable." };
          return prev;
        }
        const end = addMinutes(input.start, service.durationMin);
        const status: ReservationStatus =
          prev.settings.confirmationMode === "auto" ? "confirmed" : "pending";
        const err = validateBooking({
          state: prev,
          service,
          start: input.start,
          end,
        });
        if (err) {
          outcome.current = { kind: "err", message: err };
          return prev;
        }
        const id = crypto.randomUUID();
        const res: Reservation = {
          id,
          clientId: input.clientId,
          clientName: input.clientName.trim(),
          serviceId: service.id,
          start: input.start.toISOString(),
          end: end.toISOString(),
          status,
          createdAt: new Date().toISOString(),
        };
        outcome.current = { kind: "ok", reservation: res };
        return { ...prev, reservations: [...prev.reservations, res] };
      });

      if (outcome.current.kind === "err") {
        return { ok: false, error: outcome.current.message };
      }

      const res = outcome.current.reservation;
      void (async () => {
        const { error } = await supabase.from("wavon_reservations").insert({
          id: res.id,
          business_id: businessId,
          client_id: res.clientId,
          client_name: res.clientName.trim(),
          service_id: res.serviceId,
          start_at: res.start,
          end_at: res.end,
          status: res.status,
        });
        if (error && process.env.NODE_ENV !== "production") {
          console.error("[WavonProvider] insert reservation:", error.message);
        }
      })();

      return { ok: true, id: res.id };
    },
    [businessId]
  );

  const updateReservation = useCallback(
    (
      id: string,
      patch: Partial<{
        clientId: string | null;
        clientName: string;
        serviceId: string;
        start: Date;
        status: ReservationStatus;
      }>
    ): { ok: true } | { ok: false; error: string } => {
      let errorMsg: string | null = null;
      setState((prev) => {
        const cur = prev.reservations.find((r) => r.id === id);
        if (!cur) {
          errorMsg = "Réservation introuvable.";
          return prev;
        }
        const serviceId = patch.serviceId ?? cur.serviceId;
        const service = prev.services.find((s) => s.id === serviceId);
        if (!service) {
          errorMsg = "Service introuvable.";
          return prev;
        }
        const start = patch.start ?? new Date(cur.start);
        const end = addMinutes(start, service.durationMin);
        const next: Reservation = {
          ...cur,
          clientId: patch.clientId !== undefined ? patch.clientId : cur.clientId,
          clientName: patch.clientName?.trim() ?? cur.clientName,
          serviceId,
          start: start.toISOString(),
          end: end.toISOString(),
          status: patch.status ?? cur.status,
        };
        const err = validateBooking({
          state: prev,
          service,
          start: new Date(next.start),
          end: new Date(next.end),
          ignoreReservationId: id,
        });
        if (err) {
          errorMsg = err;
          return prev;
        }
        return {
          ...prev,
          reservations: prev.reservations.map((r) => (r.id === id ? next : r)),
        };
      });
      if (businessId && !errorMsg) {
        const payload: Record<string, unknown> = {};
        if (patch.clientId !== undefined) payload.client_id = patch.clientId || null;
        if (patch.clientName !== undefined) payload.client_name = patch.clientName.trim();
        if (patch.serviceId !== undefined) payload.service_id = patch.serviceId;
        if (patch.status !== undefined) payload.status = patch.status;
        if (patch.start !== undefined || patch.serviceId !== undefined) {
          const svcId =
            patch.serviceId ??
            state.reservations.find((r) => r.id === id)?.serviceId ??
            "";
          const svc = state.services.find((s) => s.id === svcId) ?? null;
          const start = patch.start ?? new Date(state.reservations.find((r) => r.id === id)?.start ?? Date.now());
          if (svc) {
            payload.start_at = start.toISOString();
            payload.end_at = addMinutes(start, svc.durationMin).toISOString();
          }
        }
        void supabase
          .from("wavon_reservations")
          .update(payload)
          .eq("id", id)
          .eq("business_id", businessId);
      }
      return errorMsg ? { ok: false, error: errorMsg } : { ok: true };
    },
       [businessId, state.services, state.reservations]
  );

  const deleteReservation = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      reservations: prev.reservations.filter((r) => r.id !== id),
    }));
    if (!businessId) return;
    void supabase.from("wavon_reservations").delete().eq("id", id).eq("business_id", businessId);
  }, [businessId]);

  const patchSettings = useCallback((patch: Partial<WavonState["settings"]>) => {
    setState((prev) => {
      const slug =
        patch.publicSlug !== undefined
          ? patch.publicSlug
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, "-")
              .replace(/-+/g, "-")
              .replace(/^-|-$/g, "")
          : undefined;
      const next = {
        ...prev.settings,
        ...patch,
        ...(slug !== undefined ? { publicSlug: slug } : {}),
      };
      return { ...prev, settings: next };
    });

    if (!businessId) return;
    void (async () => {
      const businessPatch: Record<string, unknown> = {};
      if (patch.businessName !== undefined) businessPatch.business_name = patch.businessName.trim();
      if (patch.address !== undefined) businessPatch.address = patch.address.trim();
      if (patch.phone !== undefined) businessPatch.phone = patch.phone.trim();
      if (patch.publicSlug !== undefined) {
        businessPatch.public_slug =
          patch.publicSlug
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "") || null;
      }
      if (Object.keys(businessPatch).length > 0) {
        await supabase.from("wavon_businesses").update(businessPatch).eq("id", businessId);
      }

      const settingsPatch: Record<string, unknown> = {};
      if (patch.minServiceDurationMin !== undefined) {
        settingsPatch.minimum_service_duration = patch.minServiceDurationMin;
      }
      if (patch.bookingLeadHours !== undefined) {
        settingsPatch.minimum_notice_hours = patch.bookingLeadHours;
      }
      if (patch.confirmationMode !== undefined) {
        settingsPatch.auto_confirm_reservations = patch.confirmationMode === "auto";
      }
      if (Object.keys(settingsPatch).length > 0) {
        await supabase.from("wavon_settings").update(settingsPatch).eq("business_id", businessId);
      }
    })();
  }, [businessId]);

  const replaceWhatsAppMessages = useCallback(
    (threadId: string, messages: WavonState["whatsappThreads"][0]["messages"]) => {
      setState((prev) => ({
        ...prev,
        whatsappThreads: prev.whatsappThreads.map((t) =>
          t.id === threadId
            ? {
                ...t,
                messages,
                updatedAt: new Date().toISOString(),
              }
            : t
        ),
      }));
    },
    []
  );

  const value = useMemo(
    () => ({
      ready,
      state,
      setWeeklyDay,
      setAvailabilityMode,
      setCustomDays,
      setBlockedDates,
      addService,
      updateService,
      deleteService,
      addClient,
      updateClient,
      deleteClient,
      addReservation,
      updateReservation,
      deleteReservation,
      patchSettings,
      replaceWhatsAppMessages,
    }),
    [
      ready,
      state,
      setWeeklyDay,
      setAvailabilityMode,
      setCustomDays,
      setBlockedDates,
      addService,
      updateService,
      deleteService,
      addClient,
      updateClient,
      deleteClient,
      addReservation,
      updateReservation,
      deleteReservation,
      patchSettings,
      replaceWhatsAppMessages,
    ]
  );

  return <WavonContext.Provider value={value}>{children}</WavonContext.Provider>;
}

export function useWavon() {
  const ctx = useContext(WavonContext);
  if (!ctx) throw new Error("useWavon requires WavonProvider");
  return ctx;
}
