"use client";

import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/atoms/button";
import { IconAction } from "@/components/atoms/icon-action";
import { Field, Input } from "@/components/atoms/field";
import { Modal } from "@/components/atoms/modal";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/atoms/states";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { cn } from "@/lib/cn";
import type { Client } from "@/lib/types";

import { useAdminClients, useCreateClient, useUpdateClient } from "./hooks";

type ClientForm = {
  first_name: string;
  last_name: string;
  dui: string;
  phone: string;
  email: string;
};

const EMPTY_FORM: ClientForm = {
  first_name: "",
  last_name: "",
  dui: "",
  phone: "",
  email: "",
};

// Los clientes creados antes de pedir el correo tienen uno interno de relleno.
const isPlaceholderEmail = (email: string) => email.endsWith("@client.sirid.local");

/** Clientes de una organizacion: alta, edicion y baja. */
export function ClientsManager({ organizationId }: { organizationId: string }) {
  const clients = useAdminClients();
  const create = useCreateClient();
  const update = useUpdateClient();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [toDeactivate, setToDeactivate] = useState<Client | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);

  const errors = validateClient(form);
  const hasErrors = Object.values(errors).some(Boolean);
  const isSaving = create.isPending || update.isPending;

  const scoped = useMemo(
    () => (clients.data ?? []).filter((client) => client.organization_id === organizationId),
    [clients.data, organizationId],
  );

  const visibleClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return scoped;
    return scoped.filter((client) =>
      `${client.first_name} ${client.last_name} ${client.dui} ${client.email}`
        .toLowerCase()
        .includes(term),
    );
  }, [scoped, search]);

  function resetForm() {
    setCreating(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setAttempted(false);
  }

  function startCreating() {
    setEditing(null);
    setCreating(true);
    setForm(EMPTY_FORM);
    setAttempted(false);
  }

  function startEditing(client: Client) {
    setCreating(false);
    setEditing(client);
    setAttempted(false);
    setForm({
      first_name: client.first_name,
      last_name: client.last_name,
      dui: client.dui,
      phone: client.phone,
      email: isPlaceholderEmail(client.email) ? "" : client.email,
    });
  }

  const showForm = creating || editing !== null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (hasErrors) return;

    if (editing) {
      const body = changedFields(editing, form);
      if (Object.keys(body).length === 0) {
        resetForm();
        return;
      }
      await update.mutateAsync({ id: editing.id, body });
    } else {
      await create.mutateAsync({
        organization_id: organizationId,
        ...form,
      });
    }
    resetForm();
  }

  async function confirmDeactivation() {
    if (!toDeactivate) return;
    await update.mutateAsync({ id: toDeactivate.id, body: { is_active: false } });
    setToDeactivate(null);
  }

  const shown = (key: keyof ClientForm) => visibleError(errors[key], form[key], attempted);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <TechnicalLabel>CLIENTS_01</TechnicalLabel>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em]">
            Clientes
          </h2>
        </div>
        <Button type="button" onClick={startCreating}>
          Nuevo cliente
        </Button>
      </div>

      {clients.isPending ? <div className="mt-8"><LoadingBlock /></div> : null}
      {clients.isError ? (
        <div className="mt-8">
          <ErrorState description="No se pudo cargar el listado de clientes." />
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_min(100%,22rem)] xl:items-stretch">
        <section className="sirid-table-wrap flex min-w-0 flex-col">
          <div className="flex flex-col gap-3 border-b border-charcoal/15 px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
            <TechnicalLabel>CLIENTES REGISTRADOS</TechnicalLabel>
            <div className="w-full sm:max-w-xs">
              <label htmlFor="client-search" className="sr-only">
                Buscar cliente
              </label>
              <Input
                id="client-search"
                type="search"
                placeholder="Buscar por nombre, DUI o correo"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {clients.isSuccess && scoped.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="Sin clientes"
                description="Pulsa «Nuevo cliente» para registrar el primero."
              />
            </div>
          ) : null}
          {clients.isSuccess && scoped.length > 0 && visibleClients.length === 0 ? (
            <p className="px-4 py-6 text-sm text-charcoal/60">
              Ningún cliente coincide con la búsqueda.
            </p>
          ) : null}

          {visibleClients.length > 0 ? (
            <div className="min-h-0 flex-1">
               <table className="w-full table-fixed border-collapse text-sm">
                <caption className="sr-only">Clientes registrados en la organización</caption>
                <thead>
                  <tr className="bg-charcoal text-ivory">
                    <th
                      scope="col"
                      className="w-[28%] px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em]"
                    >
                      Cliente
                    </th>
                    <th
                      scope="col"
                      className="w-[22%] px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em]"
                    >
                      DUI
                    </th>
                    <th
                      scope="col"
                      className="w-[20%] px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em]"
                    >
                      Teléfono
                    </th>
                    <th
                      scope="col"
                      className="w-[12%] px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em]"
                    >
                      Estado
                    </th>
                    <th
                      scope="col"
                      className="w-[18%] px-3 py-2.5 text-right font-mono text-[10px] uppercase tracking-[0.14em]"
                    >
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleClients.map((client) => (
                    <tr
                      key={client.id}
                      className={
                        editing?.id === client.id
                          ? "border-t border-charcoal/10 bg-sand"
                          : "border-t border-charcoal/10"
                      }
                    >
                      <td className="px-3 py-2.5 align-top">
                        <span
                          className={cn(
                            "block truncate font-medium",
                            !client.is_active && "text-charcoal/50 line-through",
                          )}
                          title={`${client.first_name} ${client.last_name}`}
                        >
                          {client.first_name} {client.last_name}
                        </span>
                        <span
                          className="mt-0.5 block truncate text-xs text-charcoal/55"
                          title={
                            isPlaceholderEmail(client.email)
                              ? undefined
                              : client.email
                          }
                        >
                          {isPlaceholderEmail(client.email)
                            ? "Sin correo registrado"
                            : client.email}
                        </span>
                      </td>
                      <td
                        className={cn(
                          "whitespace-nowrap px-3 py-2.5 font-mono text-xs align-top",
                          !client.is_active && "text-charcoal/50 line-through",
                        )}
                      >
                        {client.dui}
                      </td>
                      <td
                        className={cn(
                          "whitespace-nowrap px-3 py-2.5 font-mono text-xs align-top",
                          !client.is_active && "text-charcoal/50",
                        )}
                        title={client.phone}
                      >
                        {client.phone}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <span
                          className={
                            client.is_active
                               ? "inline-block rounded-full border border-olive px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-olive"
                               : "inline-block rounded-full border border-charcoal/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-charcoal/55"
                          }
                        >
                          {client.is_active ? "Activo" : "De baja"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="flex justify-end gap-1.5">
                          <IconAction
                            label={`Editar a ${client.first_name} ${client.last_name}`}
                            onClick={() => startEditing(client)}
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                          </IconAction>
                          {client.is_active ? (
                            <IconAction
                              label={`Dar de baja a ${client.first_name} ${client.last_name}`}
                              variant="danger"
                              onClick={() => setToDeactivate(client)}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </IconAction>
                          ) : (
                            <IconAction
                              label={`Reactivar a ${client.first_name} ${client.last_name}`}
                              disabled={update.isPending}
                              onClick={() =>
                                update.mutate({ id: client.id, body: { is_active: true } })
                              }
                            >
                              <RotateCcw className="h-4 w-4" aria-hidden />
                            </IconAction>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <div className="min-h-full">
          {showForm ? (
            <form
              onSubmit={submit}
              noValidate
               className="sirid-panel h-full bg-sand/25 p-5"
            >
          <TechnicalLabel>{editing ? "EDITAR CLIENTE" : "NUEVO CLIENTE"}</TechnicalLabel>
          <div className="mt-4 grid gap-4">
            <Field
              label="Nombres"
              htmlFor="client-first-name"
              hint="Solo letras, espacios, apóstrofes o guiones."
              error={shown("first_name")}
            >
              <Input
                id="client-first-name"
                required
                maxLength={80}
                autoComplete="off"
                aria-invalid={Boolean(shown("first_name"))}
                value={form.first_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    first_name: cleanName(event.target.value),
                  }))
                }
              />
            </Field>
            <Field
              label="Apellidos"
              htmlFor="client-last-name"
              hint="Solo letras, espacios, apóstrofes o guiones."
              error={shown("last_name")}
            >
              <Input
                id="client-last-name"
                required
                maxLength={80}
                autoComplete="off"
                aria-invalid={Boolean(shown("last_name"))}
                value={form.last_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    last_name: cleanName(event.target.value),
                  }))
                }
              />
            </Field>
            <Field
              label="DUI"
              htmlFor="client-dui"
              hint="Escribe los 9 dígitos; el guion se agrega automáticamente."
              error={shown("dui")}
            >
              <Input
                id="client-dui"
                required
                inputMode="numeric"
                maxLength={10}
                placeholder="12345678-9"
                autoComplete="off"
                aria-invalid={Boolean(shown("dui"))}
                value={form.dui}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dui: formatDui(event.target.value) }))
                }
              />
            </Field>
            <Field
              label="Teléfono"
              htmlFor="client-phone"
              hint="Número de 8 dígitos."
              error={shown("phone")}
            >
              <Input
                id="client-phone"
                required
                inputMode="tel"
                maxLength={9}
                placeholder="7777-7777"
                autoComplete="off"
                aria-invalid={Boolean(shown("phone"))}
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone: formatPhone(event.target.value),
                  }))
                }
              />
            </Field>
            <Field
              label="Correo electrónico"
              htmlFor="client-email"
              hint="Se usa para avisarle de sus reservaciones."
              error={shown("email")}
              className="sm:col-span-2"
            >
              <Input
                id="client-email"
                required
                type="email"
                inputMode="email"
                maxLength={254}
                placeholder="cliente@correo.com"
                autoComplete="off"
                aria-invalid={Boolean(shown("email"))}
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value.replace(/\s/g, "").toLowerCase(),
                  }))
                }
              />
            </Field>
          </div>

          {attempted && hasErrors ? (
            <p role="alert" className="mt-4 text-sm font-medium text-state-error">
              Revisa los campos marcados antes de continuar.
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? "Guardando…"
                : editing
                  ? "Guardar cambios"
                  : "Registrar cliente"}
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancelar
            </Button>
          </div>
            </form>
          ) : (
             <aside className="sirid-panel flex h-full min-h-[12rem] flex-col justify-center border-dashed p-6">
              <TechnicalLabel>REGISTRO</TechnicalLabel>
              <p className="mt-3 text-sm leading-6 text-charcoal/60">
                Pulsa <strong className="font-semibold text-charcoal">Nuevo cliente</strong> para
                abrir el formulario de alta, o el icono de{" "}
                <strong className="font-semibold text-charcoal">lápiz</strong> en la tabla para
                editar.
              </p>
            </aside>
          )}
        </div>
      </div>

      <Modal
        open={toDeactivate !== null}
        title="Dar de baja al cliente"
        onClose={() => setToDeactivate(null)}
        showHeaderClose={false}
      >
        <p className="text-sm leading-6 text-charcoal/75">
          ¿Dar de baja a{" "}
          <strong>
            {toDeactivate?.first_name} {toDeactivate?.last_name}
          </strong>
          ? Sus datos y su historial se conservan, pero no podrá hacer nuevas
          reservaciones. Podrás reactivarlo cuando quieras.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="danger"
            disabled={update.isPending}
            onClick={confirmDeactivation}
          >
            {update.isPending ? "Procesando…" : "Sí, dar de baja"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setToDeactivate(null)}>
            Cancelar
          </Button>
        </div>
      </Modal>
    </>
  );
}

