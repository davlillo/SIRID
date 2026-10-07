"use client";

import { useQueries, useQuery } from "@tanstack/react-query";

import { facilitiesApi, type FacilityFilters } from "@/lib/api";

export function useFacilities(filters: FacilityFilters = {}) {
  return useQuery({
    queryKey: ["facilities", filters],
    queryFn: () => facilitiesApi.list(filters),
  });
}

export function useFacility(slug: string) {
  return useQuery({
    queryKey: ["facilities", "slug", slug],
    queryFn: () => facilitiesApi.bySlug(slug),
    enabled: Boolean(slug),
  });
}

export function useFacilityById(id: string) {
  return useQuery({
    queryKey: ["facilities", "id", id],
    queryFn: () => facilitiesApi.byId(id),
    enabled: Boolean(id),
  });
}

export function useAvailability(facilityId: string | undefined, date: string) {
  return useQuery({
    queryKey: ["availability", facilityId, date],
    queryFn: ({ signal }) => facilitiesApi.availability(facilityId!, date, signal),
    enabled: Boolean(facilityId && date),
    // La disponibilidad envejece rapido: se refresca al volver a la pantalla.
    staleTime: 10_000,
  });
}

export type RangeQuery = { date: string; start: string; end: string };

/** Un veredicto por tramo; se usa cuando el dia tiene entretiempos. */
export function useRangeChecks(facilityId: string | undefined, ranges: RangeQuery[]) {
  return useQueries({
    queries: ranges.map((range) => ({
      queryKey: ["availability", facilityId, "check", range],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        facilitiesApi.checkRange(facilityId!, range.date, range.start, range.end, signal),
      enabled: Boolean(facilityId),
      staleTime: 10_000,
      retry: false,
    })),
  });
}

export function useRangeCheck(facilityId: string | undefined, range: RangeQuery | null) {
  return useQuery({
    queryKey: ["availability", facilityId, "check", range],
    queryFn: ({ signal }) =>
      facilitiesApi.checkRange(facilityId!, range!.date, range!.start, range!.end, signal),
    enabled: Boolean(facilityId && range),
    staleTime: 10_000,
    retry: false,
  });
}
