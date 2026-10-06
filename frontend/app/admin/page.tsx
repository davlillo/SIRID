"use client";

import Link from "next/link";

import { ButtonLink } from "@/components/atoms/button";
import { ErrorState, LoadingBlock } from "@/components/atoms/states";
import { StatusBadge } from "@/components/atoms/status-badge";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { AdminLayout } from "@/components/templates/admin-layout";
import { useAdminReservations, useAdminStats } from "@/features/admin/hooks";
import { formatDate, formatMoney, formatRange } from "@/lib/format";

export default function AdminDashboardPage() {
  const stats = useAdminStats();
  const pending = useAdminReservations({ status: "PENDING", limit: 5 });

  return (
    <AdminLayout>
      <TechnicalLabel>DASHBOARD_01</TechnicalLabel>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em]">Resumen</h1>

      {stats.isPending ? <div className="mt-8"><LoadingBlock label="CARGANDO INDICADORES" /></div> : null}
      {stats.isError ? (
        <div className="mt-8">
          <ErrorState description="No se pudieron leer los indicadores del panel." />
        </div>
      ) : null}

      {stats.data ? (
        <dl className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Pendientes" value={String(stats.data.pending)} tone="terracotta" />
          <Kpi label="Confirmadas" value={String(stats.data.confirmed_today)} />
          <Kpi
            label="Ocupacion hoy"
            value={`${Math.round(stats.data.occupancy_rate_today * 100)}%`}
          />
          <Kpi label="Cotizado hoy" value={formatMoney(stats.data.quoted_today)} />
        </dl>
      ) : null}

      <section className="mt-12">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-charcoal/15 pb-2">
          <h2 className="font-display text-2xl font-semibold">Pendientes de revision</h2>
          <ButtonLink href="/admin/reservas" variant="secondary" size="sm">
            Ver todas
          </ButtonLink>
        </div>

        {pending.isPending ? <LoadingBlock /> : null}

        {pending.data?.items.length === 0 ? (
          <p className="border border-dashed border-charcoal/25 px-5 py-8 text-center text-sm text-charcoal/60">
            No hay solicitudes esperando aprobacion.
          </p>
        ) : null}

        <ul className="space-y-2">
          {pending.data?.items.map((reservation) => (
            <li
              key={reservation.id}
              className="flex flex-wrap items-center justify-between gap-3 border border-charcoal/20 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold">{reservation.facility.name}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-charcoal/60">
                  {formatDate(reservation.starts_at)} ·{" "}
                  {formatRange(reservation.starts_at, reservation.ends_at)} ·{" "}
                  {reservation.customer.name}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={reservation.status} />
                <Link
                  href="/admin/reservas?status=PENDING"
                  className="text-sm font-semibold text-terracotta hover:underline"
                >
                  Revisar
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </AdminLayout>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "terracotta";
}) {
  return (
    <div
      className={
        tone === "terracotta"
          ? "border border-terracotta bg-terracotta p-5 text-ivory"
          : "border border-charcoal/20 bg-sand/30 p-5"
      }
    >
      <dt
        className={
          tone === "terracotta"
            ? "font-mono text-[10px] uppercase tracking-[0.16em] text-sand"
            : "font-mono text-[10px] uppercase tracking-[0.16em] text-olive"
        }
      >
        {label}
      </dt>
      <dd className="mt-2 font-display text-4xl font-semibold tracking-[-0.03em]">{value}</dd>
    </div>
  );
}