const NAME_PATTERN = /^[\p{L}]+(?:[ '\-][\p{L}]+)*$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateClient(form: ClientForm): Record<keyof ClientForm, string> {
  return {
    first_name: validateName(form.first_name, "Los nombres"),
    last_name: validateName(form.last_name, "Los apellidos"),
    dui: /^\d{8}-\d$/.test(form.dui) ? "" : "El DUI debe contener 9 dígitos.",
    phone: /^\d{4}-\d{4}$/.test(form.phone)
      ? ""
      : "El teléfono debe contener 8 dígitos.",
    email: EMAIL_PATTERN.test(form.email)
      ? ""
      : "Escribe un correo válido, por ejemplo cliente@correo.com.",
  };
}

function validateName(value: string, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 2) return `${label} deben tener al menos 2 caracteres.`;
  if (!NAME_PATTERN.test(trimmed)) return `${label} contienen caracteres no permitidos.`;
  return "";
}

function visibleError(error: string, value: string, attempted: boolean): string | undefined {
  return error && (attempted || value.length > 0) ? error : undefined;
}

function changedFields(original: Client, form: ClientForm): Partial<ClientForm> {
  const changes: Partial<ClientForm> = {};
  const current: ClientForm = {
    ...form,
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
  };
  for (const key of ["first_name", "last_name", "dui", "phone", "email"] as const) {
    if (current[key] !== original[key]) changes[key] = current[key];
  }
  return changes;
}

function cleanName(value: string): string {
  return value.replace(/[^\p{L} '\-]/gu, "").replace(/\s{2,}/g, " ").slice(0, 80);
}

function formatDui(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  return digits.length > 8 ? `${digits.slice(0, 8)}-${digits.slice(8)}` : digits;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
}
