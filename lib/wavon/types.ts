export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const DAY_ORDER: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Lun",
  tue: "Mar",
  wed: "Mer",
  thu: "Jeu",
  fri: "Ven",
  sat: "Sam",
  sun: "Dim",
};

export type TimeSegment = { start: string; end: string }; // "HH:mm"

export type WeeklyDaySchedule = {
  enabled: boolean;
  segments: TimeSegment[];
};

export type AvailabilityMode = "fixed" | "custom";

export type CustomDaySlot = {
  date: string; // YYYY-MM-DD
  segments: TimeSegment[];
};

export type ReservationStatus = "confirmed" | "cancelled" | "pending";

export type Service = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  description: string;
  isActive: boolean;
  isPublic: boolean;
  color?: string | null;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  bookingNoticeHours?: number | null;
  sortOrder: number;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

export type Reservation = {
  id: string;
  clientId: string | null;
  clientName: string;
  serviceId: string;
  start: string; // ISO
  end: string; // ISO
  durationMin: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  status: ReservationStatus;
  createdAt: string;
};

export type ConfirmationMode = "auto" | "manual";

export type BusinessSettings = {
  /** Identité */
  businessName: string;
  address: string;
  phone: string;
  email?: string;
  businessType?: string;
  website?: string;
  city?: string;
  postalCode?: string;
  /** URL publique : /reserver/[publicSlug] */
  publicSlug: string;

  /** Réservation */
  minServiceDurationMin: number;
  minNoticeHours: number;
  maxDaysInAdvance: number;
  slotIntervalMinutes: number;
  minGapBetweenBookingsMinutes: number;
  sameDayBookingAllowed: boolean;
  allowCancellation: boolean;
  cancellationDeadlineHours: number;
  allowReschedule: boolean;
  rescheduleDeadlineHours: number;
  confirmationMode: ConfirmationMode;

  /** Page publique */
  publicDisplayName?: string;
  publicDescription?: string;
  publicWelcomeMessage?: string;
  publicLogoUrl?: string;
  publicLogoPath?: string;
  publicCoverUrl?: string;
  publicCoverPath?: string;
  publicShowPhone: boolean;
  publicShowAddress: boolean;
  publicShowDescription: boolean;
  publicAfterBookingMessage: string;
};

export type WhatsAppMessage = {
  id: string;
  direction: "in" | "out";
  content: string;
  at: string;
};

export type WhatsAppThread = {
  id: string;
  contactName: string;
  phone: string;
  messages: WhatsAppMessage[];
  updatedAt: string;
};

export type EmailTemplateType = "confirmation" | "reminder" | "cancellation";

export type EmailTemplate = {
  id: string;
  type: EmailTemplateType;
  isEnabled: boolean;
  subject: string;
  body: string;
};

export type WavonState = {
  version: 1;
  weekly: Record<DayKey, WeeklyDaySchedule>;
  availabilityMode: AvailabilityMode;
  /** Mode custom : créneaux par date */
  customDays: CustomDaySlot[];
  blockedDates: string[];
  services: Service[];
  clients: Client[];
  reservations: Reservation[];
  settings: BusinessSettings;
  emailTemplates: EmailTemplate[];
  whatsappThreads: WhatsAppThread[];
};
