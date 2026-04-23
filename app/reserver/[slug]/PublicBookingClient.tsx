"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  addMinutes,
  combineYmdTime,
  dayKeyFromDate,
  getAvailableSlots,
  pickFirstAvailableEmployeeForSlot,
  parseYmd,
  timeToMinutes,
  toYmd,
  unionAvailableSlotsByEmployee,
  validateBooking,
  validateReservationWindow,
  weeklyDefault,
} from "@/lib/wavon/booking-logic";
import { formatPrice, normalizeBusinessCurrency } from "@/lib/utils/formatPrice";
import { landingSection } from "@/components/landing/landing-tokens";
import { btnPrimaryClass, inputClass, labelClass, userTextBreakClass } from "@/lib/wavon/tokens";
import { supabase } from "@/lib/supabase/client";
import type { BlockedSlot, DayKey, Employee, Service, WavonState } from "@/lib/wavon/types";
import { WavonDbTable } from "@/lib/supabase/wavon-tables";
import { EMPTY_SUBSCRIPTION_SNAPSHOT } from "@/lib/wavon/types";
import { getBrandingPublicUrl } from "@/lib/wavon/storage";

type DbBusiness = {
  id: string;
  business_name: string | null;
  currency?: string | null;
  public_slug: string | null;
  public_welcome_message?: string | null;
  public_description?: string | null;
  public_display_name?: string | null;
  public_logo_url?: string | null;
  public_cover_url?: string | null;
  public_show_phone?: boolean | null;
  public_show_address?: boolean | null;
  public_show_description?: boolean | null;
  phone?: string | null;
  address?: string | null;
};

type DbSettings = {
  business_id: string;
  minimum_notice_hours: number;
  auto_confirm_reservations: boolean;
  availability_mode: "fixed" | "custom";
  maximum_days_in_advance?: number;
  slot_interval_minutes?: number;
  minimum_gap_between_bookings?: number;
  same_day_booking_allowed?: boolean;
  public_after_booking_message?: string | null;
};

type DbService = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  description: string | null;
  is_active?: boolean;
  is_public?: boolean;
  color?: string | null;
  employee_ids?: string[] | null;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
  booking_notice_hours?: number | null;
  sort_order?: number;
};

type DbServiceFresh = {
  id: string;
  business_id: string;
  is_active: boolean;
  is_public: boolean;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  booking_notice_hours: number | null;
};

