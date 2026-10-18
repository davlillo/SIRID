/** Espejo del contrato de la API (spect/04-contrato-api.md). */

export type UserRole = "CLIENT" | "ENCARGADO" | "ADMIN";

export type Zone = "ESTADIO" | "FUTBOL" | "ACUATICA" | "CANCHAS" | "EVENTOS" | "SERVICIOS";

export type FacilityKind =
  | "STADIUM"
  | "FIELD"
  | "COURT"
  | "POOL"
  | "EVENT_SPACE"
  | "MULTIUSE";

export type SportType =
  | "FOOTBALL_11"
  | "FOOTBALL_7"
  | "FOOTBALL_5"
  | "BASKETBALL"
  | "SWIMMING"
  | "EVENT"
  | "MULTIUSE";

export type ReservationStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

export type SlotStatus = "AVAILABLE" | "BUSY" | "PAST";

export type User = {
  id: string;
  organization_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: UserRole;
};

export type Client = {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  dui: string;
  phone: string;
  email: string;
  is_active: boolean;
};

export type FacilityImage = {
  url: string;
  alt_text: string;
  sort_order: number;
};

export type Facility = {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  description: string;
  sport_type: SportType;
  facility_kind: FacilityKind;
  zone: Zone;
  surface: string | null;
  capacity: number;
  location_label: string;
  is_bookable: boolean;
  is_active: boolean;
  map_x: string | null;
  map_y: string | null;
  map_z: string | null;
  map_width: string | null;
  map_depth: string | null;
  images: FacilityImage[];
};

export type Organization = {
  id: string;
  name: string;
  slug: string;
  email_domain: string | null;
  is_active: boolean;
};

export type PublicOrganization = Pick<Organization, "id" | "name" | "slug">;

export type ManagedUser = {
  id: string;
  organization_id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
};

export type ScheduleInput = {
  weekday: number;
  opens_at: string;
  /** `00:00:00` significa cierre a medianoche. */
  closes_at: string;
  /** Duracion de cada bloque de prestamo en este rango. */
  slot_minutes: number;
  is_active: boolean;
};

export type Schedule = ScheduleInput & { id: string };

export type Rate = {
  id: string;
  name: string;
  amount: string;
  currency: string;
  minimum_minutes: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
};

export type FacilityDetail = Facility & {
  metadata: Record<string, unknown>;
  schedules: Schedule[];
  rates: Rate[];
};

export type Interval = {
  starts_at: string;
  ends_at: string;
};

export type Slot = Interval & {
  status: SlotStatus;
  amount: string | null;
};

export type OperatingWindow = Interval & {
  slot_minutes: number;
};

export type Availability = {
  facility_id: string;
  date: string;
  timezone: string;
  is_open: boolean;
  /** Duracion de la primera ventana; la real va en cada `operating_windows`. */
  slot_minutes: number;
  currency: string;
  operating_windows: OperatingWindow[];
  busy: Interval[];
  slots: Slot[];
};

export type RangeStatus =
  | "AVAILABLE"
  | "BUSY"
  | "PAST"
  | "CLOSED"
  | "OUTSIDE_HOURS"
  | "UNAVAILABLE";

export type QuotedInterval = Interval & {
  amount: string | null;
};

export type RangeCheck = Interval & {
  facility_id: string;
  date: string;
  timezone: string;
  currency: string;
  status: RangeStatus;
  amount: string | null;
  alternatives: QuotedInterval[];
};

export type Reservation = {
  id: string;
  facility: {
    id: string;
    organization_id: string;
    slug: string;
    name: string;
    facility_kind: FacilityKind;
    location_label: string;
  };
  starts_at: string;
  ends_at: string;
  status: ReservationStatus;
  quoted_amount: string;
  currency: string;
  customer_note: string | null;
  admin_note: string | null;
  created_at: string;
};

export type AdminReservation = Reservation & {
  customer: { id: string; name: string; email: string };
};

export type ReservationPayment = {
  id: string;
  reservation_id: string;
  amount: string;
  currency: string;
  note: string | null;
  recorded_by_id: string | null;
  created_at: string;
};

export type ReservationPaymentsSummary = {
  quoted_amount: string;
  total_paid: string;
  balance_due: string;
  currency: string;
  payments: ReservationPayment[];
};

export type AdminStats = {
  pending: number;
  confirmed_today: number;
  reservations_today: number;
  quoted_today: string;
  occupancy_rate_today: number;
  bookable_facilities: number;
};

export type AdminReservationReport = {
  total_reservations: number;
  by_status: { status: ReservationStatus; reservations: number }[];
  by_facility: {
    facility_id: string;
    facility_name: string;
    reservations: number;
  }[];
  quoted_by_currency: { currency: string; quoted_amount: string }[];
};

export type NotificationLog = {
  id: string;
  reservation_id: string | null;
  recipient: string;
  template: string;
  status: "SENT" | "FAILED" | "SKIPPED";
  error_detail: string | null;
  created_at: string;
};

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};
