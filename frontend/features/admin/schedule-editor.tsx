"use client";

import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { LoadingBlock } from "@/components/atoms/states";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { weekdayLabel } from "@/lib/format";
import type { Facility } from "@/lib/types";

import { useAdminFacility, useSaveSchedules } from "./hooks";
import {
  closeMinutes,
  fromMinutes,
  localDateInput,
  MINUTES_PER_DAY,
  minutesLabel,
  newKey,
  SLOT_OPTIONS,
  toMinutes,
  validateWeek,
  type RangeDraft,
  type WeekDraft,
} from "./schedule-utils";

/** Editor del horario semanal de una instalacion (uno o varios rangos por dia). */
export function ScheduleEditor({ facility }: { facility: Facility }) {
  const detail = useAdminFacility(facility.id);
  const save = useSaveSchedules();
  const [draft, setDraft] = useState<WeekDraft | null>(null);

  const week: WeekDraft =
    draft ??
    Array.from({ length: 7 }, (_, weekday) =>
      (detail.data?.schedules ?? [])
        .filter((schedule) => schedule.weekday === weekday && schedule.is_active)
        .sort((left, right) => left.opens_at.localeCompare(right.opens_at))
        .map((schedule) => ({
          key: schedule.id,
          opens_at: schedule.opens_at.slice(0, 5),
          closes_at: schedule.closes_at.slice(0, 5),
          slot_minutes: schedule.slot_minutes,
        })),
    );

  const today = localDateInput();
  const rateMinutes = (detail.data?.rates ?? []).find(
    (rate) =>
      rate.is_active && rate.valid_from <= today && (!rate.valid_until || rate.valid_until >= today),
  )?.minimum_minutes;

  const { invalid, messages } = validateWeek(week);
  const serverError =
    save.error instanceof ApiError && save.error.status === 422 ? save.error.detail : null;

  function setDay(weekday: number, ranges: RangeDraft[]) {
    save.reset();
    setDraft(week.map((current, index) => (index === weekday ? ranges : current)));
  }

  function updateRange(weekday: number, key: string, patch: Partial<RangeDraft>) {
    setDay(
      weekday,
      week[weekday].map((range) => (range.key === key ? { ...range, ...patch } : range)),
    );
  }

  function addRange(weekday: number) {
    const ranges = week[weekday];
    const last = ranges[ranges.length - 1];
    const slot = last?.slot_minutes ?? rateMinutes ?? 60;
    const opens = last ? closeMinutes(last.closes_at) : toMinutes("08:00");
    const closes = Math.min(opens + Math.max(slot, 120), MINUTES_PER_DAY);
    setDay(weekday, [
      ...ranges,
      { key: newKey(), opens_at: fromMinutes(opens), closes_at: fromMinutes(closes), slot_minutes: slot },
    ]);
  }

  function copyToAll(weekday: number) {
    save.reset();
    setDraft(
      week.map((_, index) =>
        week[weekday].map((range) => ({ ...range, key: index === weekday ? range.key : newKey() })),
      ),
    );
  }

  function submit() {
    save.mutate({
      id: facility.id,
      schedules: week.flatMap((ranges, weekday) =>
        ranges.map((range) => ({
          weekday,
          opens_at: `${range.opens_at}:00`,
          closes_at: `${range.closes_at}:00`,
          slot_minutes: range.slot_minutes,
          is_active: true,
        })),
      ),
    });
  }

  const warnings = serverError ? [...messages, serverError] : messages;

  return (
    <section className="rounded-2xl border border-charcoal/15 bg-ivory p-5">
      <TechnicalLabel>HORARIO SEMANAL</TechnicalLabel>
      <p className="mt-1 text-sm text-charcoal/60">
        Define uno o varios rangos por dia y cuanto dura cada prestamo. Un cierre a las 00:00
        significa medianoche.
      </p>

      {detail.isPending ? (
        <div className="mt-3">
          <LoadingBlock />
        </div>
      ) : (
        <>
          {warnings.length > 0 ? (
            <div
              role="alert"
               className="mt-4 rounded-xl border border-state-error/40 bg-state-error/5 p-3 text-sm text-state-error"
            >
              <strong className="block font-semibold">
                Revisa el horario antes de guardar
              </strong>
              <ul className="mt-1 list-disc pl-5">
                {warnings.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <ul className="mt-4 space-y-4">
            {week.map((ranges, weekday) => (
              <li key={weekday} className="border-t border-charcoal/10 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{weekdayLabel(weekday)}</span>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => addRange(weekday)}>
                      + Agregar rango
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToAll(weekday)}
                    >
                      Copiar a todos los dias
                    </Button>
                  </div>
                </div>

                {ranges.length === 0 ? (
                  <p className="mt-1 text-xs text-charcoal/50">Cerrado</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {ranges.map((range) => {
                      const hasError = invalid.has(range.key);
                      const control = cn(
                         "min-h-11 rounded-xl border bg-ivory px-2 text-sm",
                        hasError ? "border-state-error" : "border-charcoal/25",
                      );
                      const slotOptions = SLOT_OPTIONS.includes(range.slot_minutes)
                        ? SLOT_OPTIONS
                        : [...SLOT_OPTIONS, range.slot_minutes].sort((a, b) => a - b);
                      return (
                        <li key={range.key}>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="time"
                              aria-label={`Apertura ${weekdayLabel(weekday)}`}
                              value={range.opens_at}
                              onChange={(event) =>
                                updateRange(weekday, range.key, { opens_at: event.target.value })
                              }
                              className={control}
                            />
                            <span aria-hidden="true" className="text-charcoal/40">
                              –
                            </span>
                            <input
                              type="time"
                              aria-label={`Cierre ${weekdayLabel(weekday)}`}
                              value={range.closes_at}
                              onChange={(event) =>
                                updateRange(weekday, range.key, { closes_at: event.target.value })
                              }
                              className={control}
                            />
                            <select
                              aria-label={`Duracion del prestamo ${weekdayLabel(weekday)}`}
                              value={range.slot_minutes}
                              onChange={(event) =>
                                updateRange(weekday, range.key, {
                                  slot_minutes: Number(event.target.value),
                                })
                              }
                              className={control}
                            >
                              {slotOptions.map((minutes) => (
                                <option key={minutes} value={minutes}>
                                  Bloques de {minutesLabel(minutes)}
                                </option>
                              ))}
                            </select>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setDay(
                                  weekday,
                                  ranges.filter((item) => item.key !== range.key),
                                )
                              }
                            >
                              Quitar
                            </Button>
                          </div>
                          {rateMinutes && range.slot_minutes % rateMinutes !== 0 ? (
                            <p className="mt-1 text-xs text-charcoal/60">
                              La tarifa cobra bloques de {minutesLabel(rateMinutes)}: cada prestamo
                              de {minutesLabel(range.slot_minutes)} se cobra redondeando hacia arriba.
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          <Button
            className="mt-5"
            size="sm"
            disabled={save.isPending || messages.length > 0}
            onClick={submit}
          >
            {save.isPending ? "Guardando…" : "Guardar horario"}
          </Button>
        </>
      )}
    </section>
  );
}