type DbReservation = {
  id: string;
  client_name: string;
  client_id: string | null;
  service_id: string;
  employee_id?: string | null;
  start_at: string;
  end_at: string;
  duration_minutes?: number;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
  status: "confirmed" | "cancelled" | "pending";
  created_at: string;
  notes?: string | null;
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

type DbWeeklyAvailability = {
  day_of_week: number;
  is_open: boolean;
  segments: unknown;
};

type DbCustomDay = {
  day: string; // date
  segments: unknown;
};

type DbBlockedDate = {
  blocked_date: string;
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
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [planningByEmployeeId, setPlanningByEmployeeId] = useState<
    Record<
      string,
      { weekly: WavonState["weekly"]; customDays: WavonState["customDays"]; blockedDates: string[] }
    >
  >({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingInit(true);
      setState(null);
      setBusinessId(null);
      try {
        const { data: business, error: businessErr } = await supabase
          .from(WavonDbTable.businesses)
          .select(
            "id,business_name,currency,public_slug,public_welcome_message,public_description,public_display_name,public_logo_url,public_cover_url,public_show_phone,public_show_address,public_show_description,phone,address"
          )
          .eq("public_slug", slug)
          .maybeSingle();
        if (businessErr) throw businessErr;
        if (!business) {
          if (!cancelled) setLoadingInit(false);
          return;
        }
        const b = business as DbBusiness;
        const id = b.id;

        const [settingsRes, servicesRes, reservationsRes, blockedSlotsRes, employeesRes] =
          await Promise.all([
            supabase
              .from(WavonDbTable.settings)
              .select(
                "business_id,minimum_notice_hours,auto_confirm_reservations,availability_mode,maximum_days_in_advance,slot_interval_minutes,minimum_gap_between_bookings,same_day_booking_allowed,public_after_booking_message"
              )
              .eq("business_id", id)
              .maybeSingle(),
            supabase
              .from(WavonDbTable.services)
              .select(
                "id,name,duration_minutes,price,description,is_active,is_public,color,employee_ids,buffer_before_minutes,buffer_after_minutes,booking_notice_hours,sort_order"
              )
              .eq("business_id", id)
              .eq("is_active", true)
              .eq("is_public", true)
              .order("sort_order", { ascending: true })
              .order("created_at", { ascending: true }),
            supabase
              .from(WavonDbTable.reservations)
              .select(
                "id,client_name,client_id,service_id,employee_id,start_at,end_at,duration_minutes,buffer_before_minutes,buffer_after_minutes,status,created_at,notes"
              )
              .eq("business_id", id)
              .order("start_at", { ascending: true }),
            supabase
              .from(WavonDbTable.blockedSlots)
              .select("id,business_id,employee_id,start_at,end_at,reason,created_at,updated_at")
              .eq("business_id", id)
              .order("start_at", { ascending: true }),
            supabase
              .from(WavonDbTable.employees)
              .select("id,business_id,name,email,phone,photo_url,color,is_active,display_order,created_at,updated_at")
              .eq("business_id", id)
              .eq("is_active", true)
              .order("display_order", { ascending: true })
              .order("created_at", { ascending: true }),
          ]);

        if (
          settingsRes.error ||
          servicesRes.error ||
          reservationsRes.error ||
          blockedSlotsRes.error ||
          employeesRes.error
        ) {
          throw (
            settingsRes.error ||
            servicesRes.error ||
            reservationsRes.error ||
            blockedSlotsRes.error ||
            employeesRes.error
          );
        }

        const dbSettings = (settingsRes.data as DbSettings | null) ?? null;
        const dbServices = (servicesRes.data as DbService[]) ?? [];
        const dbReservations = (reservationsRes.data as DbReservation[]) ?? [];
        const dbBlockedSlots = (blockedSlotsRes.data as DbBlockedSlot[]) ?? [];
        const dbEmployees = (employeesRes.data as DbEmployee[]) ?? [];

        const blockedSlots: BlockedSlot[] = dbBlockedSlots.map((s) => ({
          id: s.id,
          businessId: s.business_id,
          employeeId: s.employee_id ?? null,
          start: s.start_at,
          end: s.end_at,
          reason: s.reason ?? null,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        }));

        const emp: Employee[] = dbEmployees.map((e) => ({
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
        }));
        const employeeIdsInOrder = emp.map((e) => e.id);

        const baseWeekly = weeklyDefault();
        const emptyWeekly: WavonState["weekly"] = {
          mon: { ...baseWeekly.mon, enabled: false, segments: [] },
          tue: { ...baseWeekly.tue, enabled: false, segments: [] },
          wed: { ...baseWeekly.wed, enabled: false, segments: [] },
          thu: { ...baseWeekly.thu, enabled: false, segments: [] },
          fri: { ...baseWeekly.fri, enabled: false, segments: [] },
          sat: { ...baseWeekly.sat, enabled: false, segments: [] },
          sun: { ...baseWeekly.sun, enabled: false, segments: [] },
        };

        const next: WavonState = {
          version: 1,
          subscription: { ...EMPTY_SUBSCRIPTION_SNAPSHOT },
          workspaceAccess: null,
          employees: emp,
          weekly: emptyWeekly,
          availabilityMode: dbSettings?.availability_mode ?? "fixed",
          customDays: [],
          blockedDates: [],
          blockedSlots,
          services: dbServices.map(
            (s): Service => ({
              id: s.id,
              name: s.name,
              durationMin: s.duration_minutes,
              price: s.price,
              description: s.description ?? "",
              isActive: Boolean(s.is_active ?? true),
              isPublic: Boolean(s.is_public ?? true),
              color: s.color ?? null,
              employeeIds: Array.isArray(s.employee_ids) ? (s.employee_ids ?? []) : [],
              bufferBeforeMin: Math.max(0, s.buffer_before_minutes ?? 0),
              bufferAfterMin: Math.max(0, s.buffer_after_minutes ?? 0),
              bookingNoticeHours: s.booking_notice_hours ?? null,
              sortOrder: s.sort_order ?? 0,
            })
          ),
          clients: [],
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
            businessName: b.business_name ?? "",
            currency: normalizeBusinessCurrency(b.currency),
            address: b.address ?? "",
            phone: b.phone ?? "",
            publicSlug: b.public_slug ?? slug,
            minNoticeHours: dbSettings?.minimum_notice_hours ?? 0,
            maxDaysInAdvance: dbSettings?.maximum_days_in_advance ?? 365,
            slotIntervalMinutes: dbSettings?.slot_interval_minutes ?? 15,
            minGapBetweenBookingsMinutes: dbSettings?.minimum_gap_between_bookings ?? 0,
            sameDayBookingAllowed: dbSettings?.same_day_booking_allowed ?? true,
            allowCancellation: true,
            cancellationDeadlineHours: 0,
            allowReschedule: true,
            rescheduleDeadlineHours: 0,
            confirmationMode: dbSettings?.auto_confirm_reservations ? "auto" : "manual",
            publicShowPhone: b.public_show_phone ?? true,
            publicShowAddress: b.public_show_address ?? true,
            publicShowDescription: b.public_show_description ?? true,
            publicDescription: b.public_description ?? "",
            publicWelcomeMessage: b.public_welcome_message ?? "",
            publicDisplayName: b.public_display_name ?? "",
            publicLogoUrl: b.public_logo_url ?? "",
            publicCoverUrl: b.public_cover_url ?? "",
            publicAfterBookingMessage:
              dbSettings?.public_after_booking_message ??
              "Ta demande est enregistrée. À très bientôt.",
            notifyOwnerOnNewReservation: true,
            notifyOwnerOnCancellation: true,
          },
          emailTemplates: [],
          whatsappThreads: [],
        };

        if (cancelled) return;
        setBusinessId(id);
        setPublishedName(b.business_name ?? "");
        setEmployees(emp);
        setState(next);
        setLoadingInit(false);

        // Prefetch planning for all employees (needed for "Sans préférence")
        const toLoad = employeeIdsInOrder;
        if (toLoad.length) {
          const results = await Promise.all(
            toLoad.map(async (employeeId) => {
              const [weeklyRes, customRes, blockedRes] = await Promise.all([
                supabase
                  .from(WavonDbTable.availabilityRules)
                  .select("day_of_week,is_open,segments")
                  .eq("business_id", id)
                  .eq("employee_id", employeeId),
                supabase
                  .from(WavonDbTable.customDays)
                  .select("day,segments")
                  .eq("business_id", id)
                  .eq("employee_id", employeeId),
                supabase
                  .from(WavonDbTable.blockedDates)
                  .select("blocked_date")
                  .eq("business_id", id)
                  .eq("employee_id", employeeId),
              ]);
              if (weeklyRes.error || customRes.error || blockedRes.error) {
                return null;
              }
              const weekly = { ...emptyWeekly };
              for (const row of ((weeklyRes.data as DbWeeklyAvailability[]) ?? [])) {
                const k = dayKeyFromDow(row.day_of_week);
                weekly[k] = { enabled: Boolean(row.is_open), segments: segmentsFromJson(row.segments) };
              }
              const customDays = (((customRes.data as DbCustomDay[]) ?? [])).map((r) => ({
                date: String(r.day),
                segments: segmentsFromJson(r.segments),
              }));
              const blockedDates = (((blockedRes.data as DbBlockedDate[]) ?? [])).map((x) => String(x.blocked_date)).sort();
              return { employeeId, weekly, customDays, blockedDates };
            })
          );
          if (!cancelled) {
            setPlanningByEmployeeId((prev) => {
              const next = { ...prev };
              for (const r of results) {
                if (!r) continue;
                next[r.employeeId] = { weekly: r.weekly, customDays: r.customDays, blockedDates: r.blockedDates };
              }
              return next;
            });
          }
        }
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
  const [step, setStep] = useState<"service" | "employee" | "slot" | "client" | "confirm">("service");
  const [employeeChoice, setEmployeeChoice] = useState<string>(""); // "" = sans préférence, otherwise employeeId
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

  const eligibleEmployees = useMemo(() => {
    const all = employees;
    if (!svc) return all;
    const ids = svc.employeeIds ?? [];
    if (ids.length === 0) return all;
    return all.filter((e) => ids.includes(e.id));
  }, [employees, svc]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (!svc) return;
    const names = eligibleEmployees.map((e) => e.name);
    const show = eligibleEmployees.length > 1 ? "OUI" : "NON";
    console.debug("[public booking] Service choisi:", svc.name);
    console.debug("[public booking] Prestataires éligibles:", names);
    console.debug(`[public booking] Nombre: ${names.length} — étape affichée: ${show}`);
  }, [svc, eligibleEmployees]);

  const employeesLoaded = employees.length > 0;
  // IMPORTANT:
  // - employeeIds=[] signifie "tous les prestataires actifs".
  // - Tant qu'on n'a pas chargé la liste des employés, on ne doit JAMAIS auto-skip
  //   car on ne sait pas si "tous" = 1 ou plusieurs.
  const serviceExplicitEmployeeIds = svc?.employeeIds ?? [];
  const showEmployeeStep =
    serviceExplicitEmployeeIds.length > 1 ||
    (serviceExplicitEmployeeIds.length === 0 && (!employeesLoaded || employees.length > 1));

  const totalSteps = showEmployeeStep ? 5 : 4;
  const currentStepNumber = useMemo(() => {
    if (step === "service") return 1;
    if (step === "employee") return 2;
    if (step === "slot") return showEmployeeStep ? 3 : 2;
    if (step === "client") return showEmployeeStep ? 4 : 3;
    return showEmployeeStep ? 5 : 4;
  }, [step, showEmployeeStep]);

  const goBack = () => {
    setErr(null);
    if (step === "confirm") return setStep("client");
    if (step === "client") return setStep("slot");
    if (step === "slot") return setStep(showEmployeeStep ? "employee" : "service");
    if (step === "employee") return setStep("service");
    return setStep("service");
  };

  const goNext = () => {
    setErr(null);
    if (step === "service") {
      if (!svc) return;
      if (showEmployeeStep) {
        if (!employeesLoaded) {
          setErr("Chargement de l’équipe… Réessaie dans un instant.");
          return;
        }
        setStep("employee");
        return;
      }

      // Cas A : un seul prestataire éligible -> assignation auto en arrière-plan
      setEmployeeChoice(eligibleEmployees[0]?.id ?? "");
      setStep("slot");
      return;
    }
    if (step === "employee") {
      setStep("slot");
      return;
    }
    if (step === "slot") {
      if (slots.length === 0) {
        setErr("Aucun créneau disponible pour ce jour.");
        return;
      }
      setStep("client");
      return;
    }
    if (step === "client") {
      if (!clientName.trim()) {
        setErr("Indique ton nom.");
        return;
      }
      setStep("confirm");
    }
  };

  useEffect(() => {
    if (!svc) return;
    setStep("service");
    setEmployeeChoice("");
    setErr(null);
    setMsg(null);
  }, [svc?.id]);

  const statesByEmployeeId = useMemo(() => {
    if (!state) return {};
    const out: Record<string, WavonState> = {};
    for (const e of eligibleEmployees) {
      const p = planningByEmployeeId[e.id];
      if (!p) continue;
      out[e.id] = {
        ...state,
        weekly: p.weekly,
        customDays: p.customDays,
        blockedDates: p.blockedDates,
        blockedSlots: state.blockedSlots ?? [],
      };
    }
    return out;
  }, [state, eligibleEmployees, planningByEmployeeId]);

  const employeeIdsInOrder = useMemo(
    () => eligibleEmployees.slice().sort((a, b) => a.displayOrder - b.displayOrder).map((e) => e.id),
    [eligibleEmployees]
  );

  const slotsByEmployee = useMemo(() => {
    if (!state || !svc || !dateYmd) return null;
    if (!showEmployeeStep) return null;
    return unionAvailableSlotsByEmployee({
      ymd: dateYmd,
      service: svc,
      statesByEmployeeId,
      employeeIdsInOrder,
    });
  }, [state, svc, dateYmd, showEmployeeStep, statesByEmployeeId, employeeIdsInOrder]);

  const slots = useMemo(() => {
    if (!state || !svc || !dateYmd) return [];
    if (!showEmployeeStep) {
      const only = eligibleEmployees[0]?.id ?? null;
      const st = only ? statesByEmployeeId[only] ?? state : state;
      return getAvailableSlots(dateYmd, svc, st, only);
    }
    if (employeeChoice && statesByEmployeeId[employeeChoice]) {
      return getAvailableSlots(dateYmd, svc, statesByEmployeeId[employeeChoice], employeeChoice);
    }
    return Object.keys(slotsByEmployee ?? {}).sort();
  }, [state, svc, dateYmd, showEmployeeStep, employeeChoice, statesByEmployeeId, eligibleEmployees, slotsByEmployee]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (!state || !svc || !dateYmd) return;

    const dayStart = combineYmdTime(dateYmd, "00:00");
    const dayEnd = addMinutes(dayStart, 24 * 60);
    const blockedOverlappingDay = (state.blockedSlots ?? []).filter(
      (b) => new Date(b.start) < dayEnd && new Date(b.end) > dayStart
    );

    let employeeLabel: string;
    if (!showEmployeeStep) {
      employeeLabel = eligibleEmployees[0]?.name ?? "(prestataire unique)";
    } else if (employeeChoice) {
      employeeLabel = employees.find((e) => e.id === employeeChoice)?.name ?? employeeChoice;
    } else {
      employeeLabel = "sans préférence";
    }

    if (!showEmployeeStep) {
      const only = eligibleEmployees[0]?.id ?? null;
      const st = only ? statesByEmployeeId[only] ?? state : state;
      let dbg: { candidateCount: number; returnedCount: number; blockedSlotsInState: number } | undefined;
      const list = getAvailableSlots(dateYmd, svc, st, only, (d) => {
        dbg = d;
      });
      console.debug("[waevon][public slots]", {
        service: svc.name,
        dateYmd,
        employeeLabel,
        mode: "prestataire_unique",
        blockedOverlappingDay: blockedOverlappingDay.length,
        blockedTotalInState: (state.blockedSlots ?? []).length,
        candidateCount: dbg?.candidateCount,
        returnedAfterFilter: dbg?.returnedCount,
        uiSlotOptions: list.length,
      });
      return;
    }

    if (employeeChoice && statesByEmployeeId[employeeChoice]) {
      let dbg: { candidateCount: number; returnedCount: number; blockedSlotsInState: number } | undefined;
      const list = getAvailableSlots(
        dateYmd,
        svc,
        statesByEmployeeId[employeeChoice],
        employeeChoice,
        (d) => {
          dbg = d;
        }
      );
      console.debug("[waevon][public slots]", {
        service: svc.name,
        dateYmd,
        employeeLabel,
        mode: "prestataire_choisi",
        blockedOverlappingDay: blockedOverlappingDay.length,
        blockedTotalInState: (state.blockedSlots ?? []).length,
        candidateCount: dbg?.candidateCount,
        returnedAfterFilter: dbg?.returnedCount,
        uiSlotOptions: list.length,
      });
      return;
    }

    const unionKeys = Object.keys(slotsByEmployee ?? {}).sort();
    let sumCandidates = 0;
    for (const eid of employeeIdsInOrder) {
      const st = statesByEmployeeId[eid];
      if (!st) continue;
      getAvailableSlots(dateYmd, svc, st, eid, (d) => {
        sumCandidates += d.candidateCount;
      });
    }
    console.debug("[waevon][public slots]", {
      service: svc.name,
      dateYmd,
      employeeLabel,
      mode: "sans_pref",
      blockedOverlappingDay: blockedOverlappingDay.length,
      blockedTotalInState: (state.blockedSlots ?? []).length,
      sumCandidateCountAcrossEmployees: sumCandidates,
      uiSlotOptions: unionKeys.length,
    });
  }, [
    state,
    svc,
    dateYmd,
    showEmployeeStep,
    employeeChoice,
    eligibleEmployees,
    employees,
    statesByEmployeeId,
    employeeIdsInOrder,
    slotsByEmployee,
  ]);

  const assignedEmployeeIdPreview = useMemo(() => {
    if (!svc) return null;
    if (!showEmployeeStep) return eligibleEmployees[0]?.id ?? null;
    if (employeeChoice) return employeeChoice;
    if (!slotsByEmployee) return null;
    return pickFirstAvailableEmployeeForSlot({
      time,
      slotsByEmployee,
      employeeIdsInOrder,
    });
  }, [svc, showEmployeeStep, eligibleEmployees, employeeChoice, slotsByEmployee, time, employeeIdsInOrder]);

  const assignedEmployeeNamePreview = useMemo(() => {
    const id = assignedEmployeeIdPreview;
    if (!id) return null;
    return employees.find((e) => e.id === id)?.name ?? null;
  }, [assignedEmployeeIdPreview, employees]);

  const noSlotsHint = useMemo(() => {
    if (!state || !svc || !dateYmd) return null;
    if (slots.length > 0) return null;
    const hintEmployeeId =
      !showEmployeeStep
        ? (eligibleEmployees[0]?.id ?? null)
        : (employeeChoice ? employeeChoice : (eligibleEmployees[0]?.id ?? null));
    const hintState =
      hintEmployeeId && statesByEmployeeId[hintEmployeeId]
        ? statesByEmployeeId[hintEmployeeId]
        : state;
    if (hintState.blockedDates.includes(dateYmd)) return "Cette date est bloquée.";

    const dk = dayKeyFromDate(parseYmd(dateYmd)) as DayKey;
    const custom = hintState.customDays.find((d) => d.date === dateYmd) ?? null;
    const segs =
      hintState.availabilityMode === "custom"
        ? (custom?.segments?.length ? custom.segments : hintState.weekly[dk]?.enabled ? hintState.weekly[dk].segments : [])
        : (hintState.weekly[dk]?.enabled ? hintState.weekly[dk].segments : []);

    const normalized = (segs ?? []).filter((s) => timeToMinutes(s.end) > timeToMinutes(s.start));
    if (normalized.length === 0) {
      return "Aucune disponibilité pour ce jour. Essaie une autre date.";
    }

    // Check if service duration can fit any segment
    const maxSeg = Math.max(
      0,
      ...normalized.map((s) => Math.max(0, timeToMinutes(s.end) - timeToMinutes(s.start)))
    );
    if (svc.durationMin > maxSeg) {
      return `Durée trop longue (${svc.durationMin} min) pour les horaires de ce jour.`;
    }

    // Check booking window constraints (notice / max advance / same-day)
    const firstStart = combineYmdTime(dateYmd, normalized[0]!.start);
    const win = validateReservationWindow(firstStart, svc, hintState.settings);
    if (win) return win;

    return "Tous les créneaux sont déjà pris pour ce jour.";
  }, [state, svc, dateYmd, slots.length, showEmployeeStep, employeeChoice, eligibleEmployees, statesByEmployeeId]);

  if (!state) {
    return (
      <div className="min-h-screen bg-[#f7f7f5] px-4 py-20 text-neutral-600">
        <div className={`${landingSection} text-center`}>
          <div className="mx-auto max-w-md rounded-3xl border border-neutral-200/90 bg-white px-8 py-12 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)]">
            <h1 className="text-lg font-semibold text-neutral-950">
              {loadingInit ? "Chargement…" : "Lien introuvable"}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
              {loadingInit
                ? "Connexion au planning…"
                : "Ce lien de réservation n’existe pas ou n’est plus actif."}
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
      // Re-validate against fresh DB data right before creating reservation.
      const { data: dbSvc, error: svcErr } = await supabase
        .from(WavonDbTable.services)
        .select(
          "id,business_id,is_active,is_public,duration_minutes,buffer_before_minutes,buffer_after_minutes,booking_notice_hours"
        )
        .eq("id", svc.id)
        .eq("business_id", businessId)
        .maybeSingle();
      if (svcErr) throw svcErr;
      const freshSvc = dbSvc as DbServiceFresh | null;
      if (!freshSvc || !freshSvc.is_active || !freshSvc.is_public) {
        setErr("Ce service n’est plus disponible.");
        return;
      }

      const effectiveSvc: Service = {
        ...svc,
        durationMin: Number(freshSvc.duration_minutes) || svc.durationMin,
        bufferBeforeMin: Math.max(0, Number(freshSvc.buffer_before_minutes) || 0),
        bufferAfterMin: Math.max(0, Number(freshSvc.buffer_after_minutes) || 0),
        bookingNoticeHours: freshSvc.booking_notice_hours ?? svc.bookingNoticeHours ?? null,
      };

      const end = addMinutes(start, effectiveSvc.durationMin);

      // Fetch reservations for this business (light refresh). DB constraint still guarantees no overlap.
      const dayStart = combineYmdTime(dateYmd, "00:00");
      const dayEnd = addMinutes(dayStart, 24 * 60);
      const { data: freshRes, error: fresErr } = await supabase
        .from(WavonDbTable.reservations)
        .select(
          "id,client_name,client_id,service_id,employee_id,start_at,end_at,duration_minutes,buffer_before_minutes,buffer_after_minutes,status,created_at,notes"
        )
        .eq("business_id", businessId)
        .gte("start_at", dayStart.toISOString())
        .lt("start_at", dayEnd.toISOString())
        .order("start_at", { ascending: true });
      if (fresErr) throw fresErr;

      const { data: freshBlocked, error: fbErr } = await supabase
        .from(WavonDbTable.blockedSlots)
        .select("id,business_id,employee_id,start_at,end_at,reason,created_at,updated_at")
        .eq("business_id", businessId)
        .lt("start_at", dayEnd.toISOString())
        .gt("end_at", dayStart.toISOString())
        .order("start_at", { ascending: true });
      if (fbErr) throw fbErr;

      const nextState: WavonState = {
        ...state,
        reservations: ((freshRes ?? []) as DbReservation[]).map((r) => ({
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
        blockedSlots: ((freshBlocked ?? []) as DbBlockedSlot[]).map((s) => ({
          id: s.id,
          businessId: s.business_id,
          employeeId: s.employee_id ?? null,
          start: s.start_at,
          end: s.end_at,
          reason: s.reason ?? null,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
        })),
      };

      // Choix du prestataire final
      let finalEmployeeId: string | null = null;
      if (!showEmployeeStep) {
        finalEmployeeId = eligibleEmployees[0]?.id ?? null;
      } else if (employeeChoice) {
        finalEmployeeId = employeeChoice;
      } else {
        const by = unionAvailableSlotsByEmployee({
          ymd: dateYmd,
          service: effectiveSvc,
          statesByEmployeeId: Object.fromEntries(
            employeeIdsInOrder
              .map((id) => {
                const p = planningByEmployeeId[id];
                if (!p) return null;
                const st: WavonState = { ...nextState, weekly: p.weekly, customDays: p.customDays, blockedDates: p.blockedDates };
                return [id, st] as const;
              })
              .filter(Boolean) as Array<readonly [string, WavonState]>
          ),
          employeeIdsInOrder,
        });
        finalEmployeeId = pickFirstAvailableEmployeeForSlot({
          time,
          slotsByEmployee: by,
          employeeIdsInOrder,
        });
      }

      if (!finalEmployeeId) {
        setErr("Aucun prestataire disponible pour ce créneau.");
        return;
      }

      const validationErr = validateBooking({
        state: {
          ...nextState,
          ...(planningByEmployeeId[finalEmployeeId]
            ? {
                weekly: planningByEmployeeId[finalEmployeeId]!.weekly,
                customDays: planningByEmployeeId[finalEmployeeId]!.customDays,
                blockedDates: planningByEmployeeId[finalEmployeeId]!.blockedDates,
                blockedSlots: nextState.blockedSlots ?? [],
              }
            : {}),
        },
        service: effectiveSvc,
        start,
        end,
        employeeId: finalEmployeeId,
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
          .from(WavonDbTable.clients)
          .select("id")
          .eq("business_id", businessId)
          .eq("email", normalizedEmail)
          .maybeSingle();
        clientId = (data as { id: string } | null)?.id ?? null;
      } else if (normalizedPhone) {
        const { data } = await supabase
          .from(WavonDbTable.clients)
          .select("id")
          .eq("business_id", businessId)
          .eq("phone", normalizedPhone)
          .maybeSingle();
        clientId = (data as { id: string } | null)?.id ?? null;
      }

      if (!clientId) {
        const { data: created, error: cErr } = await supabase
          .from(WavonDbTable.clients)
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
        .from(WavonDbTable.reservations)
        .insert({
          business_id: businessId,
          client_id: clientId,
          client_name: displayName,
          service_id: effectiveSvc.id,
          employee_id: finalEmployeeId,
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          duration_minutes: effectiveSvc.durationMin,
          buffer_before_minutes: effectiveSvc.bufferBeforeMin ?? 0,
          buffer_after_minutes: effectiveSvc.bufferAfterMin ?? 0,
          status,
        })
        .select("id,created_at")
        .single();
      if (rErr) {
        const code = (rErr as { code?: string } | null)?.code;
        if (code === "23P01") {
          setErr("Ce créneau vient d’être pris. Choisis un autre horaire.");
          return;
        }
        throw rErr;
      }

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
              serviceId: effectiveSvc.id,
              employeeId: finalEmployeeId,
              start: start.toISOString(),
              end: end.toISOString(),
              durationMin: effectiveSvc.durationMin,
              bufferBeforeMin: effectiveSvc.bufferBeforeMin ?? 0,
              bufferAfterMin: effectiveSvc.bufferAfterMin ?? 0,
              status,
              createdAt: (createdRes as { created_at: string }).created_at,
              notes: "",
            },
          ],
        };
      });

      // Envoi des emails de confirmation (fire-and-forget)
      void fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "new_booking",
          reservationId: (createdRes as { id: string }).id,
          businessId,
        }),
      }).catch(() => {});

      setMsg(state.settings.publicAfterBookingMessage || "Ta demande est enregistrée. À très bientôt.");
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
        {/** Unified, mobile-first booking card (branding + form) */}
        {(() => {
          const coverUrl =
            getBrandingPublicUrl(state.settings.publicCoverPath) ||
            state.settings.publicCoverUrl ||
            "";
          const logoUrl =
            getBrandingPublicUrl(state.settings.publicLogoPath) ||
            state.settings.publicLogoUrl ||
            "";
          const displayName =
            state.settings.publicDisplayName?.trim() ||
            state.settings.businessName ||
            publishedName ||
            "Réservation";

          const initials = (
            (displayName || "?").trim().slice(0, 2) || "?"
          ).toUpperCase();

          return (
            <div className="mx-auto w-full max-w-lg flex-1">
              <div className="overflow-hidden rounded-3xl border border-neutral-200/90 bg-white shadow-[0_2px_20px_-6px_rgba(0,0,0,0.08)]">
                {/* Cover */}
                {coverUrl ? (
                  <div className="relative h-28 w-full sm:h-36">
                    <Image src={coverUrl} alt="" fill className="object-cover" priority />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-transparent" />
                  </div>
                ) : (
                  <div className="h-10 bg-neutral-50 sm:h-12" />
                )}

                {/* Identity */}
                <div className="px-6 pb-6 pt-5 sm:px-8 sm:pb-8">
                  <div className="-mt-10 flex w-full min-w-0 flex-col items-center text-center sm:-mt-12">
                    <div className="relative mb-4 flex size-20 items-center justify-center overflow-hidden rounded-3xl border border-neutral-200/90 bg-white shadow-[0_12px_36px_-18px_rgba(0,0,0,0.35)] sm:size-24">
                      {logoUrl ? (
                        <Image
                          src={logoUrl}
                          alt=""
                          fill
                          className="object-cover"
                          onError={() => {
                            if (process.env.NODE_ENV !== "production") {
                              console.warn("[public booking] logo failed:", {
                                path: state.settings.publicLogoPath,
                                url: logoUrl,
                              });
                            }
                          }}
                        />
                      ) : (
                        <span className="text-lg font-semibold text-neutral-600">{initials}</span>
                      )}
                    </div>

                    <h1
                      className={`mx-auto max-w-full text-2xl font-semibold tracking-tight text-neutral-950 sm:text-[1.65rem] ${userTextBreakClass} line-clamp-2 text-center`}
                    >
                      {displayName}
                    </h1>

                    {state.settings.publicWelcomeMessage?.trim() ? (
                      <p
                        className={`mx-auto mt-2 max-w-md text-sm text-neutral-500 ${userTextBreakClass} line-clamp-4 text-center`}
                      >
                        {state.settings.publicWelcomeMessage}
                      </p>
                    ) : null}

                    {state.settings.publicShowDescription && state.settings.publicDescription?.trim() ? (
                      <p
                        className={`mx-auto mt-2 max-w-md text-xs leading-relaxed text-neutral-400 ${userTextBreakClass} line-clamp-3 text-center`}
                      >
                        {state.settings.publicDescription}
                      </p>
                    ) : null}

                    {(state.settings.publicShowPhone || state.settings.publicShowAddress) ? (
                      <div className="mx-auto mt-4 flex max-w-md flex-wrap items-center justify-center gap-2 text-xs text-neutral-400">
                        {state.settings.publicShowPhone && state.settings.phone?.trim() ? (
                          <span
                            className={`max-w-full rounded-full border border-neutral-200/90 bg-white px-3 py-1.5 ${userTextBreakClass}`}
                          >
                            {state.settings.phone}
                          </span>
                        ) : null}
                        {state.settings.publicShowAddress && state.settings.address?.trim() ? (
                          <span
                            className={`max-w-full rounded-full border border-neutral-200/90 bg-white px-3 py-1.5 ${userTextBreakClass}`}
                          >
                            {state.settings.address}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Form section (integrated) */}
                <div className="border-t border-neutral-100 px-6 py-6 sm:px-8 sm:py-8">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      {step !== "service" ? (
                        <button
                          type="button"
                          className="text-sm font-medium text-neutral-600 underline-offset-4 hover:underline"
                          onClick={goBack}
                        >
                          ← Retour
                        </button>
                      ) : (
                        <span />
                      )}
                      <span className="text-xs font-medium text-neutral-400">
                        Étape {currentStepNumber}/{totalSteps}
                      </span>
                    </div>

                    {step === "service" ? (
                      <div className="space-y-5">
                        <div className="min-w-0 overflow-hidden">
                          <label className={labelClass}>Prestation</label>
                          <select
                            className={`${inputClass} mt-2 max-w-full`}
                            value={resolvedServiceId ?? ""}
                            onChange={(e) => setServiceId(e.target.value)}
                          >
                            {state.services.map((s) => (
                              <option key={s.id} value={s.id} title={`${s.name} — ${s.durationMin} min`}>
                                {s.name} — {s.durationMin} min — {formatPrice(s.price, state.settings.currency)}
                              </option>
                            ))}
                          </select>
                          {svc?.description ? (
                            <p className={`mt-2 text-xs leading-relaxed text-neutral-500 ${userTextBreakClass} line-clamp-3`}>
                              {svc.description}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          disabled={!svc}
                          onClick={goNext}
                          className={btnPrimaryClass + " min-h-[48px] w-full text-base"}
                        >
                          Continuer
                        </button>
                      </div>
                    ) : null}

                    {step === "employee" ? (
                      <div className="rounded-3xl border border-neutral-200/90 bg-white p-4">
                        <p className="text-base font-semibold text-neutral-950">
                          Avec qui souhaitez-vous prendre rendez-vous ?
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                          Choisissez votre prestataire préféré ou laissez-nous vous attribuer le premier disponible pour votre créneau.
                        </p>

                        <div className="mt-4 space-y-3">
                          <button
                            type="button"
                            className="w-full rounded-2xl border border-dashed border-neutral-300/90 bg-neutral-50/60 px-4 py-3 text-left text-sm transition hover:bg-neutral-50"
                            onClick={() => {
                              setEmployeeChoice("");
                              setStep("slot");
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 inline-flex size-9 items-center justify-center rounded-full border border-neutral-200/90 bg-white text-neutral-700">
                                👥
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-neutral-950">Sans préférence</p>
                                <p className="mt-1 text-xs text-neutral-500">
                                  On vous attribue le premier prestataire disponible pour votre créneau.
                                </p>
                              </div>
                            </div>
                          </button>

                          <div className="grid gap-3 sm:grid-cols-2">
                            {eligibleEmployees.map((e) => {
                              const photo = e.photoUrl?.trim()
                                ? (getBrandingPublicUrl(e.photoUrl) || e.photoUrl)
                                : null;
                              const initials = (e.name.trim().slice(0, 2) || "?").toUpperCase();
                              return (
                                <button
                                  key={e.id}
                                  type="button"
                                  className="flex items-center gap-3 rounded-2xl border border-neutral-200/90 bg-white px-4 py-3 text-left text-sm transition hover:bg-neutral-50"
                                  onClick={() => {
                                    setEmployeeChoice(e.id);
                                    setStep("slot");
                                  }}
                                >
                                  <span className="relative size-10 shrink-0 overflow-hidden rounded-full border border-neutral-200/90 bg-white">
                                    {photo ? (
                                      <Image src={photo} alt="" fill className="object-cover" />
                                    ) : (
                                      <span
                                        className="flex size-10 items-center justify-center text-xs font-semibold text-white"
                                        style={{ backgroundColor: e.color }}
                                      >
                                        {initials}
                                      </span>
                                    )}
                                  </span>
                                  <span className="min-w-0">
                                    <span className={`block font-semibold text-neutral-950 ${userTextBreakClass}`}>
                                      {e.name}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {step === "slot" ? (
                      <div className="space-y-5">
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
                            {noSlotsHint ? (
                              <p className={`mt-2 text-xs leading-relaxed text-neutral-500 ${userTextBreakClass}`}>
                                {noSlotsHint}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={slots.length === 0}
                          onClick={goNext}
                          className={btnPrimaryClass + " min-h-[48px] w-full text-base"}
                        >
                          Continuer
                        </button>
                      </div>
                    ) : null}

                    {step === "client" ? (
                      <div className="space-y-5">
                        <div>
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
                        <button
                          type="button"
                          disabled={!clientName.trim()}
                          onClick={goNext}
                          className={btnPrimaryClass + " min-h-[48px] w-full text-base"}
                        >
                          Continuer
                        </button>
                      </div>
                    ) : null}

                    {step === "confirm" ? (
                      <div className="space-y-5">
                        <div className="rounded-3xl border border-neutral-200/90 bg-neutral-50/60 p-4">
                          <p className="text-sm font-semibold text-neutral-950">Récapitulatif</p>
                          <div className="mt-3 space-y-2 text-sm text-neutral-700">
                            <p>
                              <span className="font-medium text-neutral-950">Prestation:</span> {svc?.name ?? "—"}
                            </p>
                            <p>
                              <span className="font-medium text-neutral-950">Prestataire:</span>{" "}
                              {assignedEmployeeNamePreview ?? (showEmployeeStep ? "Premier disponible" : "—")}
                            </p>
                            <p>
                              <span className="font-medium text-neutral-950">Date:</span> {dateYmd}
                            </p>
                            <p>
                              <span className="font-medium text-neutral-950">Heure:</span> {time}
                            </p>
                          </div>
                        </div>

                        {err ? (
                          <div className={`rounded-2xl border border-red-200/90 bg-red-50/80 px-4 py-3 text-sm text-red-900 ${userTextBreakClass}`}>
                            {err}
                          </div>
                        ) : null}
                        {msg ? (
                          <div className={`rounded-2xl border border-neutral-200/90 bg-neutral-50 px-4 py-3 text-sm text-neutral-800 ${userTextBreakClass}`}>
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
                    ) : null}

                    {step !== "confirm" && err ? (
                      <div className={`rounded-2xl border border-red-200/90 bg-red-50/80 px-4 py-3 text-sm text-red-900 ${userTextBreakClass}`}>
                        {err}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <p className="mt-6 text-center text-xs text-neutral-400">
                Réservation proposée par Waevon.
              </p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
