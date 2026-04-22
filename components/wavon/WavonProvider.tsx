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
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import {
  EMPTY_SUBSCRIPTION_SNAPSHOT,
  type BlockedSlot,
  type Client,
  type CustomDaySlot,
  type DayKey,
  type Employee,
  type EmailTemplate,
  type EmailTemplateType,
  type Reservation,
  type ReservationStatus,
  type Service,
  type WeeklyDaySchedule,
  type WavonState,
} from "@/lib/wavon/types";
import { parseSubscriptionPlan } from "@/lib/subscription/access";
import { supabase } from "@/lib/supabase/client";
import { normalizeBusinessCurrency } from "@/lib/utils/formatPrice";
import { normalizePublicSlugInput, validatePublicSlugFormat } from "@/lib/wavon/public-slug";

const SERVICE_DESCRIPTION_DB_MAX = 300;
const PUBLIC_DISPLAY_NAME_MAX = 60;
const PUBLIC_WELCOME_MAX = 200;
const PUBLIC_DESCRIPTION_MAX = 300;

function clipServiceDescription(text: string): string {
  return text.trim().slice(0, SERVICE_DESCRIPTION_DB_MAX);
}

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
  currency: string | null;
  notify_owner_on_new_reservation: boolean | null;
  notify_owner_on_cancellation: boolean | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

type DbSettings = {
  business_id: string;
  minimum_notice_hours: number;
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
  employee_ids?: string[] | null;
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
  private_note: string | null;
};

type DbReservation = {
  id: string;
  business_id: string;
  client_id: string | null;
  client_name: string;
  service_id: string;
  employee_id?: string | null;
  start_at: string;
  end_at: string;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  status: "confirmed" | "cancelled" | "pending";
  created_at: string;
  notes: string | null;
};

