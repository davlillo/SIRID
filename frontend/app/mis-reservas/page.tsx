"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, ButtonLink } from "@/components/atoms/button";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/atoms/states";
import { StatusBadge } from "@/components/atoms/status-badge";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { PublicLayout } from "@/components/templates/public-layout";
import { GoogleAuthButton } from "@/features/auth/auth-button";
import { useAuth } from "@/features/auth/auth-context";
import { useCancelReservation, useMyReservations } from "@/features/reservations/hooks";
import { formatDate, formatMoney, formatRange } from "@/lib/format";
import type { Reservation } from "@/lib/types";

type Tab = "proximas" | "historial";

export default function MyReservationsPage() {
  const { user, isLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("proximas");
  const reservations = useMyReservations();

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="py-20">
          <LoadingBlock label="VERIFICANDO SESION" />
        </div>
      </PublicLayout>
    );
  }

  if (!user) {
    return (
      <PublicLayout>
        <section className="py-20">
          <TechnicalLabel>ACCOUNT_01</TechnicalLabel>
          <h1 className="dvl-display mt-4">Mis reservas</h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-charcoal/70">
            Inicia sesion para ver tus solicitudes, su estado y el historial.
          </p>
          <div className="mt-8">
            <GoogleAuthButton />
          </div>
        </section>
      </PublicLayout>
    );
  }

  const items = reservations.data?.items ?? [];
  const now = Date.now();
  const upcoming = items.filter(
    (item) =>
      new Date(item.ends_at).getTime() >= now &&
      (item.status === "PENDING" || item.status === "CONFIRMED"),
  );
  const history = items.filter((item) => !upcoming.includes(item));
  const visible = tab === "proximas" ? upcoming : history;

  return (
    <PublicLayout>
      <section className="py-14">
        <TechnicalLabel>ACCOUNT_01</TechnicalLabel>
        <h1 className="dvl-display mt-4">Mis reservas</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-charcoal/70">
          Hola {user.name.split(" ")[0]}. Aca esta el estado de cada solicitud.
        </p>
      </section>

      {upcoming[0] ? <NextReservation reservation={upcoming[0]} /> : null}

      <div className="mt-10 flex gap-2 border-b border-charcoal/15">
        {(["proximas", "historial"] as Tab[]).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            aria-current={tab === key ? "page" : undefined}
            className={
              tab === key
                ? "-mb-px border-b-2 border-terracotta px-4 py-3 text-sm font-semibold text-terracotta"
                : "-mb-px border-b-2 border-transparent px-4 py-3 text-sm text-charcoal/60 hover:text-charcoal"
            }
          >
            {key === "proximas" ? `Proximas (${upcoming.length})` : `Historial (${history.length})`}
          </button>
        ))}
      </div>

      <div className="mt-8 pb-10">
        {reservations.isPending ? <LoadingBlock label="CARGANDO RESERVAS" /> : null}

        {reservations.isError ? (
          <ErrorState
            description="No se pudieron cargar tus reservas."
            action={
              <Button variant="secondary" size="sm" onClick={() => void reservations.refetch()}>
                Reintentar
              </Button>
            }
          />
        ) : null}

        {reservations.isSuccess && visible.length === 0 ? (
          <EmptyState
            title={tab === "proximas" ? "Sin reservas activas" : "Historial vacio"}
            description={
              tab === "proximas"
                ? "Cuando solicites un espacio lo veras aca con su estado."
                : "Las reservas canceladas o completadas apareceran en esta pestaña."
            }
            action={<ButtonLink href="/instalaciones">Explorar instalaciones</ButtonLink>}
          />
        ) : null}

        <ul className="space-y-3">
          {visible.map((reservation) => (
            <ReservationRow key={reservation.id} reservation={reservation} />
          ))}
        </ul>
      </div>
    </PublicLayout>
  );
}

function NextReservation({ reservation }: { reservation: Reservation }) {
  return (
    <section className="technical-grid border border-charcoal bg-charcoal p-6 text-ivory">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-sand">
            PROXIMA RESERVA
          </span>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.02em]">
            {reservation.facility.name}
          </h2>
          <p className="mt-2 font-mono text-sm text-sand">
            {formatDate(reservation.starts_at)} · {formatRange(reservation.starts_at, reservation.ends_at)}
          </p>
        </div>
        <StatusBadge status={reservation.status} />
      </div>
    </section>
  );
}

function ReservationRow({ reservation }: { reservation: Reservation }) {
  const cancel = useCancelReservation();
  const [confirming, setConfirming] = useState(false);

  // Solo se puede cancelar lo que sigue vivo (RN-06 y transiciones de dominio).
  const cancellable = reservation.status === "PENDING" || reservation.status === "CONFIRMED";

  return (
    <li className="border border-charcoal/20 bg-ivory p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/instalaciones/${reservation.facility.slug}`}
              className="font-display text-xl font-semibold hover:text-terracotta"
            >
              {reservation.facility.name}
            </Link>
            <StatusBadge status={reservation.status} />
          </div>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-charcoal/65">
            {formatDate(reservation.starts_at)} ·{" "}
            {formatRange(reservation.starts_at, reservation.ends_at)} ·{" "}
            {reservation.facility.location_label}
          </p>
          {reservation.customer_note ? (
            <p className="mt-2 text-sm text-charcoal/70">“{reservation.customer_note}”</p>
          ) : null}
          {reservation.admin_note ? (
            <p className="mt-2 border-l-2 border-terracotta pl-3 text-sm text-charcoal/70">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-olive">
                Nota del administrador:
              </span>{" "}
              {reservation.admin_note}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-3">
          <span className="font-display text-2xl font-semibold">
            {formatMoney(reservation.quoted_amount, reservation.currency)}
          </span>

          {cancellable ? (
            confirming ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate(reservation.id)}
                >
                  {cancel.isPending ? "Cancelando…" : "Si, cancelar"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                  Volver
                </Button>
              </div>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setConfirming(true)}>
                Cancelar reserva
              </Button>
            )
          ) : null}
        </div>
      </div>
    </li>
  );
}
