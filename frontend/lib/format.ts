/** Formato de fechas, importes y etiquetas de dominio. */

import type { FacilityKind, ReservationStatus, SportType, Zone } from "./types";

const LOCALE = "es-GT";

/** Zona horaria operativa del complejo. Debe coincidir con COMPLEX_TIMEZONE. */
export const COMPLEX_TIMEZONE = "America/Guatemala";

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: COMPLEX_TIMEZONE,
  }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: COMPLEX_TIMEZONE,
  }).format(new Date(iso));
}

export function formatRange(startIso: string, endIso: string): string {
  return `${formatTime(startIso)} – ${formatTime(endIso)}`;
}

export function formatMoney(amount: string | number, currency = "USD"): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount));
}

/** `YYYY-MM-DD` de hoy en la zona del complejo, no la del navegador. */
export function todayInComplex(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: COMPLEX_TIMEZONE }).format(new Date());
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export function weekdayLabel(weekday: number): string {
  return ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"][weekday];
}

export const ZONE_LABEL: Record<Zone, string> = {
  ESTADIO: "Estadio",
  FUTBOL: "Futbol",
  ACUATICA: "Acuatica",
  CANCHAS: "Canchas",
  EVENTOS: "Eventos",
  SERVICIOS: "Servicios",
};

export const KIND_LABEL: Record<FacilityKind, string> = {
  STADIUM: "Estadio",
  FIELD: "Campo",
  COURT: "Cancha",
  POOL: "Piscina",
  EVENT_SPACE: "Salon",
  MULTIUSE: "Multiuso",
};

export const SPORT_LABEL: Record<SportType, string> = {
  FOOTBALL_11: "Futbol 11",
  FOOTBALL_7: "Futbol 7",
  FOOTBALL_5: "Futbol 5",
  BASKETBALL: "Baloncesto",
  SWIMMING: "Natacion",
  EVENT: "Eventos",
  MULTIUSE: "Multiuso",
};

export const STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
  COMPLETED: "Completada",
};

const SURFACE_LABEL: Record<string, string> = {
  NATURAL_GRASS: "Cesped natural",
  SYNTHETIC_GRASS: "Cesped sintetico",
  HARDWOOD: "Duela",
  TILE: "Ceramica",
  POLISHED_CONCRETE: "Concreto pulido",
  DECK: "Deck",
  ASPHALT: "Asfalto",
};

export function surfaceLabel(surface: string | null): string {
  if (!surface) return "No aplica";
  return SURFACE_LABEL[surface] ?? surface;
}

/** Imagen de respaldo cuando la instalacion todavia no tiene galeria propia. */
const KIND_IMAGE: Record<FacilityKind, string> = {
  STADIUM: "/facilities/stadium.svg",
  FIELD: "/facilities/field.svg",
  COURT: "/facilities/court.svg",
  POOL: "/facilities/pool.svg",
  EVENT_SPACE: "/facilities/event.svg",
  MULTIUSE: "/facilities/multiuse.svg",
};

export function facilityImage(
  kind: FacilityKind,
  images: { url: string }[] = [],
): string {
  return images[0]?.url ?? KIND_IMAGE[kind];
}
