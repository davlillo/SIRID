"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/atoms/button";
import { Field, Input, Select } from "@/components/atoms/field";
import { PasswordInput } from "@/components/atoms/password-input";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError, adminApi, type SmtpInput, type SmtpSettings } from "@/lib/api";
import { useToast } from "@/features/ui/toast-context";

export function OrganizationSmtpSettings({ organizationId }: { organizationId: string }) {
  const settings = useQuery({
    queryKey: ["admin", "smtp", organizationId],
    queryFn: () => adminApi.smtp(organizationId),
  });

  return (
    <details className="sirid-panel mt-6 p-5 sm:p-6">
      <summary className="min-h-11 cursor-pointer content-center font-medium">Configuración de correo · SMTP</summary>
      <p className="mt-3 text-sm text-charcoal/65">
        Los accesos e invitaciones se envían desde la plataforma. Las notificaciones de reservas
        usan el SMTP propio cuando está habilitado; de lo contrario, el general.
      </p>
      {settings.isPending ? <p className="mt-3 text-sm">Cargando configuración…</p> : null}
      {settings.isError ? <p role="alert" className="mt-3 text-sm text-state-error">No se pudo cargar la configuración SMTP.</p> : null}
      {settings.data ? <>
        <SmtpForm key={organizationId} organizationId={organizationId} settings={settings.data} />
        <SmtpTest organizationId={organizationId} settings={settings.data} />
      </> : null}
    </details>
  );
}

function SmtpForm({ organizationId, settings }: { organizationId: string; settings: SmtpSettings }) {
  const { notify } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SmtpInput>({
    host: settings.host || settings.allowed_hosts[0] || "",
    port: settings.port,
    username: settings.username,
    from_email: settings.from_email,
    enabled: settings.enabled,
    password: "",
  });
  const save = useMutation({
    mutationFn: () => adminApi.saveSmtp(organizationId, { ...form, password: form.password || undefined }),
    onSuccess: (data) => {
      queryClient.setQueryData(["admin", "smtp", organizationId], data);
      setForm((current) => ({ ...current, password: "" }));
      notify("Configuración SMTP guardada. Las credenciales no se muestran nuevamente.", "success");
    },
    onError: (error) => notify(error instanceof ApiError ? error.detail : "No se pudo guardar SMTP.", "error"),
  });

  return (
    <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
      <p className="rounded-xl border border-charcoal/15 bg-sand/30 px-4 py-3 text-sm sm:col-span-2" role="status">
        SMTP general: {settings.platform_configured ? "credenciales configuradas; use la prueba para verificar el envío" : "sin configurar; los correos no se enviarán desde la plataforma"}.
      </p>
      {!settings.encryption_configured ? <p role="status" className="text-sm text-state-error sm:col-span-2">Para guardar credenciales propias, el administrador debe configurar SMTP_ENCRYPTION_KEY en el servidor. El correo general no requiere esta clave.</p> : null}
      <Field label="Servidor autorizado" htmlFor={`smtp-host-${organizationId}`}>
        <Select id={`smtp-host-${organizationId}`} value={form.host} onChange={(event) => setForm({ ...form, host: event.target.value })} required>
          {settings.allowed_hosts.map((host) => <option key={host} value={host}>{host}</option>)}
        </Select>
      </Field>
      <Field label="Seguridad y puerto" htmlFor={`smtp-port-${organizationId}`}>
        <Select id={`smtp-port-${organizationId}`} value={form.port} onChange={(event) => setForm({ ...form, port: Number(event.target.value) })}>
          <option value={587}>STARTTLS · 587</option><option value={465}>TLS · 465</option>
        </Select>
      </Field>
      <Field label="Usuario SMTP" htmlFor={`smtp-user-${organizationId}`}>
        <Input id={`smtp-user-${organizationId}`} value={form.username} maxLength={320} autoComplete="off" required onChange={(event) => setForm({ ...form, username: event.target.value })} />
      </Field>
      <Field label="Correo remitente autorizado" htmlFor={`smtp-from-${organizationId}`}>
        <Input id={`smtp-from-${organizationId}`} type="email" value={form.from_email} required maxLength={320} onChange={(event) => setForm({ ...form, from_email: event.target.value })} />
      </Field>
      <Field label="Contraseña de aplicación" htmlFor={`smtp-password-${organizationId}`} hint={settings.configured ? "Deje vacío para conservar la contraseña guardada." : "Se almacena cifrada; nunca se devuelve al navegador."}>
        <PasswordInput id={`smtp-password-${organizationId}`} autoComplete="new-password" value={form.password} maxLength={2048} required={!settings.configured} onChange={(event) => setForm({ ...form, password: event.target.value })} />
      </Field>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />
        Usar SMTP propio para las reservas
      </label>
      <div className="sm:col-span-2"><Button disabled={save.isPending || !settings.encryption_configured} type="submit">{save.isPending ? "Guardando…" : "Guardar SMTP propio"}</Button></div>
    </form>
  );
}

function SmtpTest({ organizationId, settings }: { organizationId: string; settings: SmtpSettings }) {
  const { user } = useAuth();
  const [recipient, setRecipient] = useState(user?.email ?? "");
  const [usePlatform, setUsePlatform] = useState(true);
  const test = useMutation({ mutationFn: () => adminApi.testSmtp(organizationId, recipient.trim(), usePlatform) });
  const messages = {
    SENT: "El servidor SMTP aceptó el correo de prueba. Revise la bandeja de entrada y spam; la aceptación no confirma la entrega final.",
    FAILED: "No se pudo enviar. Revise el usuario, la contraseña de aplicación y el servidor. En Gmail, use una contraseña de aplicación, no la contraseña habitual.",
    SKIPPED: "No hay credenciales de envío configuradas para este origen.",
  };

  return (
    <form className="mt-6 grid gap-4 border-t border-charcoal/15 pt-6 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); test.mutate(); }}>
      <div className="sm:col-span-2">
        <h3 className="font-semibold">Probar envío</h3>
        <p className="mt-1 text-sm text-charcoal/65">Se utilizará la configuración guardada. No envía contraseñas ni modifica cuentas.</p>
      </div>
      <Field label="Destinatario de prueba" htmlFor={`smtp-test-recipient-${organizationId}`}>
        <Input id={`smtp-test-recipient-${organizationId}`} type="email" required maxLength={320} value={recipient} onChange={(event) => { setRecipient(event.target.value); test.reset(); }} />
      </Field>
      <Field label="Origen del correo" htmlFor={`smtp-test-origin-${organizationId}`}>
        <Select id={`smtp-test-origin-${organizationId}`} value={usePlatform ? "platform" : "organization"} onChange={(event) => { setUsePlatform(event.target.value === "platform"); test.reset(); }}>
          <option value="platform">Plataforma · accesos e invitaciones</option>
          <option value="organization">Organización · reservas</option>
        </Select>
      </Field>
      <div className="sm:col-span-2"><Button type="submit" variant="secondary" disabled={test.isPending}>{test.isPending ? "Enviando prueba…" : "Enviar correo de prueba"}</Button></div>
      {test.data ? <p role="status" className="rounded-xl border border-charcoal/15 p-4 text-sm leading-6 sm:col-span-2">{messages[test.data.status]}</p> : null}
      {test.isError ? <p role="alert" className="text-sm text-state-error sm:col-span-2">{test.error instanceof ApiError ? test.error.detail : "No se pudo completar la prueba. Intente nuevamente."}</p> : null}
    </form>
  );
}
