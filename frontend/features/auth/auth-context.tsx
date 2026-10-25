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
import type { User, UserRole } from "@/lib/types";
import { useToast } from "../ui/toast-context";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  isReservationManager: boolean;
  canManageCatalog: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginWithPassword: (identifier: string, password: string) => Promise<void>;
  loginForDevelopment: (role: UserRole) => Promise<void>;
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

  async function replaceSession(user: User | null) {
    // Cancel in-flight reads before changing identity so an old response cannot
    // restore the previous account or repopulate tenant-sensitive cached data.
    await queryClient.cancelQueries();
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== "auth",
    });
    queryClient.setQueryData(SESSION_QUERY_KEY, user);
  }

  const login = useMutation({
    mutationFn: authApi.loginWithGoogle,
    onSuccess: async (user) => {
      await replaceSession(user);
      notify(`Sesión iniciada como ${user.name}.`, "success");
    },
    onError: (error) => {
      notify(error instanceof ApiError ? error.detail : "No se pudo iniciar sesion.", "error");
    },
  });

  const passwordLogin = useMutation({
    mutationFn: ({ identifier, password }: { identifier: string; password: string }) =>
      authApi.loginWithPassword(identifier, password),
    onSuccess: async (user) => {
      await replaceSession(user);
      notify(`Sesión iniciada como ${user.name}.`, "success");
    },
    onError: (error) => {
      notify(error instanceof ApiError ? error.detail : "No se pudo iniciar sesion.", "error");
    },
  });

  const developmentLogin = useMutation({
    mutationFn: authApi.loginForDevelopment,
    onSuccess: async (user) => {
      await replaceSession(user);
      notify(`Sesion de desarrollo iniciada como ${user.role}.`, "success");
    },
    onError: (error) => {
      notify(
        error instanceof ApiError ? error.detail : "No se pudo abrir la sesion de desarrollo.",
        "error",
      );
    },
  });

  const logout = useMutation({
    mutationFn: authApi.logout,
    onSuccess: async () => {
      await replaceSession(null);
      notify("Sesión cerrada.");
    },
    onError: (error) => {
      notify(error instanceof ApiError ? error.detail : "No se pudo cerrar la sesión. Intenta nuevamente.", "error");
    },
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session.data ?? null,
      isLoading: session.isPending,
      isAdmin: session.data?.role === "ADMIN",
      isReservationManager: session.data?.role === "ENCARGADO",
      canManageCatalog:
        session.data?.role === "ADMIN" || session.data?.role === "ENCARGADO",
      loginWithGoogle: async (credential: string) => {
        await login.mutateAsync(credential);
      },
      loginWithPassword: async (identifier: string, password: string) => {
        await passwordLogin.mutateAsync({ identifier, password });
      },
      loginForDevelopment: async (role: UserRole) => {
        await developmentLogin.mutateAsync(role);
      },
      logout: async () => {
        await logout.mutateAsync();
      },
    }),
    [session.data, session.isPending, login, passwordLogin, developmentLogin, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
}
