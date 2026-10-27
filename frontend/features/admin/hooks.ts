"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ApiError,
  adminApi,
  type AdminReservationFilters,
  type AdminReservationReportFilters,
} from "@/lib/api";
import type { ScheduleInput } from "@/lib/types";
import { useToast } from "../ui/toast-context";

export function useAdminStats() {
  return useQuery({ queryKey: ["admin", "stats"], queryFn: adminApi.stats });
}

export function useAdminClients() {
  return useQuery({
    queryKey: ["admin", "clients"],
    queryFn: adminApi.clients,
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: Parameters<typeof adminApi.updateClient>[1];
    }) => adminApi.updateClient(id, body),
    onSuccess: (client, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "clients"] });
      if (variables.body.is_active === false) notify("Cliente dado de baja.", "success");
      else if (variables.body.is_active === true) notify("Cliente reactivado.", "success");
      else notify(`Datos de ${client.first_name} actualizados.`, "success");
    },
    onError: (error) => {
      notify(
        error instanceof ApiError ? error.detail : "No se pudo actualizar el cliente.",
        "error",
      );
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: adminApi.createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "clients"] });
      notify("Cliente registrado. El envío del correo se procesa por separado; consulte el historial en el icono de correo.", "success");
    },
    onError: (error) => {
      notify(
        error instanceof ApiError ? error.detail : "No se pudo registrar el cliente.",
        "error",
      );
    },
  });
}

export function useAdminReservations(filters: AdminReservationFilters) {
  return useQuery({
    queryKey: ["admin", "reservations", filters],
    queryFn: () => adminApi.reservations(filters),
  });
}

export function useReservationReport(filters: AdminReservationReportFilters | null) {
  return useQuery({
    queryKey: ["admin", "reports", "reservations", filters],
    queryFn: () => {
      if (!filters) throw new Error("Report filters are required.");
      return adminApi.reservationReport(filters);
    },
    enabled: filters !== null,
  });
}

export function useAdminFacilities() {
  return useQuery({ queryKey: ["admin", "facilities"], queryFn: () => adminApi.facilities() });
}

export function useAdminFacility(id: string) {
  return useQuery({
    queryKey: ["admin", "facilities", id],
    queryFn: () => adminApi.facility(id),
    enabled: Boolean(id),
  });
}

export function useReservationNotifications(id: string | null) {
  return useQuery({
    queryKey: ["admin", "notifications", id],
    queryFn: () => adminApi.notifications(id!),
    enabled: Boolean(id),
  });
}

export function useReservationPayments(id: string | null) {
  return useQuery({
    queryKey: ["admin", "payments", id],
    queryFn: () => adminApi.reservationPayments(id!),
    enabled: Boolean(id),
  });
}

export function useRegisterPayment() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      amount,
      note,
    }: {
      id: string;
      amount: string;
      note?: string;
    }) => adminApi.registerPayment(id, { amount, note: note ?? null }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "payments", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "reservations"] });
      notify("Pago registrado.", "success");
    },
    onError: (error) => {
      notify(
        error instanceof ApiError ? error.detail : "No se pudo registrar el pago.",
        "error",
      );
    },
  });
}

type Action = "confirm" | "cancel" | "complete";
type ReservationActionInput =
  | { id: string; action: "cancel"; note: string }
  | { id: string; action: "confirm" | "complete" };

const ACTION_MESSAGE: Record<Action, string> = {
  confirm: "Reserva confirmada. Se envio el aviso al cliente.",
  cancel: "Reserva cancelada.",
  complete: "Reserva marcada como completada.",
};

export function useReservationAction() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (input: ReservationActionInput) => {
      const { id, action } = input;
      if (input.action === "cancel") return adminApi.cancel(id, input.note);
      if (action === "confirm") return adminApi.confirm(id);
      return adminApi.complete(id);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      notify(ACTION_MESSAGE[variables.action], "success");
    },
    onError: (error) => {
      notify(
        error instanceof ApiError ? error.detail : "No se pudo aplicar la accion.",
        "error",
      );
    },
  });
}

export function useRetryNotification() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: (id: string) => adminApi.retryNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
      notify("Reintento de correo encolado.", "success");
    },
    onError: () => notify("No se pudo reintentar el envio.", "error"),
  });
}

export function useSaveFacility() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: Record<string, unknown> }) =>
      id ? adminApi.updateFacility(id, body) : adminApi.createFacility(body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
      notify(variables.id ? "Instalacion actualizada." : "Instalacion creada.", "success");
    },
    onError: (error) => {
      notify(error instanceof ApiError ? error.detail : "No se pudo guardar.", "error");
    },
  });
}

export function useSaveSchedules() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: ({ id, schedules }: { id: string; schedules: ScheduleInput[] }) =>
      adminApi.replaceSchedules(id, schedules),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      notify("Horario semanal actualizado.", "success");
    },
    onError: (error) => {
      notify(error instanceof ApiError ? error.detail : "Horario invalido.", "error");
    },
  });
}

export function useCreateRate() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      adminApi.createRate(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
      notify("Tarifa registrada.", "success");
    },
    onError: (error) => {
      notify(error instanceof ApiError ? error.detail : "Tarifa invalida.", "error");
    },
  });
}

export function usePublishRate() {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      amount,
      effectiveFrom,
      minimumMinutes,
    }: {
      id: string;
      amount: string;
      effectiveFrom: string;
      minimumMinutes: number;
    }) =>
      adminApi.publishRate(id, {
        amount,
        effective_from: effectiveFrom,
        minimum_minutes: minimumMinutes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "facilities"] });
      queryClient.invalidateQueries({ queryKey: ["facilities"] });
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      notify("Nueva tarifa vigente publicada.", "success");
    },
    onError: (error) => {
      notify(
        error instanceof ApiError ? error.detail : "No se pudo actualizar la tarifa.",
        "error",
      );
    },
  });
}
