"use client";

import { GoogleLogin } from "@react-oauth/google";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { Spinner } from "@/components/atoms/states";
import { useToast } from "../ui/toast-context";
import { useAuth } from "./auth-context";

const GOOGLE_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

/** Boton de Google Identity. El credential se verifica siempre en el backend. */
export function GoogleAuthButton({ onDone }: { onDone?: () => void }) {
  const { loginWithGoogle } = useAuth();
  const { notify } = useToast();
  const [busy, setBusy] = useState(false);

  if (!GOOGLE_CONFIGURED) {
    return (
      <p className="border border-dashed border-charcoal/30 px-4 py-3 text-xs leading-5 text-charcoal/70">
        Falta configurar <code className="font-mono">GOOGLE_CLIENT_ID</code> en el archivo{" "}
        <code className="font-mono">.env</code> para habilitar el inicio de sesion.
      </p>
    );
  }

  if (busy) {
    return (
      <span className="inline-flex min-h-11 items-center gap-2 text-sm">
        <Spinner /> Verificando con Google…
      </span>
    );
  }

  return (
    <GoogleLogin
      locale="es"
      shape="square"
      text="signin_with"
      onSuccess={async (response) => {
        if (!response.credential) {
          notify("Google no devolvio una credencial.", "error");
          return;
        }
        setBusy(true);
        try {
          await loginWithGoogle(response.credential);
          onDone?.();
        } finally {
          setBusy(false);
        }
      }}
      onError={() => notify("No se pudo completar el inicio de sesion.", "error")}
    />
  );
}

/** Estado de sesion del header: acceso, panel y cierre de sesion. */
export function SessionMenu() {
  const { user, isLoading, isAdmin, canManageCatalog, logout } = useAuth();

  if (isLoading) return <Spinner />;

  if (!user) {
    return (
      <Link
        href="/ingresar"
        className="inline-flex min-h-11 items-center border border-charcoal px-4 text-sm font-semibold transition-colors duration-fast hover:bg-sand"
      >
        Ingresar
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {canManageCatalog ? (
        <Link
          href={isAdmin ? "/admin" : "/admin/instalaciones"}
          className="text-sm font-semibold hover:text-terracotta"
        >
          Panel
        </Link>
      ) : null}
      <Link href="/mis-reservas" className="text-sm font-semibold hover:text-terracotta">
        Mis reservas
      </Link>
      <span
        title={user.email}
        className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-olive sm:inline"
      >
        {user.name.split(" ")[0]}
      </span>
      <Button variant="ghost" size="sm" onClick={() => void logout()}>
        Salir
      </Button>
    </div>
  );
}
