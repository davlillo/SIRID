"use client";

import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { Field, Select } from "@/components/atoms/field";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import {
  useAvailability,
  useRangeCheck,
  useRangeChecks,
  type RangeQuery,
} from "@/features/facilities/hooks";
import { cn } from "@/lib/cn";
import { COMPLEX_TIMEZONE, formatMoney, formatRange } from "@/lib/format";
import type { QuotedInterval, RangeStatus, Slot } from "@/lib/types";

const STATUS_MESSAGE: Record<RangeStatus, { title: string; description: string }> = {
  AVAILABLE: { title: "Horario libre", description: "Podes reservar este rango." },
  BUSY: {
    title: "Horario ocupado",
    description: "Ya hay una reserva que se cruza con este rango.",
  },
  PAST: { title: "Horario pasado", description: "El rango ya comenzo." },
  CLOSED: { title: "Cerrado este dia", description: "La instalacion no opera en esta fecha." },
  OUTSIDE_HOURS: {
    title: "Fuera de horario",
    description: "El rango no cabe dentro del horario operativo.",
  },
  UNAVAILABLE: {
    title: "No disponible",
    description: "La instalacion no admite reservas en este momento.",
  },
};

/** `HH:MM` en la zona del complejo; medianoche se envia como `00:00`. */
function localTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: COMPLEX_TIMEZONE,
  }).format(new Date(iso));
}

/**
 * Consulta de un rango de horas concreto (inicio y fin) para una fecha.
 * Si el rango no se puede reservar, ofrece alternativas del mismo dia.
 */
