"use client";

import { GoogleLogin } from "@react-oauth/google";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
      <p className="rounded-xl border border-dashed border-charcoal/30 px-4 py-3 text-xs leading-5 text-charcoal/70">
        El acceso con Google no está disponible. Puedes ingresar con tu usuario y contraseña.
      </p>
    );
  }

  if (busy) {
    return (
      <span role="status" className="inline-flex min-h-11 items-center gap-2 text-sm">
        <Spinner /> Verificando con Google…
      </span>
    );
  }

  return (
    <GoogleLogin
      locale="es"
      shape="pill"
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
        } catch {
          // AuthProvider reports the error; keep the Google callback resolved.
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
  const { user, isLoading, isAdmin, isReservationManager, logout } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await logout();
      router.push("/ingresar");
    } catch {
      // Keep the current page and session when logout fails; the provider notifies.
    } finally {
      setIsSigningOut(false);
    }
  }

  if (isLoading) return <Spinner />;

  if (!user) {
    return (
      <Link
        href="/ingresar"
        className="inline-flex min-h-11 items-center rounded-full border border-charcoal/20 px-4 text-sm font-semibold transition-colors duration-fast hover:bg-sand"
      >
        Ingresar
      </Link>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1 sm:gap-3">
      {isAdmin || isReservationManager ? (
        <Link
          href={isAdmin ? "/admin" : "/encargado"}
          className="inline-flex min-h-11 items-center rounded-full px-2 text-sm font-semibold hover:text-terracotta"
        >
          Panel
        </Link>
      ) : null}
      {user.role === "CLIENT" ? (
        <Link href="/mis-reservas" className="inline-flex min-h-11 items-center rounded-full px-2 text-sm font-semibold hover:text-terracotta">
          Mis reservas
        </Link>
      ) : null}
      <span
        title={user.email}
        className="hidden max-w-24 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-olive xl:inline"
      >
        {user.name.split(" ")[0]}
      </span>
      <Button variant="ghost" size="sm" disabled={isSigningOut} onClick={() => void signOut()}>
        {isSigningOut ? "Saliendo…" : "Salir"}
      </Button>
    </div>
  );
}
