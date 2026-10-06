"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/atoms/button";
import { Field, Select } from "@/components/atoms/field";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/atoms/states";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { FacilityCard } from "@/components/molecules/facility-card";
import { useFacilities } from "@/features/facilities/hooks";
import { SPORT_LABEL, ZONE_LABEL } from "@/lib/format";
import type { Facility, SportType, Zone } from "@/lib/types";

type Filters = {
  zone: Zone | "";
  sport_type: SportType | "";
  min_capacity: string;
};

const EMPTY_FILTERS: Filters = { zone: "", sport_type: "", min_capacity: "" };

const CAPACITY_OPTIONS = [
  { value: "", label: "Cualquiera" },
  { value: "10", label: "10 o mas" },
  { value: "20", label: "20 o mas" },
  { value: "100", label: "100 o mas" },
  { value: "300", label: "300 o mas" },
];

type SortKey = "recomendadas" | "capacidad" | "nombre";

export function FacilityCatalog() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortKey>("recomendadas");

  const query = useFacilities({
    zone: filters.zone || undefined,
    sport_type: filters.sport_type || undefined,
    min_capacity: filters.min_capacity ? Number(filters.min_capacity) : undefined,
    limit: 50,
  });

  const items = useMemo(() => sortFacilities(query.data?.items ?? [], sort), [query.data, sort]);
  const grouped = useMemo(() => groupByZone(items), [items]);
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="pb-8">
      <form
        aria-label="Filtros del catalogo"
        className="grid gap-4 border border-charcoal/20 bg-sand/30 p-5 md:grid-cols-4"
        onSubmit={(event) => event.preventDefault()}
      >
        <Field label="Zona" htmlFor="filter-zone">
          <Select
            id="filter-zone"
            value={filters.zone}
            onChange={(event) =>
              setFilters((current) => ({ ...current, zone: event.target.value as Zone | "" }))
            }
          >
            <option value="">Todas</option>
            {(Object.keys(ZONE_LABEL) as Zone[]).map((zone) => (
              <option key={zone} value={zone}>
                {ZONE_LABEL[zone]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Deporte o uso" htmlFor="filter-sport">
          <Select
            id="filter-sport"
            value={filters.sport_type}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                sport_type: event.target.value as SportType | "",
              }))
            }
          >
            <option value="">Todos</option>
            {(Object.keys(SPORT_LABEL) as SportType[]).map((sport) => (
              <option key={sport} value={sport}>
                {SPORT_LABEL[sport]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Capacidad minima" htmlFor="filter-capacity">
          <Select
            id="filter-capacity"
            value={filters.min_capacity}
            onChange={(event) =>
              setFilters((current) => ({ ...current, min_capacity: event.target.value }))
            }
          >
            {CAPACITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Orden" htmlFor="filter-sort">
          <Select
            id="filter-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
          >
            <option value="recomendadas">Recomendadas</option>
            <option value="capacidad">Mayor capacidad</option>
            <option value="nombre">Nombre</option>
          </Select>
        </Field>

        {hasFilters ? (
          <div className="md:col-span-4">
            <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
              Limpiar filtros
            </Button>
          </div>
        ) : null}
      </form>

      <div className="mt-8">
        {query.isPending ? <LoadingBlock label="CARGANDO CATALOGO" /> : null}

        {query.isError ? (
          <ErrorState
            description="No se pudo cargar el catalogo. Revisa que la API este disponible."
            action={
              <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
                Reintentar
              </Button>
            }
          />
        ) : null}

        {query.isSuccess && items.length === 0 ? (
          <EmptyState
            title="Sin resultados"
            description="Ninguna instalacion coincide con esos filtros. Proba ampliando la busqueda."
            action={
              <Button variant="secondary" onClick={() => setFilters(EMPTY_FILTERS)}>
                Limpiar filtros
              </Button>
            }
          />
        ) : null}

        {grouped.map(([zone, facilities]) => (
          <section key={zone} className="mb-12">
            <div className="mb-4 flex items-baseline justify-between border-b border-charcoal/15 pb-2">
              <h2 className="font-display text-2xl font-semibold">{ZONE_LABEL[zone]}</h2>
              <TechnicalLabel>{facilities.length} ESPACIOS</TechnicalLabel>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {facilities.map((facility, index) => (
                <FacilityCard key={facility.id} facility={facility} index={index} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function sortFacilities(items: Facility[], sort: SortKey): Facility[] {
  const copy = [...items];
  if (sort === "capacidad") return copy.sort((a, b) => b.capacity - a.capacity);
  if (sort === "nombre") return copy.sort((a, b) => a.name.localeCompare(b.name));
  // Recomendadas: primero lo reservable, luego por capacidad.
  return copy.sort(
    (a, b) => Number(b.is_bookable) - Number(a.is_bookable) || b.capacity - a.capacity,
  );
}

/** El catalogo se agrupa por zona (spect/07-flujos-de-interfaz.md). */
function groupByZone(items: Facility[]): [Zone, Facility[]][] {
  const order: Zone[] = ["ESTADIO", "FUTBOL", "CANCHAS", "ACUATICA", "EVENTOS", "SERVICIOS"];
  const buckets = new Map<Zone, Facility[]>();
  for (const facility of items) {
    buckets.set(facility.zone, [...(buckets.get(facility.zone) ?? []), facility]);
  }
  return order
    .filter((zone) => buckets.has(zone))
    .map((zone) => [zone, buckets.get(zone)!] as [Zone, Facility[]]);
}
