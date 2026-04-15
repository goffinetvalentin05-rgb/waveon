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
  EmailTemplate,
  EmailTemplateType,
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
  business_type: string | null;
  email: string | null;
  public_slug: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  public_description: string | null;
  public_welcome_message: string | null;
  public_display_name: string | null;
  public_logo_url: string | null;
  public_logo_path: string | null;
  public_cover_url: string | null;
  public_cover_path: string | null;
  public_show_phone: boolean | null;
  public_show_address: boolean | null;
  public_show_description: boolean | null;
};

type DbSettings = {
  business_id: string;
  minimum_notice_hours: number;
  minimum_service_duration: number;
  auto_confirm_reservations: boolean;
  availability_mode: "fixed" | "custom";
  maximum_days_in_advance: number;
  slot_interval_minutes: number;
  minimum_gap_between_bookings: number;
  allow_cancellation: boolean;
  cancellation_deadline_hours: number;
  allow_reschedule: boolean;
  reschedule_deadline_hours: number;
  same_day_booking_allowed: boolean;
  public_after_booking_message: string | null;
};

type DbService = {
  id: string;
  business_id: string;
  name: string;
  duration_minutes: number;
  price: number;
  description: string | null;
  is_active: boolean;
  is_public: boolean;
  color: string | null;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  booking_notice_hours: number | null;
  sort_order: number;
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
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
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

type DbEmailTemplate = {
  id: string;
  business_id: string;
  type: EmailTemplateType;
  is_enabled: boolean;
  subject: string;
  body: string;
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
      minNoticeHours: 0,
      maxDaysInAdvance: 365,
      slotIntervalMinutes: 15,
      minGapBetweenBookingsMinutes: 0,
      sameDayBookingAllowed: true,
      allowCancellation: true,
      cancellationDeadlineHours: 0,
      allowReschedule: true,
      rescheduleDeadlineHours: 0,
      confirmationMode: "manual",
      publicShowPhone: true,
      publicShowAddress: true,
      publicShowDescription: true,
      publicAfterBookingMessage: "Ta demande est enregistrée. À très bientôt.",
    },
    emailTemplates: [],
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
  businessId: string | null;
  setWeeklyDay: (
    day: DayKey,
    patch: WeeklyDaySchedule
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
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
  upsertEmailTemplate: (input: {
    type: EmailTemplateType;
    isEnabled: boolean;
    subject: string;
    body: string;
  }) => void;
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
        .select(
          "id,user_id,business_name,business_type,email,public_slug,website,phone,address,city,postal_code,public_description,public_welcome_message,public_display_name,public_logo_url,public_logo_path,public_cover_url,public_cover_path,public_show_phone,public_show_address,public_show_description"
        )
        .eq("user_id", userId)
        .maybeSingle();
      if (businessErr) throw businessErr;

      const ensuredBusiness: DbBusiness =
        (business as DbBusiness | null) ??
        (await (async () => {
          const { data: created, error } = await supabase
            .from("wavon_businesses")
            .insert({ user_id: userId })
            .select(
              "id,user_id,business_name,business_type,email,public_slug,website,phone,address,city,postal_code,public_description,public_welcome_message,public_display_name,public_logo_url,public_logo_path,public_cover_url,public_cover_path,public_show_phone,public_show_address,public_show_description"
            )
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
        templatesRes,
      ] = await Promise.all([
        supabase
          .from("wavon_settings")
          .select(
            "business_id,minimum_notice_hours,minimum_service_duration,auto_confirm_reservations,availability_mode,maximum_days_in_advance,slot_interval_minutes,minimum_gap_between_bookings,allow_cancellation,cancellation_deadline_hours,allow_reschedule,reschedule_deadline_hours,same_day_booking_allowed,public_after_booking_message"
          )
          .eq("business_id", ensuredBusiness.id)
          .maybeSingle(),
        supabase
          .from("wavon_services")
          .select(
            "id,business_id,name,duration_minutes,price,description,is_active,is_public,color,buffer_before_minutes,buffer_after_minutes,booking_notice_hours,sort_order"
          )
          .eq("business_id", ensuredBusiness.id)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from("wavon_clients")
          .select("id,business_id,full_name,email,phone")
          .eq("business_id", ensuredBusiness.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("wavon_reservations")
          .select(
            "id,business_id,client_id,client_name,service_id,start_at,end_at,duration_minutes,buffer_before_minutes,buffer_after_minutes,status,created_at"
          )
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
        supabase
          .from("wavon_email_templates")
          .select("id,business_id,type,is_enabled,subject,body")
          .eq("business_id", ensuredBusiness.id),
      ]);

      if (
        settingsRes.error ||
        servicesRes.error ||
        clientsRes.error ||
        reservationsRes.error ||
        weeklyRes.error ||
        customDaysRes.error ||
        blockedRes.error ||
        templatesRes.error
      ) {
        throw (
          settingsRes.error ||
          servicesRes.error ||
          clientsRes.error ||
          reservationsRes.error ||
          weeklyRes.error ||
          customDaysRes.error ||
          blockedRes.error ||
          templatesRes.error
        );
      }

      const dbSettings = (settingsRes.data as DbSettings | null) ?? null;
      const dbServices = (servicesRes.data as DbService[]) ?? [];
      const dbClients = (clientsRes.data as DbClient[]) ?? [];
      const dbReservations = (reservationsRes.data as DbReservation[]) ?? [];
      const dbWeekly = (weeklyRes.data as DbWeeklyAvailability[]) ?? [];
      const dbCustomDays = (customDaysRes.data as DbCustomDay[]) ?? [];
      const dbBlocked = (blockedRes.data as DbBlockedDate[]) ?? [];
      const dbTemplates = (templatesRes.data as DbEmailTemplate[]) ?? [];

      const weekly = emptyWeekly();
      for (const row of dbWeekly) {
        const k = dayKeyFromDow(row.day_of_week);
        const segs = segmentsFromJson(row.segments);
        // Keep segments even when day is closed (preserve user config)
        weekly[k] = { enabled: Boolean(row.is_open), segments: segs };
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
          isActive: Boolean(s.is_active),
          isPublic: Boolean(s.is_public),
          color: s.color,
          bufferBeforeMin: Math.max(0, s.buffer_before_minutes ?? 0),
          bufferAfterMin: Math.max(0, s.buffer_after_minutes ?? 0),
          bookingNoticeHours: s.booking_notice_hours,
          sortOrder: s.sort_order ?? 0,
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
          durationMin: r.duration_minutes ?? 0,
          bufferBeforeMin: r.buffer_before_minutes ?? 0,
          bufferAfterMin: r.buffer_after_minutes ?? 0,
          status: r.status,
          createdAt: r.created_at,
        })),
        settings: {
          businessName: ensuredBusiness.business_name ?? "",
          address: ensuredBusiness.address ?? "",
          phone: ensuredBusiness.phone ?? "",
          publicSlug: ensuredBusiness.public_slug ?? "",
          minServiceDurationMin: dbSettings?.minimum_service_duration ?? 15,
          minNoticeHours: dbSettings?.minimum_notice_hours ?? 0,
          maxDaysInAdvance: dbSettings?.maximum_days_in_advance ?? 365,
          slotIntervalMinutes: dbSettings?.slot_interval_minutes ?? 15,
          minGapBetweenBookingsMinutes: dbSettings?.minimum_gap_between_bookings ?? 0,
          sameDayBookingAllowed: dbSettings?.same_day_booking_allowed ?? true,
          allowCancellation: dbSettings?.allow_cancellation ?? true,
          cancellationDeadlineHours: dbSettings?.cancellation_deadline_hours ?? 0,
          allowReschedule: dbSettings?.allow_reschedule ?? true,
          rescheduleDeadlineHours: dbSettings?.reschedule_deadline_hours ?? 0,
          confirmationMode: dbSettings?.auto_confirm_reservations ? "auto" : "manual",
          email: ensuredBusiness.email ?? "",
          businessType: ensuredBusiness.business_type ?? "",
          website: ensuredBusiness.website ?? "",
          city: ensuredBusiness.city ?? "",
          postalCode: ensuredBusiness.postal_code ?? "",
          publicDescription: ensuredBusiness.public_description ?? "",
          publicWelcomeMessage: ensuredBusiness.public_welcome_message ?? "",
          publicDisplayName: ensuredBusiness.public_display_name ?? "",
          publicLogoUrl: ensuredBusiness.public_logo_url ?? "",
          publicLogoPath: ensuredBusiness.public_logo_path ?? "",
          publicCoverUrl: ensuredBusiness.public_cover_url ?? "",
          publicCoverPath: ensuredBusiness.public_cover_path ?? "",
          publicShowPhone: ensuredBusiness.public_show_phone ?? true,
          publicShowAddress: ensuredBusiness.public_show_address ?? true,
          publicShowDescription: ensuredBusiness.public_show_description ?? true,
          publicAfterBookingMessage:
            dbSettings?.public_after_booking_message ??
            "Ta demande est enregistrée. À très bientôt.",
        },
        emailTemplates: dbTemplates.map(
          (t): EmailTemplate => ({
            id: t.id,
            type: t.type,
            isEnabled: Boolean(t.is_enabled),
            subject: t.subject ?? "",
            body: t.body ?? "",
          })
        ),
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

  const setWeeklyDay = useCallback(async (day: DayKey, patch: WeeklyDaySchedule) => {
    // Optimistic UI update, then hard-confirm in DB.
    setState((prev) => ({ ...prev, weekly: { ...prev.weekly, [day]: patch } }));
    if (!businessId) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[WavonProvider] setWeeklyDay skipped (no businessId yet)", { day, patch });
      }
      return { ok: false, error: "Business non initialisé (businessId manquant)." };
    }
    const dayOfWeek: Record<DayKey, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };

    const normalizeSegments = (segs: WeeklyDaySchedule["segments"]) => {
      const norm = (segs ?? [])
        .map((s) => ({ start: String(s.start || ""), end: String(s.end || "") }))
        .filter((s) => s.start && s.end)
        .filter((s) => {
          const [sh, sm] = s.start.split(":").map(Number);
          const [eh, em] = s.end.split(":").map(Number);
          if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return false;
          return eh * 60 + em > sh * 60 + sm;
        })
        .sort((a, b) => a.start.localeCompare(b.start));
      return norm;
    };

    const payload = {
      business_id: businessId,
      day_of_week: dayOfWeek[day],
      is_open: Boolean(patch.enabled),
      // Keep segments even when closed to avoid losing configuration.
      segments: normalizeSegments(patch.segments),
    };

    const { data, error } = await supabase
      .from("wavon_availability_rules")
      .upsert(payload, { onConflict: "business_id,day_of_week" })
      .select("day_of_week,is_open,segments")
      .single();

    if (process.env.NODE_ENV !== "production") {
      console.debug("[WavonProvider] setWeeklyDay DB write", {
        businessId,
        day,
        payload,
        ok: !error,
        error: error?.message ?? null,
        returned: data ?? null,
      });
    }

    if (error) {
      // Hard-reload this business weekly rules to avoid UI drifting from DB.
      const { data: rows, error: readErr } = await supabase
        .from("wavon_availability_rules")
        .select("day_of_week,is_open,segments")
        .eq("business_id", businessId);

      if (process.env.NODE_ENV !== "production") {
        console.error("[WavonProvider] setWeeklyDay failed", {
          businessId,
          day,
          error: error.message,
          readErr: readErr?.message ?? null,
        });
      }

      if (!readErr && Array.isArray(rows)) {
        setState((prev) => {
          const weekly = { ...prev.weekly };
          for (const r of rows as unknown as Array<{
            day_of_week: number;
            is_open: boolean;
            segments: unknown;
          }>) {
            const k = dayKeyFromDow(r.day_of_week);
            weekly[k] = { enabled: Boolean(r.is_open), segments: segmentsFromJson(r.segments) };
          }
          return { ...prev, weekly };
        });
      }

      return { ok: false, error: error.message };
    }

    // Confirm state with DB-returned row (source of truth).
    if (data) {
      const k = dayKeyFromDow(Number((data as any).day_of_week));
      setState((prev) => ({
        ...prev,
        weekly: {
          ...prev.weekly,
          [k]: {
            enabled: Boolean((data as any).is_open),
            segments: segmentsFromJson((data as any).segments),
          },
        },
      }));
    }

    return { ok: true };
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
          is_active: s.isActive,
          is_public: s.isPublic,
          color: s.color ?? null,
          buffer_before_minutes: s.bufferBeforeMin ?? 0,
          buffer_after_minutes: s.bufferAfterMin ?? 0,
          booking_notice_hours: s.bookingNoticeHours ?? null,
          sort_order: s.sortOrder ?? 0,
        })
        .select(
          "id,business_id,name,duration_minutes,price,description,is_active,is_public,color,buffer_before_minutes,buffer_after_minutes,booking_notice_hours,sort_order"
        )
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
            isActive: Boolean(row.is_active),
            isPublic: Boolean(row.is_public),
            color: row.color,
            bufferBeforeMin: Math.max(0, row.buffer_before_minutes ?? 0),
            bufferAfterMin: Math.max(0, row.buffer_after_minutes ?? 0),
            bookingNoticeHours: row.booking_notice_hours,
            sortOrder: row.sort_order ?? 0,
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
        ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
        ...(patch.isPublic !== undefined ? { is_public: patch.isPublic } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
        ...(patch.bufferBeforeMin !== undefined ? { buffer_before_minutes: patch.bufferBeforeMin } : {}),
        ...(patch.bufferAfterMin !== undefined ? { buffer_after_minutes: patch.bufferAfterMin } : {}),
        ...(patch.bookingNoticeHours !== undefined ? { booking_notice_hours: patch.bookingNoticeHours } : {}),
        ...(patch.sortOrder !== undefined ? { sort_order: patch.sortOrder } : {}),
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
          durationMin: service.durationMin,
          bufferBeforeMin: service.bufferBeforeMin ?? 0,
          bufferAfterMin: service.bufferAfterMin ?? 0,
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
          duration_minutes: res.durationMin,
          buffer_before_minutes: res.bufferBeforeMin,
          buffer_after_minutes: res.bufferAfterMin,
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
          durationMin: service.durationMin,
          bufferBeforeMin: service.bufferBeforeMin ?? 0,
          bufferAfterMin: service.bufferAfterMin ?? 0,
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
            payload.duration_minutes = svc.durationMin;
            payload.buffer_before_minutes = svc.bufferBeforeMin ?? 0;
            payload.buffer_after_minutes = svc.bufferAfterMin ?? 0;
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
      if (patch.email !== undefined) businessPatch.email = patch.email.trim() || null;
      if (patch.businessType !== undefined) businessPatch.business_type = patch.businessType.trim() || null;
      if (patch.website !== undefined) businessPatch.website = patch.website.trim() || null;
      if (patch.city !== undefined) businessPatch.city = patch.city.trim() || null;
      if (patch.postalCode !== undefined) businessPatch.postal_code = patch.postalCode.trim() || null;
      if (patch.publicDescription !== undefined) businessPatch.public_description = patch.publicDescription.trim() || null;
      if (patch.publicWelcomeMessage !== undefined) businessPatch.public_welcome_message = patch.publicWelcomeMessage.trim() || null;
      if (patch.publicDisplayName !== undefined) businessPatch.public_display_name = patch.publicDisplayName.trim() || null;
      if (patch.publicLogoUrl !== undefined) businessPatch.public_logo_url = patch.publicLogoUrl.trim() || null;
      if (patch.publicLogoPath !== undefined) businessPatch.public_logo_path = patch.publicLogoPath.trim() || null;
      if (patch.publicCoverUrl !== undefined) businessPatch.public_cover_url = patch.publicCoverUrl.trim() || null;
      if (patch.publicCoverPath !== undefined) businessPatch.public_cover_path = patch.publicCoverPath.trim() || null;
      if (patch.publicShowPhone !== undefined) businessPatch.public_show_phone = Boolean(patch.publicShowPhone);
      if (patch.publicShowAddress !== undefined) businessPatch.public_show_address = Boolean(patch.publicShowAddress);
      if (patch.publicShowDescription !== undefined) businessPatch.public_show_description = Boolean(patch.publicShowDescription);
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
      if (patch.minNoticeHours !== undefined) {
        settingsPatch.minimum_notice_hours = patch.minNoticeHours;
      }
      if (patch.maxDaysInAdvance !== undefined) settingsPatch.maximum_days_in_advance = patch.maxDaysInAdvance;
      if (patch.slotIntervalMinutes !== undefined) settingsPatch.slot_interval_minutes = patch.slotIntervalMinutes;
      if (patch.minGapBetweenBookingsMinutes !== undefined) {
        settingsPatch.minimum_gap_between_bookings = patch.minGapBetweenBookingsMinutes;
      }
      if (patch.allowCancellation !== undefined) settingsPatch.allow_cancellation = patch.allowCancellation;
      if (patch.cancellationDeadlineHours !== undefined) {
        settingsPatch.cancellation_deadline_hours = patch.cancellationDeadlineHours;
      }
      if (patch.allowReschedule !== undefined) settingsPatch.allow_reschedule = patch.allowReschedule;
      if (patch.rescheduleDeadlineHours !== undefined) {
        settingsPatch.reschedule_deadline_hours = patch.rescheduleDeadlineHours;
      }
      if (patch.sameDayBookingAllowed !== undefined) {
        settingsPatch.same_day_booking_allowed = patch.sameDayBookingAllowed;
      }
      if (patch.confirmationMode !== undefined) {
        settingsPatch.auto_confirm_reservations = patch.confirmationMode === "auto";
      }
      if (patch.publicAfterBookingMessage !== undefined) {
        settingsPatch.public_after_booking_message = patch.publicAfterBookingMessage.trim();
      }
      if (Object.keys(settingsPatch).length > 0) {
        await supabase.from("wavon_settings").update(settingsPatch).eq("business_id", businessId);
      }
    })();
  }, [businessId]);

  const upsertEmailTemplate = useCallback(
    (input: { type: EmailTemplateType; isEnabled: boolean; subject: string; body: string }) => {
      if (!businessId) return;
      setState((prev) => {
        const cur = prev.emailTemplates.find((t) => t.type === input.type) ?? null;
        const next: EmailTemplate = cur
          ? { ...cur, isEnabled: input.isEnabled, subject: input.subject, body: input.body }
          : {
              id: crypto.randomUUID(),
              type: input.type,
              isEnabled: input.isEnabled,
              subject: input.subject,
              body: input.body,
            };
        return {
          ...prev,
          emailTemplates: [
            ...prev.emailTemplates.filter((t) => t.type !== input.type),
            next,
          ].sort((a, b) => a.type.localeCompare(b.type)),
        };
      });

      void supabase.from("wavon_email_templates").upsert(
        {
          business_id: businessId,
          type: input.type,
          is_enabled: input.isEnabled,
          subject: input.subject,
          body: input.body,
        },
        { onConflict: "business_id,type" }
      );
    },
    [businessId]
  );

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
      businessId,
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
      upsertEmailTemplate,
      replaceWhatsAppMessages,
    }),
    [
      ready,
      state,
      businessId,
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
      upsertEmailTemplate,
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
