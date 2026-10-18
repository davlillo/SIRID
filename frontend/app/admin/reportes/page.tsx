"use client";

import { Printer } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/atoms/button";
import { Field, Input, Select } from "@/components/atoms/field";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/atoms/states";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { AdminLayout } from "@/components/templates/admin-layout";
import { useAdminFacilities, useReservationReport } from "@/features/admin/hooks";
import type { AdminReservationReportFilters } from "@/lib/api";
import { formatMoney, STATUS_LABEL } from "@/lib/format";
import type { ReservationStatus } from "@/lib/types";

const STATUSES: ReservationStatus[] = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"];

type ReportFormFilters = {
  date_from: string;
  date_to: string;
  facility_id: string;
  status: ReservationStatus | "";
};

function displayDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-GT", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export default function AdminReportsPage() {
  const [formFilters, setFormFilters] = useState<ReportFormFilters>({
    date_from: "",
    date_to: "",
    facility_id: "",
    status: "",
  });
  const [reportFilters, setReportFilters] = useState<AdminReservationReportFilters | null>(null);
  const [dateRangeError, setDateRangeError] = useState("");
  const facilities = useAdminFacilities();
  const report = useReservationReport(reportFilters);

  function generateReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formFilters.date_from > formFilters.date_to) {
      setDateRangeError("La fecha inicial debe ser anterior o igual a la fecha final.");
      return;
    }

    setDateRangeError("");
    setReportFilters({
      date_from: formFilters.date_from,
      date_to: formFilters.date_to,
      ...(formFilters.facility_id ? { facility_id: formFilters.facility_id } : {}),
      ...(formFilters.status ? { status: formFilters.status } : {}),
    });
  }

  const facilityFilterLabel = reportFilters?.facility_id
    ? report.data?.by_facility.find((item) => item.facility_id === reportFilters.facility_id)
        ?.facility_name ??
      facilities.data?.items.find((item) => item.id === reportFilters.facility_id)?.name ??
      "Instalación seleccionada"
    : "Todas";

  return (
    <AdminLayout access="reservations">
      <div id="reservation-report-print">
        <header className="report-no-print">
          <TechnicalLabel>REPORTS_01 / HU-12</TechnicalLabel>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em]">
            Reportes de reservaciones
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-charcoal/65">
            Resume el uso del complejo por período, instalación y estado de la reserva.
          </p>
        </header>

        <form
          className="report-no-print mt-6 grid gap-4 border border-charcoal/20 bg-sand/30 p-5 md:grid-cols-2 xl:grid-cols-5 xl:items-end"
          onSubmit={generateReport}
        >
          <Field label="Desde" htmlFor="report-date-from">
            <Input
              id="report-date-from"
              type="date"
              required
              value={formFilters.date_from}
              onChange={(event) =>
                setFormFilters((current) => ({ ...current, date_from: event.target.value }))
              }
            />
          </Field>
          <Field label="Hasta" htmlFor="report-date-to">
            <Input
              id="report-date-to"
              type="date"
              required
              min={formFilters.date_from || undefined}
              value={formFilters.date_to}
              onChange={(event) =>
                setFormFilters((current) => ({ ...current, date_to: event.target.value }))
              }
            />
          </Field>
          <Field label="Instalación" htmlFor="report-facility">
            <Select
              id="report-facility"
              value={formFilters.facility_id}
              onChange={(event) =>
                setFormFilters((current) => ({ ...current, facility_id: event.target.value }))
              }
            >
              <option value="">Todas</option>
              {facilities.data?.items.map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado" htmlFor="report-status">
            <Select
              id="report-status"
              value={formFilters.status}
              onChange={(event) =>
                setFormFilters((current) => ({
                  ...current,
                  status: event.target.value as ReservationStatus | "",
                }))
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
          <Button type="submit" className="w-full">
            Generar reporte
          </Button>
          {dateRangeError ? (
            <p role="alert" className="text-sm font-medium text-state-error md:col-span-2 xl:col-span-5">
              {dateRangeError}
            </p>
          ) : null}
        </form>

        {reportFilters ? (
          <div className="mt-8">
            {report.isPending ? <LoadingBlock label="GENERANDO REPORTE" /> : null}
            {report.isError ? (
              <ErrorState description="No se pudo generar el reporte. Inténtalo de nuevo." />
            ) : null}
            {report.isSuccess && report.data.total_reservations === 0 ? (
              <EmptyState
                title="Sin reservaciones"
                description="No existen reservaciones que cumplan con los filtros seleccionados. Ajusta el período o los filtros e inténtalo de nuevo."
              />
            ) : null}
            {report.isSuccess && report.data.total_reservations > 0 ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-charcoal/20 pb-5">
                  <div>
                    <TechnicalLabel>REPORTE GENERADO</TechnicalLabel>
                    <h2 className="mt-2 font-display text-2xl font-semibold">
                      Uso de reservaciones
                    </h2>
                    <p className="mt-2 text-sm text-charcoal/70">
                      {displayDate(reportFilters.date_from)} – {displayDate(reportFilters.date_to)}
                      <span className="mx-2" aria-hidden="true">·</span>
                      Instalación: {facilityFilterLabel}
                      <span className="mx-2" aria-hidden="true">·</span>
                      Estado: {reportFilters.status ? STATUS_LABEL[reportFilters.status] : "Todos"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="report-no-print"
                    onClick={() => window.print()}
                    aria-label="Generar PDF del reporte de reservaciones"
                  >
                    <Printer className="h-4 w-4" aria-hidden="true" />
                    Generar PDF
                  </Button>
                </div>

                <section aria-labelledby="report-total-title" className="mt-6 border border-charcoal/20 bg-sand/25 p-5">
                  <TechnicalLabel as="p">TOTAL DEL PERÍODO</TechnicalLabel>
                  <h3 id="report-total-title" className="mt-2 font-display text-4xl font-semibold">
                    {report.data.total_reservations}
                  </h3>
                  <p className="mt-1 text-sm text-charcoal/65">reservaciones coinciden con los filtros.</p>
                </section>

                <div className="mt-6 grid gap-6 xl:grid-cols-2">
                  <section aria-labelledby="report-status-title" className="min-w-0">
                    <h3 id="report-status-title" className="mb-3 font-display text-xl font-semibold">
                      Reservaciones por estado
                    </h3>
                    <div className="overflow-x-auto border border-charcoal/20">
                      <table className="w-full border-collapse text-sm">
                        <caption className="sr-only">Cantidad de reservaciones por estado</caption>
                        <thead>
                          <tr className="bg-charcoal text-ivory">
                            <th scope="col" className="px-4 py-3 text-left">Estado</th>
                            <th scope="col" className="px-4 py-3 text-right">Reservaciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.data.by_status.map((item) => (
                            <tr key={item.status} className="border-t border-charcoal/10">
                              <th scope="row" className="px-4 py-3 text-left font-medium">
                                {STATUS_LABEL[item.status]}
                              </th>
                              <td className="px-4 py-3 text-right font-mono">{item.reservations}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section aria-labelledby="report-facility-title" className="min-w-0">
                    <h3 id="report-facility-title" className="mb-3 font-display text-xl font-semibold">
                      Reservaciones por instalación
                    </h3>
                    <div className="overflow-x-auto border border-charcoal/20">
                      <table className="w-full border-collapse text-sm">
                        <caption className="sr-only">Cantidad de reservaciones por instalación</caption>
                        <thead>
                          <tr className="bg-charcoal text-ivory">
                            <th scope="col" className="px-4 py-3 text-left">Instalación</th>
                            <th scope="col" className="px-4 py-3 text-right">Reservaciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.data.by_facility.map((item) => (
                            <tr key={item.facility_id} className="border-t border-charcoal/10">
                              <th scope="row" className="px-4 py-3 text-left font-medium">
                                {item.facility_name}
                              </th>
                              <td className="px-4 py-3 text-right font-mono">{item.reservations}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>

                {report.data.quoted_by_currency.length > 0 ? (
                  <section aria-labelledby="report-amount-title" className="mt-6">
                    <h3 id="report-amount-title" className="mb-3 font-display text-xl font-semibold">
                      Importe cotizado por moneda
                    </h3>
                    <div className="max-w-xl overflow-x-auto border border-charcoal/20">
                      <table className="w-full border-collapse text-sm">
                        <caption className="sr-only">Importes cotizados agrupados por moneda</caption>
                        <thead>
                          <tr className="bg-charcoal text-ivory">
                            <th scope="col" className="px-4 py-3 text-left">Moneda</th>
                            <th scope="col" className="px-4 py-3 text-right">Importe cotizado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.data.quoted_by_currency.map((item) => (
                            <tr key={item.currency} className="border-t border-charcoal/10">
                              <th scope="row" className="px-4 py-3 text-left font-medium">
                                {item.currency}
                              </th>
                              <td className="px-4 py-3 text-right font-mono">
                                {formatMoney(item.quoted_amount, item.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ) : null}
              </>
            ) : null}
          </div>
        ) : (
          <p className="mt-6 border-l-2 border-terracotta pl-4 text-sm leading-6 text-charcoal/70">
            Selecciona un período para generar el resumen de reservaciones.
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
