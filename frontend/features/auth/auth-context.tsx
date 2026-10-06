"use client";

/**
 * Estado de sesion del cliente.
 *
 * El rol que se guarda aqui solo decide que se dibuja. Cada endpoint protegido
 * vuelve a validar la sesion en el backend: la UI nunca es la autoridad
 * (spect/06-autenticacion-y-seguridad.md).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useMemo } from "react";

import { ApiError, authApi } from "@/lib/api";
import type { User } from "@/lib/types";
import { useToast } from "../ui/toast-context";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const SESSION_QUERY_KEY = ["auth", "me"] as const;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const { notify } = useToast();

  const session = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch (error) {
        // Sin sesion no es un fallo: es el estado normal de un visitante.
        if (error instanceof ApiError && error.isUnauthorized) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
  });

  const login = useMutation({
    mutationFn: authApi.loginWithGoogle,
    onSuccess: (user) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      notify(`Sesion iniciada como ${user.name}.`, "success");
    },
    onError: (error) => {
      notify(error instanceof ApiError ? error.detail : "No se pudo iniciar sesion.", "error");
    },
  });

  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
      queryClient.removeQueries({ queryKey: ["reservations"] });
      queryClient.removeQueries({ queryKey: ["admin"] });
      notify("Sesion cerrada.");
    },
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session.data ?? null,
      isLoading: session.isPending,
      isAdmin: session.data?.role === "ADMIN",
      loginWithGoogle: async (credential: string) => {
        await login.mutateAsync(credential);
      },
      logout: async () => {
        await logout.mutateAsync();
      },
    }),
    [session.data, session.isPending, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}
