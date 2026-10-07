"use client";

import { Fragment } from "react";

import { EmptyState, ErrorState, LoadingBlock } from "@/components/atoms/states";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { useAvailability } from "@/features/facilities/hooks";
import { cn } from "@/lib/cn";
import { formatMoney, formatTime } from "@/lib/format";
import type { Slot } from "@/lib/types";

const SLOT_STYLES: Record<Slot["status"], string> = {
  AVAILABLE: "border-olive/60 bg-ivory hover:border-terracotta hover:bg-sand/60",
  BUSY: "cursor-not-allowed border-charcoal/25 bg-charcoal/[0.06] text-charcoal/45",
  PAST: "cursor-not-allowed border-dashed border-charcoal/20 text-charcoal/35",
};

const SLOT_NOTE: Record<Slot["status"], string> = {
  AVAILABLE: "Libre",
  BUSY: "Ocupado",
  PAST: "Pasado",
};

/**
 * Calendario de bloques de un dia.
 *
 * Lo que se ve aqui es informativo: la disponibilidad real se confirma al crear
 * la reserva, cuando PostgreSQL aplica la restriccion anti-solapamiento.
 */
export function AvailabilityCalendar({
  facilityId,
  date,
  selected,
  onSelect,
  isBookable = true,
}: {
  facilityId: string;
  date: string;
  selected?: Slot[];
  onSelect?: (slot: Slot) => void;
  isBookable?: boolean;
}) {
  const { data, isPending, isError, error, refetch, isFetching } = useAvailability(
    facilityId,
    date,
  );

  if (isPending) return <LoadingBlock label="CONSULTANDO DISPONIBILIDAD" />;

  if (isError) {
    return (
      <ErrorState
        description={error instanceof Error ? error.message : "No se pudo leer la agenda."}
        action={
          <button
            onClick={() => void refetch()}
            className="text-sm font-semibold text-terracotta underline"
          >
            Reintentar
          </button>
        }
      />
    );
  }

  if (!data.is_open) {
    return (
      <EmptyState
        title="Cerrado este dia"
        description="La instalacion no tiene horario operativo en la fecha elegida. Proba con otro dia."
      />
    );
  }

  const available = data.slots.filter((slot) => slot.status === "AVAILABLE").length;
  const durations = Array.from(
    new Set(data.operating_windows.map((window) => window.slot_minutes)),
  );
  const blockLabel =
    durations.length > 1
      ? data.operating_windows
          .map(
            (window) =>
              `${formatTime(window.starts_at)}-${formatTime(window.ends_at)} EN ${window.slot_minutes} MIN`,
          )
          .join(" · ")
      : `BLOQUES DE ${durations[0] ?? data.slot_minutes} MIN`;

  return (
    <section aria-label="Bloques de disponibilidad">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <TechnicalLabel>
          {blockLabel} · {available} LIBRES DE {data.slots.length}
        </TechnicalLabel>
        {isFetching ? <TechnicalLabel>ACTUALIZANDO…</TechnicalLabel> : null}
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {data.slots.map((slot) => {
          const isSelected = (selected ?? []).some(
            (item) =>
              Date.parse(item.starts_at) <= Date.parse(slot.starts_at) &&
              Date.parse(slot.ends_at) <= Date.parse(item.ends_at),
          );
          const selectable = isBookable && slot.status === "AVAILABLE" && Boolean(onSelect);

          return (
            <li key={slot.starts_at}>
              <button
                type="button"
                disabled={!selectable}
                aria-pressed={isSelected}
                onClick={() => selectable && onSelect?.(slot)}
                className={cn(
                  "flex w-full min-h-16 flex-col items-start border px-3 py-2.5 text-left transition-colors duration-fast ease-technical",
                  SLOT_STYLES[slot.status],
                  isSelected && "border-terracotta bg-terracotta text-ivory hover:bg-terracotta",
                )}
              >
                <span className="font-mono text-sm font-medium">
                  {formatTime(slot.starts_at)} – {formatTime(slot.ends_at)}
                </span>
                <span
                  className={cn(
                    "mt-1 font-mono text-[10px] uppercase tracking-[0.14em]",
                    isSelected ? "text-sand" : "text-charcoal/55",
                  )}
                >
                  {slot.status === "AVAILABLE" && slot.amount
                    ? formatMoney(slot.amount, data.currency)
                    : SLOT_NOTE[slot.status]}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Legend />
    </section>
  );
}

function Legend() {
  const items: [string, string][] = [
    ["border-olive/60 bg-ivory", "Libre"],
    ["border-terracotta bg-terracotta", "Seleccionado"],
    ["border-charcoal/25 bg-charcoal/[0.06]", "Ocupado"],
    ["border-dashed border-charcoal/20", "Pasado"],
  ];

  return (
    <dl className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-charcoal/10 pt-4">
      {items.map(([style, label]) => (
        <Fragment key={label}>
          <dt aria-hidden="true" className={cn("h-3 w-3 border", style)} />
          <dd className="-ml-3 font-mono text-[10px] uppercase tracking-[0.14em] text-charcoal/60">
            {label}
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}
