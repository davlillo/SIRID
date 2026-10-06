import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TechnicalLabel } from "@/components/atoms/technical-label";
import { PublicLayout } from "@/components/templates/public-layout";
import { ReservationFlow } from "@/components/organisms/reservation-flow";
import { ApiError, facilitiesApi } from "@/lib/api";
import {
  KIND_LABEL,
  SPORT_LABEL,
  ZONE_LABEL,
  facilityImage,
  formatMoney,
  surfaceLabel,
  weekdayLabel,
} from "@/lib/format";
import type { FacilityDetail } from "@/lib/types";

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

async function loadFacility(slug: string): Promise<FacilityDetail> {
  try {
    return await facilitiesApi.bySlug(slug, 60);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  try {
    const facility = await facilitiesApi.bySlug(slug, 60);
    return { title: facility.name, description: facility.description.slice(0, 160) };
  } catch {
    return { title: "Instalacion" };
  }
}

export default async function FacilityDetailPage({ params }: Params) {
  const { slug } = await params;
  const facility = await loadFacility(slug);

  const activeRate = facility.rates.find((rate) => rate.is_active);
  const schedules = facility.schedules.filter((schedule) => schedule.is_active);

  return (
    <PublicLayout>
      <nav aria-label="Ruta de navegacion" className="pt-8">
        <ol className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-charcoal/55">
          <li>
            <Link href="/" className="hover:text-terracotta">
              Inicio
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/instalaciones" className="hover:text-terracotta">
              Instalaciones
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-charcoal">{facility.name}</li>
        </ol>
      </nav>

      <section className="grid gap-10 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div>
          <div className="overflow-hidden border border-charcoal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={facilityImage(facility.facility_kind, facility.images)}
              alt={facility.images[0]?.alt_text ?? `Vista esquematica de ${facility.name}`}
              className="aspect-[8/5] w-full object-cover"
            />
          </div>

          <TechnicalLabel className="mt-6 block">
            {ZONE_LABEL[facility.zone]} · {KIND_LABEL[facility.facility_kind]} ·{" "}
            {SPORT_LABEL[facility.sport_type]}
          </TechnicalLabel>
          <h1 className="mt-3 font-display text-5xl font-semibold tracking-[-0.04em]">
            {facility.name}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-charcoal/70">
            {facility.description}
          </p>
        </div>

        <aside className="border border-charcoal/20 bg-sand/30 p-5">
          <TechnicalLabel>FICHA TECNICA</TechnicalLabel>
          <dl className="mt-4 divide-y divide-charcoal/10 text-sm">
            <Spec label="Capacidad" value={`${facility.capacity} personas`} />
            <Spec label="Superficie" value={surfaceLabel(facility.surface)} />
            <Spec label="Ubicacion" value={facility.location_label} />
            <Spec
              label="Tarifa desde"
              value={
                activeRate
                  ? `${formatMoney(activeRate.amount, activeRate.currency)} / ${activeRate.minimum_minutes} min`
                  : "Consultar"
              }
            />
            <Spec
              label="Estado"
              value={facility.is_bookable ? "Reservable" : "Informativo"}
            />
            {Object.entries(facility.metadata).map(([key, value]) => (
              <Spec key={key} label={humanize(key)} value={renderValue(value)} />
            ))}
          </dl>

          <div className="mt-6">
            <TechnicalLabel>HORARIO OPERATIVO</TechnicalLabel>
            <ul className="mt-3 space-y-1 font-mono text-xs">
              {schedules.length === 0 ? (
                <li className="text-charcoal/60">Sin horario configurado.</li>
              ) : (
                schedules.map((schedule) => (
                  <li key={schedule.id} className="flex justify-between gap-4">
                    <span className="text-olive">{weekdayLabel(schedule.weekday)}</span>
                    <span>
                      {schedule.opens_at.slice(0, 5)} – {schedule.closes_at.slice(0, 5)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </aside>
      </section>

      <section className="dvl-rule py-12">
        <TechnicalLabel>BOOKING_01</TechnicalLabel>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.02em]">
          {facility.is_bookable ? "Elegi tu horario" : "Espacio informativo"}
        </h2>

        {facility.is_bookable ? (
          <div className="mt-8">
            <ReservationFlow facility={facility} />
          </div>
        ) : (
          <p className="mt-4 max-w-xl border border-dashed border-charcoal/30 px-5 py-6 text-sm leading-6 text-charcoal/70">
            Este espacio aparece en el plano para orientarte, pero no forma parte del catalogo
            reservable. El acceso va incluido con cualquier reserva deportiva.
          </p>
        )}
      </section>
    </PublicLayout>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-olive">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function humanize(key: string): string {
  return key.replace(/_/g, " ");
}

function renderValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Si" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}
