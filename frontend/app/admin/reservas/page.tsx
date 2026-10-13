"use client";

import { Pencil, RotateCw, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/atoms/button";
import { IconAction } from "@/components/atoms/icon-action";
import { Field, Input, Select, Textarea } from "@/components/atoms/field";
import { Modal } from "@/components/atoms/modal";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/atoms/states";
import { StatusBadge } from "@/components/atoms/status-badge";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { AdminLayout } from "@/components/templates/admin-layout";
import {
  useAdminFacilities,
  useAdminReservations,
  useRegisterPayment,
  useReservationAction,
  useReservationNotifications,
  useReservationPayments,
  useRetryNotification,
} from "@/features/admin/hooks";
import { STATUS_LABEL, formatDate, formatMoney, formatRange } from "@/lib/format";
import type { AdminReservation, ReservationStatus } from "@/lib/types";

const STATUSES: ReservationStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];

function canCancelReservation(status: ReservationStatus) {
  return status === "PENDING" || status === "CONFIRMED";
}

export default function AdminReservationsPage() {
  const [filters, setFilters] = useState({
    status: "PENDING" as ReservationStatus | "",
    facility_id: "",
    date_from: "",
    date_to: "",
  });
  const [selected, setSelected] = useState<AdminReservation | null>(null);
  const [toCancel, setToCancel] = useState<AdminReservation | null>(null);
  const [cancelNote, setCancelNote] = useState("");

  const reservationAction = useReservationAction();
  const facilities = useAdminFacilities();
  const reservations = useAdminReservations({
    status: filters.status || undefined,
    facility_id: filters.facility_id || undefined,
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
    limit: 50,
  });

  return (
    <AdminLayout access="reservations">
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

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_min(100%,24rem)] xl:items-stretch">
        <section className="flex min-w-0 flex-col border border-charcoal/20 bg-ivory">
          <div className="border-b border-charcoal/15 px-4 py-3">
            <TechnicalLabel>LISTADO</TechnicalLabel>
          </div>
          {reservations.isPending ? (
            <div className="p-4">
              <LoadingBlock label="CARGANDO RESERVAS" />
            </div>
          ) : null}
          {reservations.isError ? (
            <div className="p-4">
              <ErrorState description="No se pudo leer el listado de reservas." />
            </div>
          ) : null}
          {reservations.isSuccess && reservations.data.items.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Sin reservas"
                description="Ninguna reserva coincide con los filtros seleccionados."
              />
            </div>
          ) : null}

          {reservations.data && reservations.data.items.length > 0 ? (
            <table className="w-full table-fixed border-collapse text-sm">
              <caption className="sr-only">Listado administrativo de reservas</caption>
              <thead>
                <tr className="bg-charcoal text-ivory">
                  <th
                    scope="col"
                    className="w-[17%] px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em]"
                  >
                    Instalacion
                  </th>
                  <th
                    scope="col"
                    className="w-[23%] px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em]"
                  >
                    Cliente
                  </th>
                  <th
                    scope="col"
                    className="w-[21%] px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em]"
                  >
                    Periodo
                  </th>
                  <th
                    scope="col"
                    className="w-[11%] px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em]"
                  >
                    Importe
                  </th>
                  <th
                    scope="col"
                    className="w-[11%] px-2 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em]"
                  >
                    Estado
                  </th>
                  <th
                    scope="col"
                    className="w-[17%] min-w-[5.5rem] px-2 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.14em]"
                  >
                    Accion
                  </th>
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
                    <td
                      className="truncate px-3 py-2.5 font-medium"
                      title={reservation.facility.name}
                    >
                      {reservation.facility.name}
                    </td>
                    <td className="truncate px-3 py-2.5" title={reservation.customer.email}>
                      <span className="block truncate">{reservation.customer.name}</span>
                      <span className="block truncate font-mono text-[10px] text-charcoal/55">
                        {reservation.customer.email}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] leading-snug">
                      <span className="block">{formatDate(reservation.starts_at)}</span>
                      <span className="block text-charcoal/70">
                        {formatRange(reservation.starts_at, reservation.ends_at)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs">
                      {formatMoney(reservation.quoted_amount, reservation.currency)}
                    </td>
                    <td className="px-2 py-2.5 align-middle">
                      <StatusBadge
                        status={reservation.status}
                        className="max-w-full px-1 py-0.5 text-[8px] leading-tight tracking-[0.06em]"
                      />
                    </td>
                    <td className="px-2 py-2.5 align-middle">
                      <div className="flex flex-nowrap items-center justify-end gap-1">
                        <IconAction
                          size="sm"
                          label={`Ver detalle de reserva ${reservation.id.slice(0, 8)}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(reservation);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                        </IconAction>
                        {canCancelReservation(reservation.status) ? (
                          <IconAction
                            size="sm"
                            label={`Cancelar reserva de ${reservation.customer.name}`}
                            variant="danger"
                            onClick={(event) => {
                              event.stopPropagation();
                              setCancelNote("");
                              setToCancel(reservation);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </IconAction>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>

        <div className="min-h-full">
          <DetailPanel reservation={selected} onClose={() => setSelected(null)} />
        </div>
      </div>

      <Modal
        open={toCancel !== null}
        title="Cancelar reserva · HU-05"
        onClose={() => setToCancel(null)}
        showHeaderClose={false}
      >
        <p className="text-sm leading-6 text-charcoal/75">
          ¿Cancelar la reserva de{" "}
          <strong>
            {toCancel?.customer.name} · {toCancel?.facility.name}
          </strong>
          ? La franja quedará libre para otra solicitud.
        </p>
        <Field
          label="Motivo de cancelación"
          htmlFor="cancel-reservation-note"
          hint="Obligatorio (HU-05). Queda registrado en la reserva."
        >
          <Textarea
            id="cancel-reservation-note"
            required
            maxLength={1000}
            value={cancelNote}
            onChange={(event) => setCancelNote(event.target.value)}
            placeholder="Ej.: cliente no asistirá, mantenimiento de cancha…"
          />
        </Field>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="danger"
            disabled={reservationAction.isPending || cancelNote.trim().length < 3}
            onClick={() => {
              if (!toCancel) return;
              void reservationAction.mutate(
                {
                  id: toCancel.id,
                  action: "cancel",
                  note: cancelNote.trim() || undefined,
                },
                {
                  onSuccess: (updated) => {
                    setToCancel(null);
                    setCancelNote("");
                    setSelected((current) =>
                      current?.id === updated.id ? { ...current, status: updated.status } : current,
                    );
                  },
                },
              );
            }}
          >
            {reservationAction.isPending ? "Procesando…" : "Sí, cancelar"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setToCancel(null)}>
            Cancelar
          </Button>
        </div>
      </Modal>
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
  const payments = useReservationPayments(reservation?.id ?? null);
  const registerPayment = useRegisterPayment();
  const notifications = useReservationNotifications(reservation?.id ?? null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  if (!reservation) {
    return (
      <aside className="flex h-full min-h-[12rem] flex-col justify-center border border-dashed border-charcoal/25 bg-ivory/50 p-6">
        <TechnicalLabel>DETALLE</TechnicalLabel>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-charcoal/65">
          <li className="flex items-start gap-2.5">
            <TableActionHint
              variant="default"
              icon={<Pencil className="h-3.5 w-3.5" aria-hidden />}
            />
            <p className="min-w-0 flex-1 text-justify">
              En la columna <span className="font-medium text-charcoal">Acción</span>, abre el
              detalle para registrar pagos y confirmar la reserva.
            </p>
          </li>
          <li className="flex items-start gap-2.5">
            <TableActionHint
              variant="danger"
              icon={<Trash2 className="h-3.5 w-3.5" aria-hidden />}
            />
            <p className="min-w-0 flex-1 text-justify">
              Cancela desde la misma columna; la franja queda disponible de nuevo.
            </p>
          </li>
        </ul>
      </aside>
    );
  }

  const finished = new Date(reservation.ends_at).getTime() < Date.now();
  const totalPaid = payments.data?.total_paid ?? "0";
  const balanceDue = payments.data?.balance_due ?? reservation.quoted_amount;
  const canRegisterPayment = reservation.status === "PENDING";
  const canConfirm =
    reservation.status === "PENDING" && Number(balanceDue) <= 0 && Number(totalPaid) > 0;
  const canComplete = reservation.status === "CONFIRMED" && finished;

  const saldoCubierto = Number(balanceDue) <= 0 && Number(totalPaid) > 0;

  return (
    <aside className="flex h-full flex-col border border-charcoal bg-ivory">
      <header className="border-b border-charcoal/15 bg-sand/40 px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <TechnicalLabel>DETALLE · {reservation.id.slice(0, 8)}</TechnicalLabel>
            <h2 className="mt-1 truncate font-display text-xl font-semibold leading-tight">
              {reservation.facility.name}
            </h2>
            <div className="mt-2">
              <StatusBadge status={reservation.status} />
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar detalle">
            ✕
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <section className="grid grid-cols-3 gap-px border border-charcoal/20 bg-charcoal/20">
          <MoneyTile
            label="Cotizado"
            value={formatMoney(reservation.quoted_amount, reservation.currency)}
          />
          <MoneyTile label="Abonado" value={formatMoney(totalPaid, reservation.currency)} />
          <MoneyTile
            label="Saldo"
            value={formatMoney(balanceDue, reservation.currency)}
            highlight={saldoCubierto && reservation.status === "PENDING"}
          />
        </section>

        {canConfirm ? (
          <section className="border border-charcoal/20 bg-sand/30 px-3 py-3">
            <TechnicalLabel>HU-04 · CONFIRMAR</TechnicalLabel>
            <p className="mt-2 text-sm leading-5 text-charcoal/70">
              Pago completo (HU-10). Al confirmar, la reserva pasa a{" "}
              <span className="font-semibold text-charcoal">Confirmada</span> y se notifica al
              cliente.
            </p>
            <Button
              className="mt-3 w-full"
              size="sm"
              disabled={action.isPending}
              onClick={() => action.mutate({ id: reservation.id, action: "confirm" })}
            >
              {action.isPending ? "Confirmando…" : "Confirmar reserva"}
            </Button>
          </section>
        ) : null}

        {reservation.status === "PENDING" && Number(balanceDue) > 0 ? (
          <p className="border-l-2 border-charcoal/25 pl-3 text-xs leading-5 text-charcoal/60">
            Registra pagos en la sección de abajo hasta cubrir el saldo; después podrás
            confirmar.
          </p>
        ) : null}

        <section className="border border-charcoal/15 bg-sand/20 p-3 text-sm">
          <p className="font-medium">{reservation.customer.name}</p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-charcoal/60">
            {reservation.customer.email}
          </p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-olive">
            {formatDate(reservation.starts_at)}
          </p>
          <p className="mt-0.5 font-medium">
            {formatRange(reservation.starts_at, reservation.ends_at)}
          </p>
          {reservation.customer_note ? (
            <p className="mt-3 border-t border-charcoal/10 pt-3 text-sm leading-6 text-charcoal/75">
              {reservation.customer_note}
            </p>
          ) : null}
          {reservation.admin_note ? (
            <p className="mt-3 border-t border-charcoal/10 pt-3 text-sm leading-6 text-charcoal/70">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-state-error">
                Motivo cancelación
              </span>
              <span className="mt-1 block">{reservation.admin_note}</span>
            </p>
          ) : null}
        </section>

        {canRegisterPayment ? (
          <section className="border border-charcoal/15 p-3">
            <TechnicalLabel>PAGOS · HU-10</TechnicalLabel>
            {Number(balanceDue) > 0 ? (
              <div className="mt-3 space-y-3">
                <Field label="Monto" htmlFor="payment-amount">
                  <Input
                    id="payment-amount"
                    inputMode="decimal"
                    placeholder={balanceDue}
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                  />
                </Field>
                <Field label="Nota (opcional)" htmlFor="payment-note">
                  <Input
                    id="payment-note"
                    maxLength={500}
                    placeholder="Efectivo, transferencia…"
                    value={paymentNote}
                    onChange={(event) => setPaymentNote(event.target.value)}
                  />
                </Field>
                <Button
                  className="w-full"
                  size="sm"
                  variant="secondary"
                  disabled={registerPayment.isPending || !paymentAmount.trim()}
                  onClick={() =>
                    void registerPayment.mutate(
                      {
                        id: reservation.id,
                        amount: paymentAmount.trim(),
                        note: paymentNote.trim() || undefined,
                      },
                      {
                        onSuccess: () => {
                          setPaymentAmount("");
                          setPaymentNote("");
                        },
                      },
                    )
                  }
                >
                  Registrar pago
                </Button>
              </div>
            ) : (
              <p className="mt-2 text-xs leading-5 text-charcoal/55">
                No hay saldo pendiente. Revisa los abonos registrados abajo.
              </p>
            )}
            {payments.data && payments.data.payments.length > 0 ? (
              <ul
                className={
                  Number(balanceDue) > 0
                    ? "mt-4 divide-y divide-charcoal/10 border-t border-charcoal/10 pt-2"
                    : "mt-3 divide-y divide-charcoal/10"
                }
              >
                {payments.data.payments.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 py-2 font-mono text-[11px]"
                  >
                    <span className="text-charcoal/60">{formatDate(item.created_at)}</span>
                    <span className="font-semibold">
                      {formatMoney(item.amount, item.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {canComplete ? (
          <section className="border border-charcoal/15 p-3">
            <TechnicalLabel>CIERRE</TechnicalLabel>
            <p className="mt-2 text-xs leading-5 text-charcoal/60">
              El periodo ya terminó. Marca la reserva como completada.
            </p>
            <Button
              className="mt-3 w-full"
              size="sm"
              variant="secondary"
              disabled={action.isPending}
              onClick={() => action.mutate({ id: reservation.id, action: "complete" })}
            >
              {action.isPending ? "Procesando…" : "Marcar completada"}
            </Button>
          </section>
        ) : null}

        {reservation.status === "CONFIRMED" && !finished && !canComplete ? (
          <p className="text-xs leading-5 text-charcoal/55">
            Podrás completarla cuando termine el horario reservado.
          </p>
        ) : null}

        <section className="border border-charcoal/15 p-3">
          <div className="flex items-center justify-between gap-2">
            <TechnicalLabel>CORREOS</TechnicalLabel>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={retry.isPending}
              onClick={() => retry.mutate(reservation.id)}
            >
              <RotateCw className="h-3.5 w-3.5" aria-hidden />
              Reintentar
            </Button>
          </div>
          <ul className="mt-2 space-y-1.5 font-mono text-[10px] uppercase tracking-[0.1em]">
            {notifications.data?.length === 0 ? (
              <li className="text-charcoal/55">Sin envíos registrados.</li>
            ) : null}
            {notifications.data?.map((log) => (
              <li
                key={log.id}
                className="flex items-center justify-between gap-2 border-t border-charcoal/8 pt-1.5 first:border-0 first:pt-0"
              >
                <span className="truncate text-charcoal/65">{log.template}</span>
                <span className={log.status === "FAILED" ? "text-state-error" : "text-olive"}>
                  {log.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}

function TableActionHint({
  icon,
  variant,
}: {
  icon: ReactNode;
  variant: "default" | "danger";
}) {
  return (
    <span
      className={
        variant === "danger"
          ? "mt-0.5 inline-flex min-h-7 min-w-7 shrink-0 items-center justify-center border border-state-error/40 text-state-error"
          : "mt-0.5 inline-flex min-h-7 min-w-7 shrink-0 items-center justify-center border border-charcoal/25 text-charcoal"
      }
      aria-hidden
    >
      {icon}
    </span>
  );
}

function MoneyTile({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "bg-olive/10 px-2 py-3 text-center"
          : "bg-ivory px-2 py-3 text-center"
      }
    >
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-charcoal/55">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold leading-tight">{value}</p>
    </div>
  );
}