export function RangeChecker({
  facilityId,
  date,
  isBookable = true,
  onPick,
}: {
  facilityId: string;
  date: string;
  isBookable?: boolean;
  /** Uno o varios tramos; varios cuando se reserva un dia con entretiempo. */
  onPick?: (slots: Slot[]) => void;
}) {
  const availability = useAvailability(facilityId, date);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [range, setRange] = useState<RangeQuery | null>(null);
  const [wholeDay, setWholeDay] = useState(false);
  const check = useRangeCheck(facilityId, range);

  const windows = availability.data?.operating_windows ?? [];
  const segments: RangeQuery[] = wholeDay
    ? windows.map((window) => ({
        date,
        start: localTime(window.starts_at),
        end: localTime(window.ends_at),
      }))
    : [];
  const segmentChecks = useRangeChecks(facilityId, segments);

  if (!availability.data?.is_open) return null;

  const slots = availability.data.slots;
  const breaks = windows.slice(1).map((window, index) => ({
    starts_at: windows[index].ends_at,
    ends_at: window.starts_at,
  }));
  const startOptions = slots.map((slot) => slot.starts_at);
  // El fin se limita al rango que contiene el inicio: no se cruza un hueco entre rangos.
  const startMs = start ? Date.parse(start) : NaN;
  const startWindow = availability.data.operating_windows.find(
    (item) => Date.parse(item.starts_at) <= startMs && startMs < Date.parse(item.ends_at),
  );
  const endOptions = startWindow
    ? slots
        .filter(
          (slot) =>
            Date.parse(slot.starts_at) >= startMs &&
            Date.parse(slot.ends_at) <= Date.parse(startWindow.ends_at),
        )
        .map((slot) => slot.ends_at)
    : [];

  function consult(from = start, to = end) {
    if (!from || !to) return;
    setWholeDay(false);
    setRange({ date, start: localTime(from), end: localTime(to) });
  }

  function consultWholeDay() {
    if (windows.length > 1) {
      // Con entretiempo no hay un rango continuo: se consulta tramo por tramo.
      setStart("");
      setEnd("");
      setRange(null);
      setWholeDay(true);
      return;
    }
    const first = slots[0]?.starts_at;
    const last = slots[slots.length - 1]?.ends_at;
    if (!first || !last) return;
    setStart(first);
    setEnd(last);
    consult(first, last);
  }

  function pick(...intervals: QuotedInterval[]) {
    onPick?.(intervals.map((interval) => ({ ...interval, status: "AVAILABLE" })));
  }

  const segmentResults = segmentChecks.map((query) => query.data);
  const segmentsLoading = wholeDay && segmentChecks.some((query) => query.isPending);
  const freeSegments = segmentResults.filter(
    (result): result is NonNullable<typeof result> => result?.status === "AVAILABLE",
  );
  const allFree = freeSegments.length === segments.length && segments.length > 0;
  const segmentsTotal = freeSegments.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  const currency = segmentResults[0]?.currency ?? availability.data.currency;

  return (
    <section
      aria-label="Consultar un horario especifico"
      className="border border-charcoal/15 bg-sand/30 p-4"
    >
      <TechnicalLabel>CONSULTAR UN HORARIO ESPECIFICO</TechnicalLabel>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <Field label="Desde" htmlFor="range-start">
          <Select
            id="range-start"
            value={start}
            onChange={(event) => {
              setStart(event.target.value);
              setEnd("");
              setWholeDay(false);
            }}
          >
            <option value="">Hora de inicio</option>
            {startOptions.map((iso) => (
              <option key={iso} value={iso}>
                {localTime(iso)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Hasta" htmlFor="range-end">
          <Select
            id="range-end"
            value={end}
            disabled={!start}
            onChange={(event) => setEnd(event.target.value)}
          >
            <option value="">Hora de fin</option>
            {endOptions.map((iso) => (
              <option key={iso} value={iso}>
                {localTime(iso)}
              </option>
            ))}
          </Select>
        </Field>

        <Button
          type="button"
          variant="secondary"
          disabled={!start || !end || check.isFetching}
          onClick={() => consult()}
        >
          {check.isFetching ? "Consultando…" : "Consultar"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          disabled={slots.length === 0 || check.isFetching || segmentsLoading}
          onClick={consultWholeDay}
        >
          Todo el dia
        </Button>
      </div>

      {wholeDay ? (
        <div className="mt-4 border-t border-charcoal/10 pt-4" aria-live="polite">
          <div className="border-l-2 border-terracotta bg-ivory/70 px-3 py-2 text-sm">
            <strong className="font-semibold">Este dia tiene entretiempo.</strong>{" "}
            La instalacion cierra{" "}
            {breaks.map((gap) => formatRange(gap.starts_at, gap.ends_at)).join(" y ")}, asi que
            todo el dia se reserva en {segments.length} tramos separados, una solicitud por tramo.
          </div>

          {segmentsLoading ? (
            <p className="mt-3 text-sm text-charcoal/60">Consultando tramos…</p>
          ) : (
            <>
              <ul className="mt-3 space-y-1.5">
                {windows.map((window, index) => {
                  const result = segmentResults[index];
                  const status = result?.status;
                  return (
                    <li
                      key={window.starts_at}
                      className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
                    >
                      <span className="font-mono">
                        Tramo {index + 1} · {formatRange(window.starts_at, window.ends_at)}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-xs",
                          status === "AVAILABLE" ? "text-olive" : "text-terracotta",
                        )}
                      >
                        {status ? STATUS_MESSAGE[status].title : "Sin respuesta"}
                        {status === "AVAILABLE" && result?.amount
                          ? ` · ${formatMoney(result.amount, currency)}`
                          : ""}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {isBookable && onPick && freeSegments.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm">{formatMoney(segmentsTotal, currency)}</span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      pick(
                        ...freeSegments.map((item) => ({
                          starts_at: item.starts_at,
                          ends_at: item.ends_at,
                          amount: item.amount,
                        })),
                      )
                    }
                  >
                    {allFree
                      ? `Reservar todo el dia (${segments.length} tramos)`
                      : `Reservar solo los tramos libres (${freeSegments.length})`}
                  </Button>
                </div>
              ) : null}

              {freeSegments.length === 0 ? (
                <p className="mt-3 text-sm text-charcoal/70">
                  Ningun tramo esta libre este dia. Proba con otra fecha.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {!wholeDay && range && check.isError ? (
        <p role="alert" className="mt-4 text-sm font-medium text-state-error">
          {check.error instanceof Error ? check.error.message : "No se pudo consultar."}
        </p>
      ) : null}

      {!wholeDay && range && check.data ? (
        <div className="mt-4 border-t border-charcoal/10 pt-4" aria-live="polite">
          <p
            className={cn(
              "font-display text-lg font-semibold",
              check.data.status === "AVAILABLE" ? "text-olive" : "text-terracotta",
            )}
          >
            {STATUS_MESSAGE[check.data.status].title} ·{" "}
            {formatRange(check.data.starts_at, check.data.ends_at)}
          </p>
          <p className="mt-1 text-sm text-charcoal/70">
            {STATUS_MESSAGE[check.data.status].description}
          </p>

          {check.data.status === "AVAILABLE" ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {check.data.amount ? (
                <span className="font-mono text-sm">
                  {formatMoney(check.data.amount, check.data.currency)}
                </span>
              ) : null}
              {isBookable && onPick ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    pick({
                      starts_at: check.data.starts_at,
                      ends_at: check.data.ends_at,
                      amount: check.data.amount,
                    })
                  }
                >
                  Reservar este horario
                </Button>
              ) : null}
            </div>
          ) : null}

          {check.data.status !== "AVAILABLE" && check.data.alternatives.length > 0 ? (
            <div className="mt-3">
              <TechnicalLabel>ALTERNATIVAS DISPONIBLES ESE DIA</TechnicalLabel>
              <ul className="mt-2 flex flex-wrap gap-2">
                {check.data.alternatives.map((item) => (
                  <li key={item.starts_at}>
                    <button
                      type="button"
                      disabled={!isBookable || !onPick}
                      onClick={() => pick(item)}
                      className="border border-olive/60 bg-ivory px-3 py-2 text-left font-mono text-sm transition-colors duration-fast ease-technical hover:border-terracotta hover:bg-sand/60 disabled:cursor-not-allowed"
                    >
                      {formatRange(item.starts_at, item.ends_at)}
                      {item.amount ? (
                        <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-charcoal/55">
                          {formatMoney(item.amount, check.data.currency)}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {check.data.status !== "AVAILABLE" && check.data.alternatives.length === 0 ? (
            <p className="mt-3 text-sm text-charcoal/70">
              No quedan horarios con esa duracion este dia. Proba con otra fecha.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
