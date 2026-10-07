/**
 * Cliente HTTP unico.
 *
 * La sesion viaja en una cookie HttpOnly, por eso toda peticion usa
 * `credentials: "include"`. El frontend nunca lee ni escribe esa cookie.
 */

import type {
  AdminReservation,
  AdminStats,
  Availability,
  Client,
  Facility,
  FacilityDetail,
  NotificationLog,
  Page,
  RangeCheck,
  Rate,
  Reservation,
  Schedule,
  ScheduleInput,
  User,
  UserRole,
  Zone,
} from "./types";

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/v1";

// En el navegador, localhost apunta al host del usuario. Durante SSR, Next.js
// corre dentro de su contenedor y debe resolver la API por el nombre del servicio.
export const API_URL =
  typeof window === "undefined"
    ? (process.env.INTERNAL_API_URL ?? PUBLIC_API_URL)
    : PUBLIC_API_URL;

/** Error `application/problem+json` devuelto por la API. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    readonly detail: string,
  ) {
    super(detail || title);
    this.name = "ApiError";
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  /** Solo para render en servidor: revalidacion de datos publicos. */
  revalidate?: number;
  signal?: AbortSignal;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, revalidate, signal } = options;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    signal,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    ...(revalidate !== undefined ? { next: { revalidate } } : { cache: "no-store" }),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.title ?? "Error inesperado",
      payload?.detail ?? "No se pudo completar la solicitud.",
    );
  }

  return payload as T;
}

function query(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const rendered = search.toString();
  return rendered ? `?${rendered}` : "";
}

// --------------------------------------------------------------------------- //
// Auth
// --------------------------------------------------------------------------- //

export const authApi = {
  loginWithGoogle: (credential: string) =>
    request<User>("/auth/google", { method: "POST", body: { credential } }),
  loginForDevelopment: (role: UserRole) =>
    request<User>("/auth/development", { method: "POST", body: { role } }),
  me: () => request<User>("/auth/me"),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
};

// --------------------------------------------------------------------------- //
// Catalogo y disponibilidad
// --------------------------------------------------------------------------- //

export type FacilityFilters = {
  zone?: Zone | "";
  sport_type?: string;
  facility_kind?: string;
  min_capacity?: number;
  only_bookable?: boolean;
  page?: number;
  limit?: number;
};

export const facilitiesApi = {
  list: (filters: FacilityFilters = {}, revalidate?: number) =>
    request<Page<Facility>>(`/facilities${query(filters)}`, { revalidate }),
  bySlug: (slug: string, revalidate?: number) =>
    request<FacilityDetail>(`/facilities/slug/${slug}`, { revalidate }),
  byId: (id: string) => request<FacilityDetail>(`/facilities/${id}`),
  availability: (facilityId: string, date: string, signal?: AbortSignal) =>
    request<Availability>(`/facilities/${facilityId}/availability?date=${date}`, { signal }),
  checkRange: (
    facilityId: string,
    date: string,
    start: string,
    end: string,
    signal?: AbortSignal,
  ) =>
    request<RangeCheck>(
      `/facilities/${facilityId}/availability/check${query({ date, start, end })}`,
      { signal },
    ),
};

// --------------------------------------------------------------------------- //
// Reservas de cliente
// --------------------------------------------------------------------------- //

export type CreateReservationInput = {
  facility_id: string;
  starts_at: string;
  ends_at: string;
  customer_note?: string;
};

export const reservationsApi = {
  create: (input: CreateReservationInput) =>
    request<Reservation>("/reservations", { method: "POST", body: input }),
  mine: (page = 1, limit = 50) =>
    request<Page<Reservation>>(`/reservations/me${query({ page, limit })}`),
  detail: (id: string) => request<Reservation>(`/reservations/${id}`),
  cancel: (id: string) =>
    request<Reservation>(`/reservations/${id}/cancel`, { method: "POST", body: {} }),
};

// --------------------------------------------------------------------------- //
// Administracion
// --------------------------------------------------------------------------- //

export type AdminReservationFilters = {
  status?: string;
  facility_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
};

export const adminApi = {
  clients: () => request<Client[]>("/admin/clients"),
  createClient: (body: {
    first_name: string;
    last_name: string;
    dui: string;
    phone: string;
    email: string;
  }) => request<Client>("/admin/clients", { method: "POST", body }),
  updateClient: (
    id: string,
    body: Partial<{
      first_name: string;
      last_name: string;
      dui: string;
      phone: string;
      email: string;
      is_active: boolean;
    }>,
  ) => request<Client>(`/admin/clients/${id}`, { method: "PATCH", body }),
  stats: () => request<AdminStats>("/admin/stats"),
  reservations: (filters: AdminReservationFilters = {}) =>
    request<Page<AdminReservation>>(`/admin/reservations${query(filters)}`),
  confirm: (id: string) =>
    request<AdminReservation>(`/admin/reservations/${id}/confirm`, { method: "POST" }),
  cancel: (id: string, note?: string) =>
    request<AdminReservation>(`/admin/reservations/${id}/cancel`, {
      method: "POST",
      body: { note: note ?? null },
    }),
  complete: (id: string) =>
    request<AdminReservation>(`/admin/reservations/${id}/complete`, { method: "POST" }),
  notifications: (id: string) =>
    request<NotificationLog[]>(`/admin/reservations/${id}/notifications`),
  retryNotification: (id: string) =>
    request<{ status: string; template: string }>(
      `/admin/reservations/${id}/notifications/retry`,
      { method: "POST" },
    ),
  facilities: (page = 1, limit = 100) =>
    request<Page<Facility>>(`/admin/facilities${query({ page, limit })}`),
  facility: (id: string) =>
    request<FacilityDetail>(`/admin/facilities/${id}`),
  createFacility: (body: Record<string, unknown>) =>
    request<FacilityDetail>("/admin/facilities", { method: "POST", body }),
  updateFacility: (id: string, body: Record<string, unknown>) =>
    request<FacilityDetail>(`/admin/facilities/${id}`, { method: "PATCH", body }),
  replaceSchedules: (id: string, schedules: ScheduleInput[]) =>
    request<Schedule[]>(`/admin/facilities/${id}/schedules`, {
      method: "POST",
      body: { schedules },
    }),
  createRate: (id: string, body: Record<string, unknown>) =>
    request<Rate>(`/admin/facilities/${id}/rates`, { method: "POST", body }),
  publishRate: (
    id: string,
    body: { amount: string; effective_from: string; minimum_minutes?: number },
  ) =>
    request<Rate>(`/admin/facilities/${id}/rates/publish`, { method: "POST", body }),
};
