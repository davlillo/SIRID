"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button } from "@/components/atoms/button";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { PublicLayout } from "@/components/templates/public-layout";
import { GoogleAuthButton } from "@/features/auth/auth-button";
import { useAuth } from "@/features/auth/auth-context";

const DEV_AUTH_ENABLED = process.env.NEXT_PUBLIC_DEV_AUTH_ENABLED === "true";

export default function SignInPage() {
  const router = useRouter();
  const { user, isAdmin, canManageCatalog, loginForDevelopment } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (isAdmin) router.replace("/admin");
    else if (canManageCatalog) router.replace("/admin/instalaciones");
    else router.replace("/mis-reservas");
  }, [user, isAdmin, canManageCatalog, router]);

  return (
    <PublicLayout>
      <section className="grid items-center gap-12 py-20 md:grid-cols-2">
        <div>
          <TechnicalLabel>AUTH_01</TechnicalLabel>
          <h1 className="dvl-display mt-4">Ingresa para reservar.</h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-charcoal/70">
            Usamos Google para identificarte. No guardamos tu contraseña ni el token de Google:
            el servidor verifica tu identidad y abre una sesion propia.
          </p>
        </div>

        <div className="technical-grid border border-charcoal bg-sand/40 p-8">
          <TechnicalLabel>GOOGLE IDENTITY</TechnicalLabel>
          <p className="mt-3 text-sm leading-6 text-charcoal/70">
            Al continuar aceptas que registremos tu nombre y correo para gestionar tus reservas.
          </p>
          <div className="mt-6">
            <GoogleAuthButton />
          </div>
          {DEV_AUTH_ENABLED ? (
            <div className="mt-6 border-t border-charcoal/15 pt-5">
              <TechnicalLabel>ACCESO LOCAL DE DESARROLLO</TechnicalLabel>
              <p className="mt-2 text-xs leading-5 text-charcoal/60">
                Disponible unicamente en esta instalacion local.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => void loginForDevelopment("ENCARGADO")}
                >
                  Entrar como encargado
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void loginForDevelopment("CLIENT")}
                >
                  Entrar como cliente
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void loginForDevelopment("ADMIN")}
                >
                  Entrar como admin
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </PublicLayout>
  );
}
