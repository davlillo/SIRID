"use client";

import { useQueries, useQuery } from "@tanstack/react-query";

import { facilitiesApi, type FacilityFilters } from "@/lib/api";

export function useFacilities(filters: FacilityFilters, organizationSlug: string) {
  return useQuery({
    queryKey: ["facilities", organizationSlug, filters],
    queryFn: () => facilitiesApi.listForOrganization(organizationSlug, filters),
  });
}

export function useFacility(slug: string, organizationSlug: string) {
  return useQuery({
    queryKey: ["facilities", organizationSlug, "slug", slug],
    queryFn: () => facilitiesApi.bySlugForOrganization(organizationSlug, slug),
    enabled: Boolean(slug),
  });
}

export function useAvailability(
  facilityId: string | undefined,
  date: string,
  organizationSlug: string,
) {
  return useQuery({
    queryKey: ["availability", organizationSlug, facilityId, date],
    queryFn: ({ signal }) =>
      facilitiesApi.availabilityForOrganization(
        organizationSlug,
        facilityId!,
        date,
        signal,
      ),
    enabled: Boolean(facilityId && date),
    // La disponibilidad envejece rapido: se refresca al volver a la pantalla.
    staleTime: 10_000,
  });
}

export type RangeQuery = { date: string; start: string; end: string };

/** Un veredicto por tramo; se usa cuando el dia tiene entretiempos. */
export function useRangeChecks(
  facilityId: string | undefined,
  ranges: RangeQuery[],
  organizationSlug: string,
) {
  return useQueries({
    queries: ranges.map((range) => ({
      queryKey: ["availability", organizationSlug, facilityId, "check", range],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        facilitiesApi.checkRangeForOrganization(
          organizationSlug,
          facilityId!,
          range.date,
          range.start,
          range.end,
          signal,
        ),
      enabled: Boolean(facilityId),
      staleTime: 10_000,
      retry: false,
    })),
  });
}

export function useRangeCheck(
  facilityId: string | undefined,
  range: RangeQuery | null,
  organizationSlug: string,
) {
  return useQuery({
    queryKey: ["availability", organizationSlug, facilityId, "check", range],
    queryFn: ({ signal }) =>
      facilitiesApi.checkRangeForOrganization(
        organizationSlug,
        facilityId!,
        range!.date,
        range!.start,
        range!.end,
        signal,
      ),
    enabled: Boolean(facilityId && range),
    staleTime: 10_000,
    retry: false,
  });
}
