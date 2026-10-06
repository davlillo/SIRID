"use client";

import { useQuery } from "@tanstack/react-query";

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
