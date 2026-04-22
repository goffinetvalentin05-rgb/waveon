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
  /**
   * Liste d'employés autorisés à effectuer ce service.
   * Tableau vide = tous les employés actifs (comportement par défaut).
   */
  employeeIds?: string[];
  bufferBeforeMin: number;
  bufferAfterMin: number;
  bookingNoticeHours?: number | null;
  sortOrder: number;
};

export type Employee = {
  id: string;
  businessId: string;
  name: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  color: string;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
  privateNote: string;
};

export type Reservation = {
  id: string;
  clientId: string | null;
  clientName: string;
  serviceId: string;
  employeeId?: string | null;
  start: string; // ISO
  end: string; // ISO
  durationMin: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  status: ReservationStatus;
  createdAt: string;
  notes: string;
};

export type ConfirmationMode = "auto" | "manual";

export type BusinessSettings = {
  /** Identité */
  businessName: string;
  /** ISO 4217 : CHF, EUR, USD, GBP, CAD */
  currency: string;
  address: string;
  phone: string;
  email?: string;
  businessType?: string;
  website?: string;
  city?: string;
  postalCode?: string;
  /** URL publique : /{publicSlug} */
  publicSlug: string;

  /** Réservation */
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

  /** Emails : notifications commerçant (séparé des emails clients) */
  notifyOwnerOnNewReservation: boolean;
  notifyOwnerOnCancellation: boolean;
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

export type EmailSettingType = "reminder_before" | "post_service";

export type EmailCustomLinks = {
  google_review?: string;
  instagram?: string;
  tiktok?: string;
  website?: string;
  other_label?: string;
  other_url?: string;
};

export type EmailSetting = {
  id: string;
  type: EmailSettingType;
  enabled: boolean;
  delayHours: number;
  subject: string;
  body: string;
  customLinks: EmailCustomLinks;
};

export type WavonState = {
  version: 1;
  employees?: Employee[];
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
  emailSettings?: EmailSetting[];
  whatsappThreads: WhatsAppThread[];
};
