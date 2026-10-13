/** Tipos, constantes y validacion del horario semanal y las tarifas. */

import { weekdayLabel } from "@/lib/format";

export type RangeDraft = {
  key: string;
  opens_at: string;
  closes_at: string;
  slot_minutes: number;
};

/** Indice = weekday (lunes = 0). */
export type WeekDraft = RangeDraft[][];

export const SLOT_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240];
export const MINUTES_PER_DAY = 24 * 60;

let rangeSeq = 0;

export function newKey(): string {
  rangeSeq += 1;
  return `range-${rangeSeq}`;
}

export function toMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

/** `00:00` como cierre es medianoche al final del dia. */
export function closeMinutes(value: string): number {
  return value === "00:00" ? MINUTES_PER_DAY : toMinutes(value);
}

export function fromMinutes(total: number): string {
  const clamped = Math.min(total, MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = String(Math.floor(clamped / 60)).padStart(2, "0");
  const minutes = String(clamped % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** Errores por rango y avisos generales. Con errores no se permite guardar. */
export function validateWeek(week: WeekDraft): { invalid: Set<string>; messages: string[] } {
  const invalid = new Set<string>();
  const messages: string[] = [];

  week.forEach((ranges, weekday) => {
    const day = weekdayLabel(weekday);
    ranges.forEach((range) => {
      const start = toMinutes(range.opens_at);
      const end = closeMinutes(range.closes_at);
      const label = `${range.opens_at}-${range.closes_at}`;
      if (end <= start) {
        invalid.add(range.key);
        messages.push(`El horario del ${day} ${label} debe cerrar despues de abrir.`);
      } else if (end - start < range.slot_minutes) {
        invalid.add(range.key);
        messages.push(
          `El horario del ${day} ${label} es mas corto que un bloque de ${range.slot_minutes} minutos.`,
        );
      }
    });

    for (let i = 0; i < ranges.length; i += 1) {
      for (let j = i + 1; j < ranges.length; j += 1) {
        const a = ranges[i];
        const b = ranges[j];
        if (
          toMinutes(a.opens_at) < closeMinutes(b.closes_at) &&
          toMinutes(b.opens_at) < closeMinutes(a.closes_at)
        ) {
          invalid.add(a.key);
          invalid.add(b.key);
          messages.push(
            `Los horarios del ${day} ${a.opens_at}-${a.closes_at} y ${b.opens_at}-${b.closes_at} se superponen.`,
          );
        }
      }
    }
  });

  return { invalid, messages };
}

export function localDateInput(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function minutesLabel(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  if (minutes % 60 === 0) return minutes === 60 ? "1 hora" : `${minutes / 60} horas`;
  return `${minutes} minutos`;
}

export function formatRateDate(value: string): string {
  return new Intl.DateTimeFormat("es-SV", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
