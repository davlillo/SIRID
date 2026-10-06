/** Espejo del contrato de la API (spect/04-contrato-api.md). */

export type UserRole = "CLIENT" | "ADMIN";

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
  email: string;
  name: string;
  avatar_url: string | null;
  role: UserRole;
};

export type FacilityImage = {
  url: string;
  alt_text: string;
  sort_order: number;
};

export type Facility = {
  id: string;
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

export type Schedule = {
  id: string;
  weekday: number;
  opens_at: string;
  closes_at: string;
  is_active: boolean;
};

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

export type Availability = {
  facility_id: string;
  date: string;
  timezone: string;
  is_open: boolean;
  slot_minutes: number;
  currency: string;
  operating_windows: Interval[];
  busy: Interval[];
  slots: Slot[];
};

export type Reservation = {
  id: string;
  facility: {
    id: string;
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

export type AdminStats = {
  pending: number;
  confirmed_today: number;
  reservations_today: number;
  quoted_today: string;
  occupancy_rate_today: number;
  bookable_facilities: number;
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
