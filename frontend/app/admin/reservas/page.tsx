"use client";

import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { Field, Input, Select, Textarea } from "@/components/atoms/field";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/atoms/states";
import { StatusBadge } from "@/components/atoms/status-badge";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { AdminLayout } from "@/components/templates/admin-layout";
import {
  useAdminFacilities,
  useAdminReservations,
  useReservationAction,
  useReservationNotifications,
  useRetryNotification,
} from "@/features/admin/hooks";
import { STATUS_LABEL, formatDate, formatMoney, formatRange } from "@/lib/format";
import type { AdminReservation, ReservationStatus } from "@/lib/types";

const STATUSES: ReservationStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];

export default function AdminReservationsPage() {
  const [filters, setFilters] = useState({
    status: "PENDING" as ReservationStatus | "",
    facility_id: "",
    date_from: "",
    date_to: "",
  });
  const [selected, setSelected] = useState<AdminReservation | null>(null);

  const facilities = useAdminFacilities();
  const reservations = useAdminReservations({
    status: filters.status || undefined,
    facility_id: filters.facility_id || undefined,
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
    limit: 50,
  });

  return (
    <AdminLayout>
      <TechnicalLabel>RESERVATIONS_01</TechnicalLabel>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em]">Reservas</h1>

      <form
        className="mt-6 grid gap-4 border border-charcoal/20 bg-sand/30 p-5 md:grid-cols-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <Field label="Estado" htmlFor="f-status">
          <Select
            id="f-status"
            value={filters.status}
            onChange={(event) =>
              setFilters((c) => ({ ...c, status: event.target.value as ReservationStatus | "" }))
            }
          >
            <option value="">Todos</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Instalacion" htmlFor="f-facility">
          <Select
            id="f-facility"
            value={filters.facility_id}
            onChange={(event) => setFilters((c) => ({ ...c, facility_id: event.target.value }))}
          >
            <option value="">Todas</option>
            {facilities.data?.items.map((facility) => (
              <option key={facility.id} value={facility.id}>
                {facility.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Desde" htmlFor="f-from">
          <Input
            id="f-from"
            type="date"
            value={filters.date_from}
            onChange={(event) => setFilters((c) => ({ ...c, date_from: event.target.value }))}
          />
        </Field>

        <Field label="Hasta" htmlFor="f-to">
          <Input
            id="f-to"
            type="date"
            value={filters.date_to}
            onChange={(event) => setFilters((c) => ({ ...c, date_to: event.target.value }))}
          />
        </Field>
      </form>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr] xl:items-start">
        <div className="min-w-0">
          {reservations.isPending ? <LoadingBlock label="CARGANDO RESERVAS" /> : null}
          {reservations.isError ? (
            <ErrorState description="No se pudo leer el listado de reservas." />
          ) : null}
          {reservations.data?.items.length === 0 ? (
            <EmptyState
              title="Sin reservas"
              description="Ninguna reserva coincide con los filtros seleccionados."
            />
          ) : null}

          {reservations.data && reservations.data.items.length > 0 ? (
            <div className="overflow-x-auto border border-charcoal/20">
              <table className="w-full min-w-[46rem] border-collapse text-sm">
                <caption className="sr-only">Listado administrativo de reservas</caption>
                <thead>
                  <tr className="bg-charcoal text-ivory">
                    {["Instalacion", "Cliente", "Periodo", "Importe", "Estado"].map((head) => (
                      <th
                        key={head}
                        scope="col"
                        className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em]"
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reservations.data.items.map((reservation) => (
                    <tr
                      key={reservation.id}
                      onClick={() => setSelected(reservation)}
                      className={
                        selected?.id === reservation.id
                          ? "cursor-pointer border-t border-charcoal/10 bg-sand"
                          : "cursor-pointer border-t border-charcoal/10 hover:bg-sand/40"
                      }
                    >
                      <td className="px-3 py-2.5 font-medium">{reservation.facility.name}</td>
                      <td className="px-3 py-2.5">
                        <span className="block">{reservation.customer.name}</span>
                        <span className="font-mono text-[10px] text-charcoal/55">
                          {reservation.customer.email}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {formatDate(reservation.starts_at)}
                        <br />
                        {formatRange(reservation.starts_at, reservation.ends_at)}
                      </td>
                      <td className="px-3 py-2.5 font-mono">
                        {formatMoney(reservation.quoted_amount, reservation.currency)}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={reservation.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <DetailPanel reservation={selected} onClose={() => setSelected(null)} />
      </div>
    </AdminLayout>
  );
}

function DetailPanel({
  reservation,
  onClose,
}: {
  reservation: AdminReservation | null;
  onClose: () => void;
}) {
  const action = useReservationAction();
  const retry = useRetryNotification();
  const notifications = useReservationNotifications(reservation?.id ?? null);
  const [note, setNote] = useState("");

  if (!reservation) {
    return (
      <aside className="border border-dashed border-charcoal/25 p-6">
        <TechnicalLabel>DETALLE</TechnicalLabel>
        <p className="mt-3 text-sm text-charcoal/60">
          Selecciona una fila de la tabla para ver el detalle y aplicar acciones.
        </p>
      </aside>
    );
  }

  const finished = new Date(reservation.ends_at).getTime() < Date.now();
  const canConfirm = reservation.status === "PENDING";
  const canCancel = reservation.status === "PENDING" || reservation.status === "CONFIRMED";
  const canComplete = reservation.status === "CONFIRMED" && finished;

  return (
    <aside className="border border-charcoal bg-sand/30 p-5 xl:sticky xl:top-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <TechnicalLabel>DETALLE · {reservation.id.slice(0, 8)}</TechnicalLabel>
          <h2 className="mt-1 font-display text-2xl font-semibold">
            {reservation.facility.name}
          </h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar detalle">
          ✕
        </Button>
      </div>

      <dl className="mt-4 divide-y divide-charcoal/10 text-sm">
        <Row label="Cliente" value={reservation.customer.name} />
        <Row label="Correo" value={reservation.customer.email} />
        <Row label="Fecha" value={formatDate(reservation.starts_at)} />
        <Row label="Horario" value={formatRange(reservation.starts_at, reservation.ends_at)} />
        <Row
          label="Importe"
          value={formatMoney(reservation.quoted_amount, reservation.currency)}
        />
        <Row label="Estado" value={STATUS_LABEL[reservation.status]} />
      </dl>

      {reservation.customer_note ? (
        <p className="mt-4 border-l-2 border-olive pl-3 text-sm text-charcoal/70">
          “{reservation.customer_note}”
        </p>
      ) : null}

      <div className="mt-5 space-y-3">
        {canCancel ? (
          <Field label="Nota administrativa (opcional)" htmlFor="admin-note">
            <Textarea
              id="admin-note"
              maxLength={1000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Motivo de la cancelacion, mantenimiento, etc."
            />
          </Field>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {canConfirm ? (
            <Button
              size="sm"
              disabled={action.isPending}
              onClick={() => action.mutate({ id: reservation.id, action: "confirm" })}
            >
              Confirmar
            </Button>
          ) : null}
          {canComplete ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={action.isPending}
              onClick={() => action.mutate({ id: reservation.id, action: "complete" })}
            >
              Completar
            </Button>
          ) : null}
          {canCancel ? (
            <Button
              size="sm"
              variant="danger"
              disabled={action.isPending}
              onClick={() =>
                action.mutate({ id: reservation.id, action: "cancel", note: note || undefined })
              }
            >
              Cancelar
            </Button>
          ) : null}
        </div>

        {reservation.status === "CONFIRMED" && !finished ? (
          <p className="text-xs leading-5 text-charcoal/60">
            Una reserva solo puede completarse despues de que termine su periodo.
          </p>
        ) : null}
      </div>

      <section className="mt-6 border-t border-charcoal/15 pt-4">
        <div className="flex items-center justify-between">
          <TechnicalLabel>CORREOS ENVIADOS</TechnicalLabel>
          <Button
            variant="ghost"
            size="sm"
            disabled={retry.isPending}
            onClick={() => retry.mutate(reservation.id)}
          >
            Reintentar
          </Button>
        </div>
        <ul className="mt-2 space-y-1 font-mono text-[10px] uppercase tracking-[0.12em]">
          {notifications.data?.length === 0 ? (
            <li className="text-charcoal/55">Sin envios registrados.</li>
          ) : null}
          {notifications.data?.map((log) => (
            <li key={log.id} className="flex items-center justify-between gap-2">
              <span className="truncate text-charcoal/65">{log.template}</span>
              <span
                className={
                  log.status === "FAILED" ? "text-state-error" : "text-olive"
                }
              >
                {log.status}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-olive">{label}</dt>
      <dd className="truncate text-right font-medium">{value}</dd>
    </div>
  );
}
