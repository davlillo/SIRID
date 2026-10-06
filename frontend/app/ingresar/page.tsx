"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { TechnicalLabel } from "@/components/atoms/technical-label";
import { PublicLayout } from "@/components/templates/public-layout";
import { GoogleAuthButton } from "@/features/auth/auth-button";
import { useAuth } from "@/features/auth/auth-context";

export default function SignInPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (user) router.replace(isAdmin ? "/admin" : "/mis-reservas");
  }, [user, isAdmin, router]);

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
            <GoogleAuthButton onDone={() => router.replace("/mis-reservas")} />
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
