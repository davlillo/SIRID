"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { TechnicalLabel } from "@/components/atoms/technical-label";
import { PublicLayout } from "@/components/templates/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleAuthButton } from "@/features/auth/auth-button";
import { useAuth } from "@/features/auth/auth-context";

export default function SignInPage() {
  const router = useRouter();
  const { user, isAdmin, isReservationManager, loginWithPassword } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (isAdmin) router.replace("/admin");
    else if (isReservationManager) router.replace("/admin/reservas");
    else router.replace("/mis-reservas");
  }, [user, isAdmin, isReservationManager, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await loginWithPassword(identifier.trim(), password);
    } catch {
      // El contexto de sesion ya muestra el error en el toast.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PublicLayout>
      <section className="grid items-center gap-12 py-20 md:grid-cols-2">
        <div>
          <TechnicalLabel>AUTH_01</TechnicalLabel>
          <h1 className="dvl-display mt-4">Ingresa para reservar.</h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-charcoal/70">
            Entrá con tu usuario o correo y contraseña, o con tu cuenta de Google. Las
            contraseñas se guardan cifradas: el servidor verifica tu identidad y abre una
            sesión propia.
          </p>
        </div>

        <Card className="w-full max-w-md justify-self-center border-charcoal/15 md:justify-self-end">
          <CardHeader className="space-y-2">
            <TechnicalLabel>ACCESO LOCAL</TechnicalLabel>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
              Iniciar sesión
            </h2>
            <p className="text-sm text-muted-foreground">
              Usá tu usuario o correo y tu contraseña.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={submit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="login-identifier">Usuario o correo</Label>
                <Input
                  id="login-identifier"
                  required
                  autoComplete="username"
                  maxLength={320}
                  placeholder="tu@correo.com"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="login-password">Contraseña</Label>
                <Input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Ingresando…" : "Iniciar sesión"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-charcoal/15" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-[0.16em]">
                <span className="bg-card px-3 text-muted-foreground">o</span>
              </div>
            </div>

            <div>
              <TechnicalLabel>GOOGLE IDENTITY</TechnicalLabel>
              <p className="mt-2 text-sm text-muted-foreground">
                Al continuar aceptás que registremos tu nombre y correo para gestionar tus
                reservas.
              </p>
              <div className="mt-4">
                <GoogleAuthButton />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </PublicLayout>
  );
}
