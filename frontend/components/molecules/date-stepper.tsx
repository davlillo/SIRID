"use client";

import { Button } from "@/components/atoms/button";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { addDays, formatDate, todayInComplex } from "@/lib/format";

/** Selector de fecha: no permite retroceder antes de hoy. */
export function DateStepper({
  value,
  onChange,
  daysAhead = 60,
}: {
  value: string;
  onChange: (date: string) => void;
  daysAhead?: number;
}) {
  const today = todayInComplex();
  const maxDate = addDays(today, daysAhead);
  const canGoBack = value > today;

  return (
    <div className="flex flex-wrap items-center gap-3 border border-charcoal/20 bg-sand/30 p-3">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange(addDays(value, -1))}
        disabled={!canGoBack}
        aria-label="Dia anterior"
      >
        ←
      </Button>

      <div className="flex-1">
        <TechnicalLabel>FECHA SELECCIONADA</TechnicalLabel>
        <p className="mt-0.5 font-display text-lg font-semibold capitalize">
          {formatDate(`${value}T12:00:00Z`)}
        </p>
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange(addDays(value, 1))}
        disabled={value >= maxDate}
        aria-label="Dia siguiente"
      >
        →
      </Button>

      <label className="sr-only" htmlFor="date-input">
        Elegir fecha
      </label>
      <input
        id="date-input"
        type="date"
        value={value}
        min={today}
        max={maxDate}
        onChange={(event) => event.target.value && onChange(event.target.value)}
        className="min-h-11 border border-charcoal/25 bg-ivory px-3 text-sm outline-none focus:border-terracotta"
      />
    </div>
  );
}
