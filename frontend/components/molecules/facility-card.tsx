import Link from "next/link";

import { TechnicalLabel } from "@/components/atoms/technical-label";
import { KIND_LABEL, SPORT_LABEL, ZONE_LABEL, facilityImage } from "@/lib/format";
import type { Facility } from "@/lib/types";

export function FacilityCard({
  facility,
  index,
  organizationSlug,
}: {
  facility: Facility;
  index: number;
  organizationSlug: string;
}) {
  const href = `/instalaciones/${facility.slug}?organization=${encodeURIComponent(organizationSlug)}`;

  return (
    <article className="sirid-catalog-card group flex flex-col overflow-hidden rounded-[2rem] border border-charcoal/15 bg-ivory transition-transform duration-base ease-technical hover:-translate-y-1">
      <Link
        href={href}
        className="flex h-full flex-col focus-visible:outline-none"
      >
        <div className="relative aspect-[8/5] overflow-hidden border-b border-charcoal/20 bg-sand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={facilityImage(facility.facility_kind, facility.images)}
            alt={facility.images[0]?.alt_text ?? `Vista esquematica de ${facility.name}`}
            loading={index < 3 ? "eager" : "lazy"}
            className="h-full w-full object-cover transition-transform duration-slow ease-technical group-hover:scale-[1.02]"
          />
          <span className="absolute left-3 top-3 rounded-full bg-charcoal px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ivory">
            {String(index + 1).padStart(2, "0")} / {KIND_LABEL[facility.facility_kind]}
          </span>
          {!facility.is_bookable ? (
            <span className="absolute right-3 top-3 rounded-full bg-sand px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-coffee">
              Informativo
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-5">
          <TechnicalLabel>
            {ZONE_LABEL[facility.zone]} · {SPORT_LABEL[facility.sport_type]}
          </TechnicalLabel>
          <h3 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-[-0.02em]">
            {facility.name}
          </h3>
          <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-charcoal/65">
            {facility.description}
          </p>

          <dl className="mt-5 flex items-center justify-between border-t border-charcoal/10 pt-4 font-mono text-[11px] uppercase tracking-[0.12em]">
            <div>
              <dt className="sr-only">Capacidad</dt>
              <dd className="text-charcoal/70">CAP. {facility.capacity}</dd>
            </div>
            <div>
              <dt className="sr-only">Ubicacion</dt>
              <dd className="text-olive">{facility.location_label}</dd>
            </div>
          </dl>

          <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-terracotta">
            Ver disponibilidad
            <span aria-hidden="true" className="transition-transform duration-fast group-hover:translate-x-1">
              →
            </span>
          </span>
        </div>
      </Link>
    </article>
  );
}
