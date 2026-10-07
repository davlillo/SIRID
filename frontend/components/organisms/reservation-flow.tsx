"use client";

/**
 * Flujo de reserva en cuatro pasos: fecha, bloque, datos y confirmacion.
 * La seleccion se conserva en pantalla hasta el POST final (spect/17).
 */

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { Field, Textarea } from "@/components/atoms/field";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { GoogleAuthButton } from "@/features/auth/auth-button";
import { useAuth } from "@/features/auth/auth-context";
import { useCreateReservation } from "@/features/reservations/hooks";
import { cn } from "@/lib/cn";
import { formatDate, formatMoney, formatTime, todayInComplex } from "@/lib/format";
import type { FacilityDetail, Slot } from "@/lib/types";
import { DateStepper } from "../molecules/date-stepper";
import { AvailabilityCalendar } from "./availability-calendar";
import { RangeChecker } from "./range-checker";

const STEPS = ["Fecha", "Bloque", "Datos", "Confirmar"] as const;

export function ReservationFlow({ facility }: { facility: FacilityDetail }) {
  const router = useRouter();
  const { user } = useAuth();
  const createReservation = useCreateReservation();

  const [date, setDate] = useState(todayInComplex());
  // Varios tramos solo cuando se reserva un dia con entretiempo.
  const [selection, setSelection] = useState<Slot[]>([]);
  const [note, setNote] = useState("");

  const step = selection.length === 0 ? 1 : !user ? 3 : 4;
  const total = selection.reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  async function submit() {
    if (selection.length === 0) return;
    let lastId = "";
    // Una solicitud por tramo; si una falla, el hook avisa y se detiene aqui.
    for (const item of selection) {
      const reservation = await createReservation.mutateAsync({
        facility_id: facility.id,
        starts_at: item.starts_at,
        ends_at: item.ends_at,
        customer_note: note.trim() || undefined,
      });
      lastId = reservation.id;
    }
    router.push(`/mis-reservas?nueva=${lastId}`);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <div>
        <Stepper current={step} />

        <div className="mt-6 space-y-6">
          <div>
            <TechnicalLabel>PASO 1 · ELEGI LA FECHA</TechnicalLabel>
            <div className="mt-2">
              <DateStepper
                value={date}
                onChange={(next) => {
                  setDate(next);
                  setSelection([]);
                }}
              />
            </div>
          </div>

          <div>
            <TechnicalLabel>PASO 2 · ELEGI EL BLOQUE</TechnicalLabel>
            <div className="mt-2 space-y-4">
              <RangeChecker
                key={date}
                facilityId={facility.id}
                date={date}
                onPick={setSelection}
                isBookable={facility.is_bookable}
              />
              <AvailabilityCalendar
                facilityId={facility.id}
                date={date}
                selected={selection}
                onSelect={(slot) => setSelection([slot])}
                isBookable={facility.is_bookable}
              />
            </div>
          </div>

          <div>
            <TechnicalLabel>PASO 3 · DATOS DE LA SOLICITUD</TechnicalLabel>
            <div className="mt-2">
              <Field
                label="Nota para el administrador (opcional)"
                htmlFor="customer-note"
                hint="Contanos el motivo: partido, entrenamiento, evento…"
              >
                <Textarea
                  id="customer-note"
                  maxLength={1000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Entrenamiento semanal del equipo."
                />
              </Field>
            </div>
          </div>
        </div>
      </div>

      <aside className="sticky top-24 border border-charcoal bg-sand/40 p-5">
        <TechnicalLabel>PASO 4 · RESUMEN</TechnicalLabel>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em]">
          {facility.name}
        </h2>

        <dl className="mt-5 space-y-3 border-y border-charcoal/15 py-4 text-sm">
          <Row label="Fecha" value={formatDate(`${date}T12:00:00Z`)} />
          <Row
            label="Horario"
            value={
              selection.length > 0
                ? selection
                    .map((item) => `${formatTime(item.starts_at)} – ${formatTime(item.ends_at)}`)
                    .join(" y ")
                : "Sin elegir"
            }
          />
          {selection.length > 1 ? (
            <Row label="Solicitudes" value={`${selection.length} tramos por el entretiempo`} />
          ) : null}
          <Row label="Ubicacion" value={facility.location_label} />
          <Row
            label="Importe"
            value={selection.some((item) => item.amount) ? formatMoney(total) : "—"}
            emphasis
          />
        </dl>

        <p className="mt-4 text-xs leading-5 text-charcoal/65">
          El importe lo calcula el servidor con la tarifa vigente y queda congelado en la
          reserva. La solicitud entra como <strong>pendiente</strong> hasta que un administrador
          la confirme.
        </p>

        <div className="mt-5">
          {!user ? (
            <div className="space-y-3">
              <TechnicalLabel>INICIA SESION PARA CONFIRMAR</TechnicalLabel>
              <GoogleAuthButton />
            </div>
          ) : (
            <Button
              className="w-full"
              size="lg"
              disabled={selection.length === 0 || createReservation.isPending}
              onClick={() => void submit()}
            >
              {createReservation.isPending ? "Enviando…" : "Confirmar solicitud"}
            </Button>
          )}
        </div>
      </aside>
    </div>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-olive">{label}</dt>
      <dd className={cn("text-right", emphasis && "font-display text-xl font-semibold")}>
        {value}
      </dd>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {STEPS.map((label, index) => {
        const number = index + 1;
        const done = number < current;
        const active = number === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em]",
              done && "border-olive bg-olive text-ivory",
              active && "border-terracotta bg-terracotta text-ivory",
              !done && !active && "border-charcoal/25 text-charcoal/50",
            )}
          >
            <span>{String(number).padStart(2, "0")}</span>
            <span>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
