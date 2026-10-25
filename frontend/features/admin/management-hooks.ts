"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApi, ApiError } from "@/lib/api";
import { useToast } from "../ui/toast-context";

export function useAdminOrganizations() {
  return useQuery({
    queryKey: ["admin", "organizations"],
    queryFn: adminApi.organizations,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  return useMutation({
    mutationFn: adminApi.createOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      notify("Organización creada.", "success");
    },
    onError: (error) =>
      notify(
        error instanceof ApiError ? error.detail : "No se pudo crear la organización.",
        "error",
      ),
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof adminApi.updateOrganization>[1] }) =>
      adminApi.updateOrganization(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      notify("Organización actualizada.", "success");
    },
    onError: (error) =>
      notify(
        error instanceof ApiError ? error.detail : "No se pudo actualizar la organización.",
        "error",
      ),
  });
}

export function useAdminUsers() {
  return useQuery({ queryKey: ["admin", "users"], queryFn: adminApi.users });
}

export function useCreateSystemUser() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  return useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      notify(
        variables.password
          ? "Usuario creado. Ya puede iniciar sesión con su correo y contraseña."
          : "Usuario creado. Su acceso se vinculará al iniciar sesión con Google.",
        "success",
      );
    },
    onError: (error) =>
      notify(error instanceof ApiError ? error.detail : "No se pudo crear el usuario.", "error"),
  });
}

export function useUpdateSystemUser() {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof adminApi.updateUser>[1] }) =>
      adminApi.updateUser(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      notify("Usuario actualizado.", "success");
    },
    onError: (error) =>
      notify(error instanceof ApiError ? error.detail : "No se pudo actualizar el usuario.", "error"),
  });
}