type DbBlockedSlot = {
  id: string;
  business_id: string;
  employee_id: string | null;
  start_at: string;
  end_at: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

function blockedSlotFromDbRow(s: DbBlockedSlot): BlockedSlot {
  return {
    id: s.id,
    businessId: s.business_id,
    employeeId: s.employee_id ?? null,
    start: s.start_at,
    end: s.end_at,
    reason: s.reason ?? null,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

type DbWeeklyAvailability = {
  business_id: string;
  day_of_week: number;
  employee_id?: string | null;
  is_open: boolean;
  segments: unknown;
};

type DbCustomDay = {
  business_id: string;
  employee_id?: string | null;
  day: string; // date
  segments: unknown;
};

type DbBlockedDate = {
  business_id: string;
  employee_id?: string | null;
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

type DbEmployee = {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  photo_url: string | null;
  color: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
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
    subscription: { ...EMPTY_SUBSCRIPTION_SNAPSHOT },
    weekly: emptyWeekly(),
    availabilityMode: "fixed",
    customDays: [],
    blockedDates: [],
    blockedSlots: [],
    services: [],
    clients: [],
    reservations: [],
    settings: {
      businessName: "",
      currency: "CHF",
      address: "",
      phone: "",
      publicSlug: "",
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
      notifyOwnerOnNewReservation: true,
      notifyOwnerOnCancellation: true,
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
  availabilityEmployeeId: string | null;
  setAvailabilityEmployeeId: (employeeId: string | null) => Promise<void>;
  upsertEmployee: (input: {
    id?: string;
    name: string;
    email: string | null;
    phone: string | null;
    photoUrl: string | null;
    color: string;
    isActive: boolean;
    displayOrder: number;
  }) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;
  deleteEmployee: (employeeId: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  refreshServices: () => Promise<void>;
  setWeeklyDay: (
    day: DayKey,
    patch: WeeklyDaySchedule
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  setAvailabilityMode: (mode: WavonState["availabilityMode"]) => void;
  setCustomDays: (days: CustomDaySlot[]) => void;
  setBlockedDates: (dates: string[]) => void;
  addService: (s: Omit<Service, "id">) => void;
  updateService: (id: string, patch: Partial<Service>) => void;
  updateServiceChecked: (id: string, patch: Partial<Service>) => Promise<{ ok: true } | { ok: false; error: string }>;
  deleteService: (id: string) => void;
  addClient: (c: Omit<Client, "id">) => void;
  updateClient: (id: string, patch: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addReservation: (input: {
    clientId: string | null;
    clientName: string;
    serviceId: string;
    employeeId?: string | null;
    start: Date;
    notes?: string;
  }) => { ok: true; id: string } | { ok: false; error: string };
  updateReservation: (
    id: string,
    patch: Partial<{
      clientId: string | null;
      clientName: string;
      serviceId: string;
      employeeId: string | null;
      start: Date;
      status: ReservationStatus;
      notes: string;
    }>
  ) => { ok: true } | { ok: false; error: string };
  deleteReservation: (id: string) => Promise<void>;
  addBlockedSlot: (input: {
    employeeId: string | null;
    start: Date;
    end: Date;
    reason: string | null;
  }) => Promise<{ ok: true; id: string } | { ok: false; error: string }>;
  updateBlockedSlot: (
    id: string,
    patch: Partial<{
      employeeId: string | null;
      start: Date;
      end: Date;
      reason: string | null;
    }>
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  deleteBlockedSlot: (id: string) => Promise<{ ok: true } | { ok: false; error: string }>;
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
  const [availabilityEmployeeId, setAvailabilityEmployeeIdState] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setReady(false);
      setBusinessId(null);
      setState(createEmptyState());

      // Business row should exist thanks to DB trigger; keep a safe fallback.
      const { data: business, error: businessErr } = await supabase
        .from(WavonDbTable.businesses)
        .select(
          "id,user_id,business_name,business_type,email,public_slug,website,phone,address,city,postal_code,public_description,public_welcome_message,public_display_name,public_logo_url,public_logo_path,public_cover_url,public_cover_path,public_show_phone,public_show_address,public_show_description,currency,notify_owner_on_new_reservation,notify_owner_on_cancellation,stripe_customer_id,stripe_subscription_id,subscription_status,subscription_plan,trial_ends_at,current_period_end,cancel_at_period_end"
        )
        .eq("user_id", userId)
        .maybeSingle();
      if (businessErr) throw businessErr;

      const ensuredBusiness: DbBusiness =
        (business as DbBusiness | null) ??
        (await (async () => {
          const provisionalSlug = `c-${crypto.randomUUID().replace(/-/g, "").slice(0, 11)}`;
          const { data: created, error } = await supabase
            .from(WavonDbTable.businesses)
            .insert({ user_id: userId, public_slug: provisionalSlug })
            .select(
              "id,user_id,business_name,business_type,email,public_slug,website,phone,address,city,postal_code,public_description,public_welcome_message,public_display_name,public_logo_url,public_logo_path,public_cover_url,public_cover_path,public_show_phone,public_show_address,public_show_description,currency,notify_owner_on_new_reservation,notify_owner_on_cancellation,stripe_customer_id,stripe_subscription_id,subscription_status,subscription_plan,trial_ends_at,current_period_end,cancel_at_period_end"
            )
            .single();
          if (error) throw error;
          return created as DbBusiness;
        })());

      if (cancelled) return;
      setBusinessId(ensuredBusiness.id);

      const employeesRes = await supabase
        .from(WavonDbTable.employees)
        .select("id,business_id,name,email,phone,photo_url,color,is_active,display_order,created_at,updated_at")
        .eq("business_id", ensuredBusiness.id)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (employeesRes.error) throw employeesRes.error;
      const dbEmployees = (employeesRes.data as DbEmployee[]) ?? [];
      const activeEmployees = dbEmployees.filter((e) => Boolean(e.is_active));
      const defaultEmployeeId =
        (activeEmployees[0]?.id ?? dbEmployees[0]?.id ?? null);
      if (!cancelled) {
        setAvailabilityEmployeeIdState(defaultEmployeeId);
      }

      const [
        settingsRes,
        servicesRes,
        clientsRes,
        reservationsRes,
        blockedSlotsRes,
        weeklyRes,
        customDaysRes,
        blockedRes,
        templatesRes,
      ] = await Promise.all([
        supabase
          .from(WavonDbTable.settings)
          .select(
            "business_id,minimum_notice_hours,auto_confirm_reservations,availability_mode,maximum_days_in_advance,slot_interval_minutes,minimum_gap_between_bookings,allow_cancellation,cancellation_deadline_hours,allow_reschedule,reschedule_deadline_hours,same_day_booking_allowed,public_after_booking_message"
          )
          .eq("business_id", ensuredBusiness.id)
          .maybeSingle(),
        supabase
          .from(WavonDbTable.services)
          .select(
            "id,business_id,name,duration_minutes,price,description,is_active,is_public,color,employee_ids,buffer_before_minutes,buffer_after_minutes,booking_notice_hours,sort_order"
          )
          .eq("business_id", ensuredBusiness.id)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
        supabase
          .from(WavonDbTable.clients)
          .select("id,business_id,full_name,email,phone,private_note")
          .eq("business_id", ensuredBusiness.id)
          .order("created_at", { ascending: true }),
        supabase
          .from(WavonDbTable.reservations)
          .select(
            "id,business_id,client_id,client_name,service_id,employee_id,start_at,end_at,duration_minutes,buffer_before_minutes,buffer_after_minutes,status,created_at,notes"
          )
          .eq("business_id", ensuredBusiness.id)
          .order("start_at", { ascending: true }),
        supabase
          .from(WavonDbTable.blockedSlots)
          .select("id,business_id,employee_id,start_at,end_at,reason,created_at,updated_at")
          .eq("business_id", ensuredBusiness.id)
          .order("start_at", { ascending: true }),
        supabase
          .from(WavonDbTable.availabilityRules)
          .select("business_id,employee_id,day_of_week,is_open,segments")
          .eq("business_id", ensuredBusiness.id)
          .eq("employee_id", defaultEmployeeId),
        supabase
          .from(WavonDbTable.customDays)
          .select("business_id,employee_id,day,segments")
          .eq("business_id", ensuredBusiness.id)
          .eq("employee_id", defaultEmployeeId),
        supabase
          .from(WavonDbTable.blockedDates)
          .select("business_id,employee_id,blocked_date")
          .eq("business_id", ensuredBusiness.id)
          .eq("employee_id", defaultEmployeeId),
        supabase
          .from(WavonDbTable.emailTemplates)
          .select("id,business_id,type,is_enabled,subject,body")
          .eq("business_id", ensuredBusiness.id),
      ]);

      if (
        settingsRes.error ||
        servicesRes.error ||
        clientsRes.error ||
        reservationsRes.error ||
        blockedSlotsRes.error ||
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
          blockedSlotsRes.error ||
          weeklyRes.error ||
          customDaysRes.error ||
          blockedRes.error ||
          templatesRes.error
        );
      }

      const dbSettings = (settingsRes.data as DbSettings | null) ?? null;
      const dbServices = (servicesRes.data as (DbService & { employee_ids?: string[] | null })[]) ?? [];
      const dbClients = (clientsRes.data as DbClient[]) ?? [];
      const dbReservations = (reservationsRes.data as DbReservation[]) ?? [];
      const dbBlockedSlots = (blockedSlotsRes.data as DbBlockedSlot[]) ?? [];
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

      const blockedSlots: BlockedSlot[] = dbBlockedSlots.map((s) => blockedSlotFromDbRow(s));

      const next: WavonState = {
        version: 1,
        subscription: {
          status: ensuredBusiness.subscription_status ?? null,
          plan: parseSubscriptionPlan(ensuredBusiness.subscription_plan),
          trialEndsAt: ensuredBusiness.trial_ends_at ?? null,
          currentPeriodEnd: ensuredBusiness.current_period_end ?? null,
          cancelAtPeriodEnd: Boolean(ensuredBusiness.cancel_at_period_end),
        },
        employees: dbEmployees.map(
          (e): Employee => ({
            id: e.id,
            businessId: e.business_id,
            name: e.name,
            email: e.email,
            phone: e.phone,
            photoUrl: e.photo_url,
            color: e.color,
            isActive: Boolean(e.is_active),
            displayOrder: e.display_order ?? 0,
            createdAt: e.created_at,
            updatedAt: e.updated_at,
          })
        ),
        weekly,
        availabilityMode: dbSettings?.availability_mode ?? "fixed",
        customDays,
        blockedDates: dbBlocked.map((r) => String(r.blocked_date)).sort(),
        blockedSlots,
        services: dbServices.map((s) => ({
          id: s.id,
          name: s.name,
          durationMin: s.duration_minutes,
          price: s.price,
          description: s.description ?? "",
          isActive: Boolean(s.is_active),
          isPublic: Boolean(s.is_public),
          color: s.color,
          employeeIds: Array.isArray((s as { employee_ids?: unknown }).employee_ids)
            ? (((s as { employee_ids?: unknown }).employee_ids ?? []) as string[])
            : [],
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
          privateNote: c.private_note ?? "",
        })),
        reservations: dbReservations.map((r) => ({
          id: r.id,
          clientId: r.client_id,
          clientName: r.client_name || "Client",
          serviceId: r.service_id,
          employeeId: r.employee_id ?? null,
          start: r.start_at,
          end: r.end_at,
          durationMin: r.duration_minutes ?? 0,
          bufferBeforeMin: r.buffer_before_minutes ?? 0,
          bufferAfterMin: r.buffer_after_minutes ?? 0,
          status: r.status,
          createdAt: r.created_at,
          notes: r.notes ?? "",
        })),
        settings: {
          businessName: ensuredBusiness.business_name ?? "",
          currency: normalizeBusinessCurrency(ensuredBusiness.currency),
          address: ensuredBusiness.address ?? "",
          phone: ensuredBusiness.phone ?? "",
          publicSlug: ensuredBusiness.public_slug ?? "",
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
          notifyOwnerOnNewReservation: ensuredBusiness.notify_owner_on_new_reservation ?? true,
          notifyOwnerOnCancellation: ensuredBusiness.notify_owner_on_cancellation ?? true,
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
        console.error("[WaevonProvider] bootstrap error:", err);
      }
      if (!cancelled) {
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const setWeeklyDay = useCallback(
    async (
      day: DayKey,
      patch: WeeklyDaySchedule
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
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
      employee_id: availabilityEmployeeId,
      day_of_week: dayOfWeek[day],
      is_open: Boolean(patch.enabled),
      // Keep segments even when closed to avoid losing configuration.
      segments: normalizeSegments(patch.segments),
    };

    const { data, error } = await supabase
      .from(WavonDbTable.availabilityRules)
      .upsert(payload, { onConflict: "business_id,employee_id,day_of_week" })
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
        .from(WavonDbTable.availabilityRules)
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
      const row = data as unknown as {
        day_of_week: number;
        is_open: boolean;
        segments: unknown;
      };
      const k = dayKeyFromDow(Number(row.day_of_week));
      setState((prev) => ({
        ...prev,
        weekly: {
          ...prev.weekly,
          [k]: {
            enabled: Boolean(row.is_open),
            segments: segmentsFromJson(row.segments),
          },
        },
      }));
    }

    return { ok: true };
    },
    [businessId, availabilityEmployeeId]
  );

  const setAvailabilityMode = useCallback((mode: WavonState["availabilityMode"]) => {
    setState((prev) => ({ ...prev, availabilityMode: mode }));
    if (!businessId) return;
    void supabase
      .from(WavonDbTable.settings)
      .update({ availability_mode: mode })
      .eq("business_id", businessId);
  }, [businessId]);

  const setCustomDays = useCallback((days: CustomDaySlot[]) => {
    setState((prev) => ({ ...prev, customDays: days }));
    if (!businessId || !availabilityEmployeeId) return;
    // Simple sync: replace all (acceptable for now; can be optimized later)
    void (async () => {
      await supabase
        .from(WavonDbTable.customDays)
        .delete()
        .eq("business_id", businessId)
        .eq("employee_id", availabilityEmployeeId);
      if (days.length === 0) return;
      await supabase.from(WavonDbTable.customDays).insert(
        days.map((d) => ({
          business_id: businessId,
          employee_id: availabilityEmployeeId,
          day: d.date,
          segments: d.segments,
        }))
      );
    })();
  }, [businessId, availabilityEmployeeId]);

  const setBlockedDates = useCallback((dates: string[]) => {
    setState((prev) => ({ ...prev, blockedDates: dates }));
    if (!businessId || !availabilityEmployeeId) return;
    void (async () => {
      await supabase
        .from(WavonDbTable.blockedDates)
        .delete()
        .eq("business_id", businessId)
        .eq("employee_id", availabilityEmployeeId);
      if (dates.length === 0) return;
      await supabase.from(WavonDbTable.blockedDates).insert(
        dates.map((d) => ({
          business_id: businessId,
          employee_id: availabilityEmployeeId,
          blocked_date: d,
        }))
      );
    })();
  }, [businessId, availabilityEmployeeId]);

  const addService = useCallback((s: Omit<Service, "id">) => {
    if (!businessId) return;
    void (async () => {
      const { data, error } = await supabase
        .from(WavonDbTable.services)
        .insert({
          business_id: businessId,
          name: s.name,
          duration_minutes: s.durationMin,
          price: s.price,
          description: clipServiceDescription(s.description ?? ""),
          is_active: s.isActive,
          is_public: s.isPublic,
          color: s.color ?? null,
          employee_ids: (s.employeeIds ?? []).length ? (s.employeeIds ?? []) : [],
          buffer_before_minutes: s.bufferBeforeMin ?? 0,
          buffer_after_minutes: s.bufferAfterMin ?? 0,
          booking_notice_hours: s.bookingNoticeHours ?? null,
          sort_order: s.sortOrder ?? 0,
        })
        .select(
          "id,business_id,name,duration_minutes,price,description,is_active,is_public,color,employee_ids,buffer_before_minutes,buffer_after_minutes,booking_notice_hours,sort_order"
        )
        .single();
      if (error) throw error;
      const row = data as DbService & { employee_ids?: string[] | null };
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
            employeeIds: (row.employee_ids ?? []) as string[],
            bufferBeforeMin: Math.max(0, row.buffer_before_minutes ?? 0),
            bufferAfterMin: Math.max(0, row.buffer_after_minutes ?? 0),
            bookingNoticeHours: row.booking_notice_hours,
            sortOrder: row.sort_order ?? 0,
          },
        ],
      }));
    })();
  }, [businessId]);

  const refreshServices = useCallback(async () => {
    if (!businessId) return;
    const { data, error } = await supabase
      .from(WavonDbTable.services)
      .select(
        "id,business_id,name,duration_minutes,price,description,is_active,is_public,color,employee_ids,buffer_before_minutes,buffer_after_minutes,booking_notice_hours,sort_order"
      )
      .eq("business_id", businessId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[WavonProvider] refreshServices error:", error.message);
      }
      return;
    }
    const rows = (data as (DbService & { employee_ids?: string[] | null })[]) ?? [];
    setState((prev) => ({
      ...prev,
      services: rows.map((s) => ({
        id: s.id,
        name: s.name,
        durationMin: s.duration_minutes,
        price: s.price,
        description: s.description ?? "",
        isActive: Boolean(s.is_active),
        isPublic: Boolean(s.is_public),
        color: s.color,
        employeeIds: (s.employee_ids ?? []) as string[],
        bufferBeforeMin: Math.max(0, s.buffer_before_minutes ?? 0),
        bufferAfterMin: Math.max(0, s.buffer_after_minutes ?? 0),
        bookingNoticeHours: s.booking_notice_hours,
        sortOrder: s.sort_order ?? 0,
      })),
    }));
  }, [businessId]);

  const updateServiceChecked = useCallback(
    async (id: string, patch: Partial<Service>): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!businessId) return { ok: false, error: "Compte non initialisé." };

      const nextPatch =
        patch.description !== undefined
          ? { ...patch, description: clipServiceDescription(patch.description) }
          : patch;

      // Optimistic update
      setState((prev) => ({
        ...prev,
        services: prev.services.map((x) => (x.id === id ? { ...x, ...nextPatch } : x)),
      }));

      const { error } = await supabase
        .from(WavonDbTable.services)
        .update({
          ...(nextPatch.name !== undefined ? { name: nextPatch.name } : {}),
          ...(nextPatch.durationMin !== undefined ? { duration_minutes: nextPatch.durationMin } : {}),
          ...(nextPatch.price !== undefined ? { price: nextPatch.price } : {}),
          ...(nextPatch.description !== undefined ? { description: nextPatch.description } : {}),
          ...(nextPatch.isActive !== undefined ? { is_active: nextPatch.isActive } : {}),
          ...(nextPatch.isPublic !== undefined ? { is_public: nextPatch.isPublic } : {}),
          ...(nextPatch.color !== undefined ? { color: nextPatch.color } : {}),
          ...(nextPatch.employeeIds !== undefined
            ? { employee_ids: nextPatch.employeeIds.length ? nextPatch.employeeIds : [] }
            : {}),
          ...(nextPatch.bufferBeforeMin !== undefined ? { buffer_before_minutes: nextPatch.bufferBeforeMin } : {}),
          ...(nextPatch.bufferAfterMin !== undefined ? { buffer_after_minutes: nextPatch.bufferAfterMin } : {}),
          ...(nextPatch.bookingNoticeHours !== undefined ? { booking_notice_hours: nextPatch.bookingNoticeHours } : {}),
          ...(nextPatch.sortOrder !== undefined ? { sort_order: nextPatch.sortOrder } : {}),
        })
        .eq("id", id)
        .eq("business_id", businessId);

      if (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[WavonProvider] updateServiceChecked failed", {
            businessId,
            id,
            error: error.message,
          });
        }
        // Resync local state with DB to avoid divergence
        await refreshServices();
        return { ok: false, error: error.message };
      }

      return { ok: true };
    },
    [businessId, refreshServices]
  );

  const updateService = useCallback((id: string, patch: Partial<Service>) => {
    const nextPatch =
      patch.description !== undefined
        ? { ...patch, description: clipServiceDescription(patch.description) }
        : patch;
    setState((prev) => ({
      ...prev,
      services: prev.services.map((x) => (x.id === id ? { ...x, ...nextPatch } : x)),
    }));
    if (!businessId) return;
    void updateServiceChecked(id, nextPatch);
  }, [businessId, updateServiceChecked]);

  const deleteService = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      services: prev.services.filter((x) => x.id !== id),
      reservations: prev.reservations.filter((r) => r.serviceId !== id),
    }));
    if (!businessId) return;
    void supabase.from(WavonDbTable.services).delete().eq("id", id).eq("business_id", businessId);
  }, [businessId]);

  const addClient = useCallback((c: Omit<Client, "id">) => {
    if (!businessId) return;
    void (async () => {
      const { data, error } = await supabase
        .from(WavonDbTable.clients)
        .insert({
          business_id: businessId,
          full_name: c.name,
          phone: c.phone || null,
          email: c.email || null,
          private_note: c.privateNote?.trim() || null,
        })
        .select("id,business_id,full_name,email,phone,private_note")
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
            privateNote: row.private_note ?? "",
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
      .from(WavonDbTable.clients)
      .update({
        ...(patch.name !== undefined ? { full_name: patch.name } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone || null } : {}),
        ...(patch.email !== undefined ? { email: patch.email || null } : {}),
        ...(patch.privateNote !== undefined
          ? { private_note: patch.privateNote.trim() || null }
          : {}),
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
    void supabase.from(WavonDbTable.clients).delete().eq("id", id).eq("business_id", businessId);
  }, [businessId]);

  const addReservation = useCallback(
    (input: {
      clientId: string | null;
      clientName: string;
      serviceId: string;
      employeeId?: string | null;
      start: Date;
      notes?: string;
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
        const employeeId = input.employeeId ?? null;
        const end = addMinutes(input.start, service.durationMin);
        const status: ReservationStatus =
          prev.settings.confirmationMode === "auto" ? "confirmed" : "pending";
        const err = validateBooking({
          state: prev,
          service,
          start: input.start,
          end,
          employeeId,
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
          employeeId,
          start: input.start.toISOString(),
          end: end.toISOString(),
          durationMin: service.durationMin,
          bufferBeforeMin: service.bufferBeforeMin ?? 0,
          bufferAfterMin: service.bufferAfterMin ?? 0,
          status,
          createdAt: new Date().toISOString(),
          notes: (input.notes ?? "").trim(),
        };
        outcome.current = { kind: "ok", reservation: res };
        return { ...prev, reservations: [...prev.reservations, res] };
      });

      if (outcome.current.kind === "err") {
        return { ok: false, error: outcome.current.message };
      }

      const res = outcome.current.reservation;
      void (async () => {
        const { error } = await supabase.from(WavonDbTable.reservations).insert({
          id: res.id,
          business_id: businessId,
          client_id: res.clientId,
          client_name: res.clientName.trim(),
          service_id: res.serviceId,
          employee_id: res.employeeId ?? null,
          start_at: res.start,
          end_at: res.end,
          duration_minutes: res.durationMin,
          buffer_before_minutes: res.bufferBeforeMin,
          buffer_after_minutes: res.bufferAfterMin,
          status: res.status,
          notes: res.notes || null,
        });
        if (error) {
          if (process.env.NODE_ENV !== "production") {
            console.error("[WaevonProvider] insert reservation:", error.message);
          }
          return;
        }
        const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "";
        const origin = base || (typeof window !== "undefined" ? window.location.origin : "");
        if (!origin) return;
        try {
          await fetch(`${origin}/api/emails/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "new_booking",
              reservationId: res.id,
              businessId,
            }),
          });
        } catch {
          /* email ne doit pas bloquer */
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
        employeeId: string | null;
        start: Date;
        status: ReservationStatus;
        notes: string;
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
        const employeeId =
          patch.employeeId !== undefined ? patch.employeeId : (cur.employeeId ?? null);
        const start = patch.start ?? new Date(cur.start);
        const end = addMinutes(start, service.durationMin);
        const next: Reservation = {
          ...cur,
          clientId: patch.clientId !== undefined ? patch.clientId : cur.clientId,
          clientName: patch.clientName?.trim() ?? cur.clientName,
          serviceId,
          employeeId,
          start: start.toISOString(),
          end: end.toISOString(),
          durationMin: service.durationMin,
          bufferBeforeMin: service.bufferBeforeMin ?? 0,
          bufferAfterMin: service.bufferAfterMin ?? 0,
          status: patch.status ?? cur.status,
          notes: patch.notes !== undefined ? patch.notes : cur.notes,
        };
        const err = validateBooking({
          state: prev,
          service,
          start: new Date(next.start),
          end: new Date(next.end),
          employeeId,
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
        if (patch.employeeId !== undefined) payload.employee_id = patch.employeeId || null;
        if (patch.status !== undefined) payload.status = patch.status;
        if (patch.notes !== undefined) payload.notes = patch.notes.trim() || null;
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
          .from(WavonDbTable.reservations)
          .update(payload)
          .eq("id", id)
          .eq("business_id", businessId);

        // Email d'annulation au client si le commerçant annule depuis le dashboard
        if (patch.status === "cancelled") {
          void fetch("/api/emails/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "cancellation_by_merchant",
              reservationId: id,
              businessId,
            }),
          }).catch(() => {});
        }
      }
      return errorMsg ? { ok: false, error: errorMsg } : { ok: true };
    },
       [businessId, state.services, state.reservations]
  );

  const setAvailabilityEmployeeId = useCallback(
    async (employeeId: string | null) => {
      setAvailabilityEmployeeIdState(employeeId);
      if (!businessId || !employeeId) return;
      const [weeklyRes, customDaysRes, blockedRes] = await Promise.all([
        supabase
          .from(WavonDbTable.availabilityRules)
          .select("day_of_week,is_open,segments")
          .eq("business_id", businessId)
          .eq("employee_id", employeeId),
        supabase
          .from(WavonDbTable.customDays)
          .select("day,segments")
          .eq("business_id", businessId)
          .eq("employee_id", employeeId),
        supabase
          .from(WavonDbTable.blockedDates)
          .select("blocked_date")
          .eq("business_id", businessId)
          .eq("employee_id", employeeId),
      ]);
      if (weeklyRes.error || customDaysRes.error || blockedRes.error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[WavonProvider] load availability by employee failed", {
            employeeId,
            weekly: weeklyRes.error?.message ?? null,
            custom: customDaysRes.error?.message ?? null,
            blocked: blockedRes.error?.message ?? null,
          });
        }
        return;
      }
      const baseWeekly = emptyWeekly();
      const weekly = { ...baseWeekly };
      for (const row of ((weeklyRes.data as DbWeeklyAvailability[]) ?? [])) {
        const k = dayKeyFromDow(row.day_of_week);
        weekly[k] = { enabled: Boolean(row.is_open), segments: segmentsFromJson(row.segments) };
      }
      const customDays: CustomDaySlot[] = (((customDaysRes.data as DbCustomDay[]) ?? [])).map((r) => ({
        date: String(r.day),
        segments: segmentsFromJson(r.segments),
      }));
      const blockedDates = (((blockedRes.data as DbBlockedDate[]) ?? [])).map((r) => String(r.blocked_date)).sort();
      setState((prev) => ({ ...prev, weekly, customDays, blockedDates }));
    },
    [businessId]
  );

  const upsertEmployee = useCallback(
    async (input: {
      id?: string;
      name: string;
      email: string | null;
      phone: string | null;
      photoUrl: string | null;
      color: string;
      isActive: boolean;
      displayOrder: number;
    }): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
      if (!businessId) return { ok: false, error: "Compte non initialisé." };
      const payload = {
        ...(input.id ? { id: input.id } : {}),
        business_id: businessId,
        name: input.name.trim(),
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        photo_url: input.photoUrl?.trim() || null,
        color: input.color,
        is_active: Boolean(input.isActive),
        display_order: input.displayOrder ?? 0,
      };
      const { data, error } = await supabase
        .from(WavonDbTable.employees)
        .upsert(payload, { onConflict: "id" })
        .select("id,business_id,name,email,phone,photo_url,color,is_active,display_order,created_at,updated_at")
        .single();
      if (error) return { ok: false, error: error.message };
      const row = data as DbEmployee;
      setState((prev) => {
        const nextEmployees = [
          ...(((prev.employees ?? []) as Employee[]).filter((e) => e.id !== row.id)),
          {
            id: row.id,
            businessId: row.business_id,
            name: row.name,
            email: row.email,
            phone: row.phone,
            photoUrl: row.photo_url,
            color: row.color,
            isActive: Boolean(row.is_active),
            displayOrder: row.display_order ?? 0,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          } satisfies Employee,
        ].sort((a, b) => (a.displayOrder - b.displayOrder) || a.createdAt.localeCompare(b.createdAt));
        return { ...prev, employees: nextEmployees };
      });
      if (!availabilityEmployeeId && Boolean(row.is_active)) {
        setAvailabilityEmployeeIdState(row.id);
      }
      return { ok: true, id: row.id };
    },
    [businessId, availabilityEmployeeId]
  );

  const deleteEmployee = useCallback(
    async (employeeId: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!businessId) return { ok: false, error: "Compte non initialisé." };
      const { error } = await supabase
        .from(WavonDbTable.employees)
        .delete()
        .eq("business_id", businessId)
        .eq("id", employeeId);
      if (error) return { ok: false, error: error.message };
      setState((prev) => ({
        ...prev,
        employees: (prev.employees ?? []).filter((e) => e.id !== employeeId),
      }));
      if (availabilityEmployeeId === employeeId) {
        const remaining = (state.employees ?? []).filter((e) => e.id !== employeeId && e.isActive);
        const next = remaining[0]?.id ?? null;
        void setAvailabilityEmployeeId(next);
      }
      return { ok: true };
    },
    [businessId, availabilityEmployeeId, setAvailabilityEmployeeId, state.employees]
  );

  const deleteReservation = useCallback(
    async (id: string) => {
      const snap = state.reservations.find((r) => r.id === id);
      if (businessId && snap && snap.status !== "cancelled") {
        const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") || "";
        const origin = base || (typeof window !== "undefined" ? window.location.origin : "");
        if (origin) {
          try {
            await fetch(`${origin}/api/emails/send`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "cancellation_by_merchant",
                reservationId: id,
                businessId,
              }),
            });
          } catch {
            /* email ne doit pas bloquer */
          }
        }
      }
      setState((prev) => ({
        ...prev,
        reservations: prev.reservations.filter((r) => r.id !== id),
      }));
      if (!businessId) return;
      await supabase.from(WavonDbTable.reservations).delete().eq("id", id).eq("business_id", businessId);
    },
    [businessId, state.reservations]
  );

  const addBlockedSlot = useCallback(
    async (input: {
      employeeId: string | null;
      start: Date;
      end: Date;
      reason: string | null;
    }): Promise<{ ok: true; id: string } | { ok: false; error: string }> => {
      if (!businessId) return { ok: false, error: "Compte non initialisé." };
      if (!(input.end > input.start)) {
        return { ok: false, error: "La fin doit être après le début." };
      }
      const reason = input.reason?.trim() ? input.reason.trim().slice(0, 80) : null;

      const { data, error } = await supabase
        .from(WavonDbTable.blockedSlots)
        .insert({
          business_id: businessId,
          employee_id: input.employeeId,
          start_at: input.start.toISOString(),
          end_at: input.end.toISOString(),
          reason,
        })
        .select("id,business_id,employee_id,start_at,end_at,reason,created_at,updated_at")
        .single();

      if (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[WavonProvider] blocked_slots insert", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
        }
        return {
          ok: false,
          error:
            error.message ||
            "Impossible d’enregistrer le blocage (vérifie la migration SQL et les droits RLS).",
        };
      }
      if (!data) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[WavonProvider] blocked_slots insert: réponse vide (souvent RLS ou table absente)");
        }
        return {
          ok: false,
          error:
            "Enregistrement refusé : aucune ligne retournée. Vérifie que la table blocked_slots existe et que les policies RLS autorisent l’insert.",
        };
      }

      const slot = blockedSlotFromDbRow(data as DbBlockedSlot);
      setState((prev) => ({ ...prev, blockedSlots: [...(prev.blockedSlots ?? []), slot] }));
      return { ok: true, id: slot.id };
    },
    [businessId]
  );

  const updateBlockedSlot = useCallback(
    async (
      id: string,
      patch: Partial<{
        employeeId: string | null;
        start: Date;
        end: Date;
        reason: string | null;
      }>
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!businessId) return { ok: false, error: "Compte non initialisé." };

      const payload: Record<string, unknown> = {};
      if (patch.employeeId !== undefined) payload.employee_id = patch.employeeId;
      if (patch.start !== undefined) payload.start_at = patch.start.toISOString();
      if (patch.end !== undefined) payload.end_at = patch.end.toISOString();
      if (patch.reason !== undefined) {
        payload.reason = patch.reason?.trim() ? patch.reason.trim().slice(0, 80) : null;
      }
      if (Object.keys(payload).length === 0) {
        return { ok: true };
      }

      const { data, error } = await supabase
        .from(WavonDbTable.blockedSlots)
        .update(payload)
        .eq("id", id)
        .eq("business_id", businessId)
        .select("id,business_id,employee_id,start_at,end_at,reason,created_at,updated_at")
        .single();

      if (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[WavonProvider] blocked_slots update", {
            message: error.message,
            code: error.code,
          });
        }
        return { ok: false, error: error.message || "Mise à jour impossible." };
      }
      if (!data) {
        return { ok: false, error: "Blocage introuvable ou déjà supprimé." };
      }

      const slot = blockedSlotFromDbRow(data as DbBlockedSlot);
      setState((prev) => ({
        ...prev,
        blockedSlots: (prev.blockedSlots ?? []).map((s) => (s.id === id ? slot : s)),
      }));
      return { ok: true };
    },
    [businessId]
  );

  const deleteBlockedSlot = useCallback(
    async (id: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!businessId) return { ok: false, error: "Compte non initialisé." };
      const { error } = await supabase
        .from(WavonDbTable.blockedSlots)
        .delete()
        .eq("id", id)
        .eq("business_id", businessId);
      if (error) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[WavonProvider] blocked_slots delete", error.message);
        }
        return { ok: false, error: error.message || "Suppression impossible." };
      }
      setState((prev) => ({
        ...prev,
        blockedSlots: (prev.blockedSlots ?? []).filter((s) => s.id !== id),
      }));
      return { ok: true };
    },
    [businessId]
  );

  const patchSettings = useCallback((patch: Partial<WavonState["settings"]>) => {
    setState((prev) => {
      const { publicSlug: patchSlug, ...patchRest } = patch;
      const slugMerge: { publicSlug?: string } = {};
      if (patchSlug !== undefined) {
        const v = validatePublicSlugFormat(normalizePublicSlugInput(patchSlug));
        if (v.ok) slugMerge.publicSlug = v.slug;
      }
      const clippedPatch = {
        ...patchRest,
        ...(patch.publicDisplayName !== undefined
          ? { publicDisplayName: patch.publicDisplayName.trim().slice(0, PUBLIC_DISPLAY_NAME_MAX) }
          : {}),
        ...(patch.publicWelcomeMessage !== undefined
          ? { publicWelcomeMessage: patch.publicWelcomeMessage.trim().slice(0, PUBLIC_WELCOME_MAX) }
          : {}),
        ...(patch.publicDescription !== undefined
          ? { publicDescription: patch.publicDescription.trim().slice(0, PUBLIC_DESCRIPTION_MAX) }
          : {}),
      };
      const next = {
        ...prev.settings,
        ...clippedPatch,
        ...slugMerge,
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
      if (patch.currency !== undefined) businessPatch.currency = normalizeBusinessCurrency(patch.currency);
      if (patch.website !== undefined) businessPatch.website = patch.website.trim() || null;
      if (patch.city !== undefined) businessPatch.city = patch.city.trim() || null;
      if (patch.postalCode !== undefined) businessPatch.postal_code = patch.postalCode.trim() || null;
      if (patch.publicDescription !== undefined) {
        businessPatch.public_description =
          patch.publicDescription.trim().slice(0, PUBLIC_DESCRIPTION_MAX) || null;
      }
      if (patch.publicWelcomeMessage !== undefined) {
        businessPatch.public_welcome_message =
          patch.publicWelcomeMessage.trim().slice(0, PUBLIC_WELCOME_MAX) || null;
      }
      if (patch.publicDisplayName !== undefined) {
        businessPatch.public_display_name =
          patch.publicDisplayName.trim().slice(0, PUBLIC_DISPLAY_NAME_MAX) || null;
      }
      if (patch.publicLogoUrl !== undefined) businessPatch.public_logo_url = patch.publicLogoUrl.trim() || null;
      if (patch.publicLogoPath !== undefined) businessPatch.public_logo_path = patch.publicLogoPath.trim() || null;
      if (patch.publicCoverUrl !== undefined) businessPatch.public_cover_url = patch.publicCoverUrl.trim() || null;
      if (patch.publicCoverPath !== undefined) businessPatch.public_cover_path = patch.publicCoverPath.trim() || null;
      if (patch.publicShowPhone !== undefined) businessPatch.public_show_phone = Boolean(patch.publicShowPhone);
      if (patch.publicShowAddress !== undefined) businessPatch.public_show_address = Boolean(patch.publicShowAddress);
      if (patch.publicShowDescription !== undefined) businessPatch.public_show_description = Boolean(patch.publicShowDescription);
      if (patch.notifyOwnerOnNewReservation !== undefined) {
        businessPatch.notify_owner_on_new_reservation = Boolean(patch.notifyOwnerOnNewReservation);
      }
      if (patch.notifyOwnerOnCancellation !== undefined) {
        businessPatch.notify_owner_on_cancellation = Boolean(patch.notifyOwnerOnCancellation);
      }
      if (patch.publicSlug !== undefined) {
        const v = validatePublicSlugFormat(normalizePublicSlugInput(patch.publicSlug));
        if (v.ok) businessPatch.public_slug = v.slug;
      }
      if (Object.keys(businessPatch).length > 0) {
        await supabase.from(WavonDbTable.businesses).update(businessPatch).eq("id", businessId);
      }

      const settingsPatch: Record<string, unknown> = {};
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
        await supabase.from(WavonDbTable.settings).update(settingsPatch).eq("business_id", businessId);
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

      void supabase.from(WavonDbTable.emailTemplates).upsert(
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
      availabilityEmployeeId,
      setAvailabilityEmployeeId,
      upsertEmployee,
      deleteEmployee,
      refreshServices,
      setWeeklyDay,
      setAvailabilityMode,
      setCustomDays,
      setBlockedDates,
      addService,
      updateService,
      updateServiceChecked,
      deleteService,
      addClient,
      updateClient,
      deleteClient,
      addReservation,
      updateReservation,
      deleteReservation,
      addBlockedSlot,
      updateBlockedSlot,
      deleteBlockedSlot,
      patchSettings,
      upsertEmailTemplate,
      replaceWhatsAppMessages,
    }),
    [
      ready,
      state,
      businessId,
      availabilityEmployeeId,
      setAvailabilityEmployeeId,
      upsertEmployee,
      deleteEmployee,
      refreshServices,
      setWeeklyDay,
      setAvailabilityMode,
      setCustomDays,
      setBlockedDates,
      addService,
      updateService,
      updateServiceChecked,
      deleteService,
      addClient,
      updateClient,
      deleteClient,
      addReservation,
      updateReservation,
      deleteReservation,
      addBlockedSlot,
      updateBlockedSlot,
      deleteBlockedSlot,
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
