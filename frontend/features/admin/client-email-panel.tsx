"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/atoms/button";
import { ApiError, adminApi } from "@/lib/api";
import type { Client } from "@/lib/types";
import { useToast } from "@/features/ui/toast-context";

export function ClientEmailPanel({ client }: { client: Client }) {
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const logs = useQuery({
    queryKey: ["admin", "client-notifications", client.id],
    queryFn: () => adminApi.clientNotifications(client.id),
    refetchInterval: 5000,
  });
  const resend = useMutation({
    mutationFn: () => adminApi.inviteClient(client.id),
    onSuccess: () => {
      notify("Invitación encolada. Consulte el resultado en este historial.", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "client-notifications", client.id] });
    },
    onError: (error) => notify(error instanceof ApiError ? error.detail : "No se pudo reenviar la invitación.", "error"),
  });
  const labels = { SENT: "Aceptado por el servidor SMTP", SKIPPED: "Sin SMTP configurado", FAILED: "Falló el envío" };

  return (
    <div className="space-y-4">
      <p className="break-words text-sm leading-6">Correo de acceso: <strong>{client.email}</strong>. El nuevo enlace vence en 24 horas e invalida el anterior.</p>
      <Button type="button" disabled={resend.isPending || !client.is_active} onClick={() => resend.mutate()}>
        {resend.isPending ? "Encolando…" : "Reenviar enlace para establecer contraseña"}
      </Button>
      {logs.isPending ? <p role="status">Cargando historial…</p> : null}
      {logs.isError ? <p role="alert">No se pudo cargar el historial.</p> : null}
      {logs.data?.length === 0 ? <p className="text-sm">Todavía no hay intentos de envío registrados.</p> : null}
      <ul className="divide-y divide-charcoal/15">
        {logs.data?.map((log) => (
          <li key={log.id} className="py-3 text-sm">
            <strong>{labels[log.status]}</strong> · {new Date(log.created_at).toLocaleString()}
            {log.status === "FAILED" ? <p className="mt-1 text-charcoal/65">Revise la configuración de correo general de la plataforma y vuelva a intentarlo.</p> : null}
            {log.status === "SKIPPED" ? <p className="mt-1 text-charcoal/65">Configure el SMTP general para enviar invitaciones, o asigne una contraseña desde la edición del cliente.</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
