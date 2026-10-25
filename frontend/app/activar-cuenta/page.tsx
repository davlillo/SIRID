"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/atoms/button";
import { Field } from "@/components/atoms/field";
import { PasswordInput } from "@/components/atoms/password-input";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { PublicLayout } from "@/components/templates/public-layout";
import { ApiError, authApi } from "@/lib/api";

export default function ActivateAccountPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (window.location.hash) {
      setToken(window.location.hash.slice(1));
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirmation) { setError("Las contraseñas no coinciden."); return; }
    setError("");
    setPending(true);
    try {
      await authApi.acceptInvitation(token, password);
      setCompleted(true);
      setPassword("");
      setConfirmation("");
      setToken("");
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.detail : "No se pudo establecer la contraseña.");
    } finally { setPending(false); }
  }

  return (
    <PublicLayout>
      <section className="sirid-panel mx-auto my-12 max-w-lg p-8 sm:p-10">
        <TechnicalLabel>ACCESO / INVITACIÓN</TechnicalLabel>
        <h1 className="mt-4 font-display text-3xl font-semibold">Establezca su contraseña</h1>
        {completed ? (
          <div className="mt-6 space-y-4" role="status">
            <p>Su contraseña se guardó correctamente. La cuenta conserva la organización que la creó.</p>
            <Link href="/ingresar" className="font-medium underline">Iniciar sesión</Link>
          </div>
        ) : (
          <form className="mt-6 grid gap-5" onSubmit={submit}>
            <p className="text-sm text-charcoal/65">El enlace es de un solo uso y vence en 24 horas.</p>
            <Field label="Nueva contraseña" htmlFor="activation-password" hint="Entre 8 y 128 caracteres.">
              <PasswordInput id="activation-password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} />
            </Field>
            <Field label="Confirmar contraseña" htmlFor="activation-confirmation">
              <PasswordInput id="activation-confirmation" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </Field>
            {error ? <p role="alert" className="text-sm text-state-error">{error}</p> : null}
            {!token ? <p role="alert" className="text-sm">Abra el enlace completo recibido por correo.</p> : null}
            <Button type="submit" disabled={pending || !token}>{pending ? "Guardando…" : "Guardar contraseña"}</Button>
          </form>
        )}
      </section>
    </PublicLayout>
  );
}
