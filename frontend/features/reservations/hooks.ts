"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiError, reservationsApi, type CreateReservationInput } from "@/lib/api";
import { useToast } from "../ui/toast-context";

export function useMyReservations() {
  return useQuery({
    queryKey: ["reservations", "me"],
    queryFn: () => reservationsApi.mine(),
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (input: CreateReservationInput) => reservationsApi.create(input),
    onSuccess: (reservation) => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      notify(`Solicitud enviada para ${reservation.facility.name}.`, "success");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.isConflict) {
        // Otra persona gano la franja: hay que releer la disponibilidad.
        queryClient.invalidateQueries({ queryKey: ["availability"] });
        notify("Esa franja acaba de ocuparse. Elegi otro bloque.", "error");
        return;
      }
      notify(error instanceof ApiError ? error.detail : "No se pudo crear la reserva.", "error");
    },
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (id: string) => reservationsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      notify("Reserva cancelada. La franja vuelve a estar disponible.", "success");
    },
    onError: (error) => {
      notify(error instanceof ApiError ? error.detail : "No se pudo cancelar.", "error");
    },
  });
}
