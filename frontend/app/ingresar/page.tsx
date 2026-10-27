"use client";

import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { TechnicalLabel } from "@/components/atoms/technical-label";
import { PublicLayout } from "@/components/templates/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GoogleAuthButton } from "@/features/auth/auth-button";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError } from "@/lib/api";

export default function SignInPage() {
  const router = useRouter();
  const { user, isAdmin, isReservationManager, loginWithPassword } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (isAdmin) router.replace("/admin");
    else if (isReservationManager) router.replace("/encargado");
    else router.replace("/mis-reservas");
  }, [user, isAdmin, isReservationManager, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    if (!identifier.trim()) {
      setError("Ingresa tu usuario o correo electrónico.");
      return;
    }
    setIsSubmitting(true);
    try {
      await loginWithPassword(identifier.trim(), password);
    } catch (error) {
      setError(error instanceof ApiError ? error.detail : "No se pudo iniciar sesión. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PublicLayout>
      <section className="sirid-page-banner my-6 grid items-center gap-8 px-5 py-10 sm:gap-12 sm:px-10 sm:py-16 lg:grid-cols-2 lg:px-12 lg:py-20">
        <div className="relative z-10 min-w-0">
          <TechnicalLabel>TU PRÓXIMO ENCUENTRO EMPIEZA AQUÍ</TechnicalLabel>
          <h1 className="dvl-display mt-4">Ingresa para reservar.</h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-charcoal/70">
            Accede con tu usuario o correo y contraseña, o con tu cuenta de Google.
            Consulta tus reservas y encuentra el espacio para tu próxima actividad.
          </p>
          <p className="mt-6 inline-flex items-center gap-2 text-sm text-charcoal/70">
            <ShieldCheck className="h-4 w-4 shrink-0 text-terracotta" aria-hidden="true" />
            Tu contraseña se protege mediante un hash, no se guarda en texto plano.
          </p>
        </div>

        <Card className="relative z-10 min-w-0 w-full max-w-md justify-self-center border border-charcoal/15 bg-ivory lg:justify-self-end">
          <CardHeader className="space-y-2">
            <TechnicalLabel>ACCESO LOCAL</TechnicalLabel>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
              Iniciar sesión
            </h2>
            <p className="text-sm text-muted-foreground">
              Ingresa tus credenciales para continuar.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={submit} className="grid gap-4" aria-busy={isSubmitting}>
              <div className="grid gap-2">
                <Label htmlFor="login-identifier">Usuario o correo</Label>
                <Input
                  id="login-identifier"
                  required
                  autoComplete="username"
                  className="min-h-11"
                  maxLength={320}
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-describedby={error ? "login-error" : undefined}
                  aria-invalid={Boolean(error)}
                  placeholder="tu@correo.com"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="login-password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    maxLength={128}
                    className="min-h-11 pr-12"
                    aria-describedby={error ? "login-error" : undefined}
                    aria-invalid={Boolean(error)}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    aria-pressed={showPassword}
                    aria-controls="login-password"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-lg text-charcoal/60 hover:text-terracotta focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
              {error ? (
                <p id="login-error" role="alert" className="rounded-xl border border-state-error/25 bg-state-error/5 px-3 py-3 text-sm text-state-error">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="min-h-11 w-full" disabled={isSubmitting}>
                {isSubmitting ? "Ingresando…" : "Iniciar sesión"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-charcoal/15" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-[0.16em]">
                <span className="bg-ivory px-3 text-muted-foreground">o continúa con</span>
              </div>
            </div>

            <div>
              <TechnicalLabel>GOOGLE IDENTITY</TechnicalLabel>
              <p className="mt-2 text-sm text-muted-foreground">
                Al continuar aceptas que registremos tu nombre y correo para gestionar tus
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
