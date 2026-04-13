"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { addMinutes, validateBooking } from "@/lib/wavon/booking-logic";
import { createDefaultWavonState } from "@/lib/wavon/default-state";
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
import { writePublicSnapshot } from "@/lib/wavon/public-snapshot";
import { rememberSlugOwner } from "@/lib/wavon/slug-owner";

function storageKey(userId: string): string {
  return `wavon:v1:${userId}`;
}

function loadState(userId: string): WavonState {
  if (typeof window === "undefined") return createDefaultWavonState();
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return createDefaultWavonState();
    const parsed = JSON.parse(raw) as WavonState;
    if (parsed?.version !== 1) return createDefaultWavonState();
    return parsed;
  } catch {
    return createDefaultWavonState();
  }
}

function saveState(userId: string, state: WavonState): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    /* ignore */
  }
  const slug = state.settings.publicSlug || "demo";
  writePublicSnapshot(slug, state);
  rememberSlugOwner(slug, userId);
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
  const [state, setState] = useState<WavonState>(() => createDefaultWavonState());

  useEffect(() => {
    startTransition(() => {
      setState(loadState(userId));
      setReady(true);
    });
  }, [userId]);

  useEffect(() => {
    if (!ready) return;
    saveState(userId, state);
  }, [ready, userId, state]);

  const setWeeklyDay = useCallback((day: DayKey, patch: WeeklyDaySchedule) => {
    setState((prev) => ({
      ...prev,
      weekly: { ...prev.weekly, [day]: patch },
    }));
  }, []);

  const setAvailabilityMode = useCallback((mode: WavonState["availabilityMode"]) => {
    setState((prev) => ({ ...prev, availabilityMode: mode }));
  }, []);

  const setCustomDays = useCallback((days: CustomDaySlot[]) => {
    setState((prev) => ({ ...prev, customDays: days }));
  }, []);

  const setBlockedDates = useCallback((dates: string[]) => {
    setState((prev) => ({ ...prev, blockedDates: dates }));
  }, []);

  const addService = useCallback((s: Omit<Service, "id">) => {
    const id = crypto.randomUUID();
    setState((prev) => ({
      ...prev,
      services: [...prev.services, { ...s, id }],
    }));
  }, []);

  const updateService = useCallback((id: string, patch: Partial<Service>) => {
    setState((prev) => ({
      ...prev,
      services: prev.services.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  }, []);

  const deleteService = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      services: prev.services.filter((x) => x.id !== id),
      reservations: prev.reservations.filter((r) => r.serviceId !== id),
    }));
  }, []);

  const addClient = useCallback((c: Omit<Client, "id">) => {
    const id = crypto.randomUUID();
    setState((prev) => ({
      ...prev,
      clients: [...prev.clients, { ...c, id }],
    }));
  }, []);

  const updateClient = useCallback((id: string, patch: Partial<Client>) => {
    setState((prev) => ({
      ...prev,
      clients: prev.clients.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));
  }, []);

  const deleteClient = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      clients: prev.clients.filter((x) => x.id !== id),
      reservations: prev.reservations.map((r) =>
        r.clientId === id ? { ...r, clientId: null } : r
      ),
    }));
  }, []);

  const addReservation = useCallback(
    (input: {
      clientId: string | null;
      clientName: string;
      serviceId: string;
      start: Date;
    }): { ok: true; id: string } | { ok: false; error: string } => {
      let result: { ok: true; id: string } | { ok: false; error: string } = {
        ok: false,
        error: "Erreur",
      };
      setState((prev) => {
        const service = prev.services.find((s) => s.id === input.serviceId);
        if (!service) {
          result = { ok: false, error: "Service introuvable." };
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
          result = { ok: false, error: err };
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
        result = { ok: true, id };
        return { ...prev, reservations: [...prev.reservations, res] };
      });
      return result;
    },
    []
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
      return errorMsg ? { ok: false, error: errorMsg } : { ok: true };
    },
    []
  );

  const deleteReservation = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      reservations: prev.reservations.filter((r) => r.id !== id),
    }));
  }, []);

  const patchSettings = useCallback((patch: Partial<WavonState["settings"]>) => {
    setState((prev) => {
      const slug =
        patch.publicSlug !== undefined
          ? patch.publicSlug
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9-]/g, "-")
              .replace(/-+/g, "-")
              .replace(/^-|-$/g, "") || "demo"
          : undefined;
      const next = {
        ...prev.settings,
        ...patch,
        ...(slug !== undefined ? { publicSlug: slug } : {}),
      };
      return { ...prev, settings: next };
    });
  }, []);

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
