"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/atoms/button";
import { Field, Input } from "@/components/atoms/field";
import { Modal } from "@/components/atoms/modal";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/atoms/states";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { AdminLayout } from "@/components/templates/admin-layout";
import {
  useAdminClients,
  useCreateClient,
  useUpdateClient,
} from "@/features/admin/hooks";
import type { Client } from "@/lib/types";

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

export default function AdminClientsPage() {
  const clients = useAdminClients();
  const create = useCreateClient();
  const update = useUpdateClient();
  const [editing, setEditing] = useState<Client | null>(null);
  const [toDeactivate, setToDeactivate] = useState<Client | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);

  const errors = validateClient(form);
  const hasErrors = Object.values(errors).some(Boolean);
  const isSaving = create.isPending || update.isPending;

  const visibleClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients.data ?? [];
    return (clients.data ?? []).filter((client) =>
      `${client.first_name} ${client.last_name} ${client.dui} ${client.email}`
        .toLowerCase()
        .includes(term),
    );
  }, [clients.data, search]);

  function resetForm() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setAttempted(false);
  }

  function startEditing(client: Client) {
    setEditing(client);
    setAttempted(false);
    setForm({
      first_name: client.first_name,
      last_name: client.last_name,
      dui: client.dui,
      phone: client.phone,
      email: isPlaceholderEmail(client.email) ? "" : client.email,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
      await create.mutateAsync(form);
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
    <AdminLayout access="catalog">
      <TechnicalLabel>CLIENTS_01</TechnicalLabel>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em]">
        Clientes
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-charcoal/65">
        Registra, actualiza o da de baja a los clientes. El DUI y el correo no pueden repetirse.
      </p>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:items-start">
        <form
          onSubmit={submit}
          noValidate
          className="border border-charcoal bg-sand/30 p-5"
        >
          <TechnicalLabel>{editing ? "EDITAR CLIENTE" : "NUEVO CLIENTE"}</TechnicalLabel>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
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
              className="sm:col-span-2 xl:col-span-1"
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
            {editing ? (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>

        <section className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <TechnicalLabel>CLIENTES REGISTRADOS</TechnicalLabel>
            <div className="w-full sm:w-72">
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

          {clients.isPending ? <div className="mt-4"><LoadingBlock /></div> : null}
          {clients.isError ? (
            <div className="mt-4">
              <ErrorState description="No se pudo cargar el listado de clientes." />
            </div>
          ) : null}
          {clients.isSuccess && clients.data.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="Sin clientes"
                description="Los clientes registrados aparecerán en esta lista."
              />
            </div>
          ) : null}
          {clients.isSuccess && clients.data.length > 0 && visibleClients.length === 0 ? (
            <p className="mt-4 text-sm text-charcoal/60">
              Ningún cliente coincide con la búsqueda.
            </p>
          ) : null}

          {visibleClients.length > 0 ? (
            <div className="mt-4 overflow-x-auto border border-charcoal/20">
              <table className="w-full min-w-[40rem] border-collapse text-sm">
                <thead>
                  <tr className="bg-charcoal text-ivory">
                    {["Cliente", "DUI", "Teléfono", "Estado", "Acciones"].map((heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em]"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleClients.map((client) => (
                    <tr
                      key={client.id}
                      className={
                        client.is_active
                          ? "border-t border-charcoal/10"
                          : "border-t border-charcoal/10 bg-charcoal/5"
                      }
                    >
                      <td className="px-3 py-2.5">
                        <span
                          className={
                            client.is_active
                              ? "font-medium"
                              : "font-medium text-charcoal/50 line-through"
                          }
                        >
                          {client.first_name} {client.last_name}
                        </span>
                        <span className="block text-xs text-charcoal/55">
                          {isPlaceholderEmail(client.email)
                            ? "Sin correo registrado"
                            : client.email}
                        </span>
                      </td>
                      <td
                        className={
                          client.is_active
                            ? "px-3 py-2.5 font-mono"
                            : "px-3 py-2.5 font-mono text-charcoal/50 line-through"
                        }
                      >
                        {client.dui}
                      </td>
                      <td
                        className={
                          client.is_active
                            ? "px-3 py-2.5 font-mono"
                            : "px-3 py-2.5 font-mono text-charcoal/50"
                        }
                      >
                        {client.phone}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={
                            client.is_active
                              ? "border border-olive px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-olive"
                              : "border border-charcoal/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-charcoal/55"
                          }
                        >
                          {client.is_active ? "Activo" : "De baja"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => startEditing(client)}
                          >
                            Editar
                          </Button>
                          {client.is_active ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              onClick={() => setToDeactivate(client)}
                            >
                              Dar de baja
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={update.isPending}
                              onClick={() =>
                                update.mutate({ id: client.id, body: { is_active: true } })
                              }
                            >
                              Reactivar
                            </Button>
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
      </div>

      <Modal
        open={toDeactivate !== null}
        title="Dar de baja al cliente"
        onClose={() => setToDeactivate(null)}
      >
        <p className="text-sm leading-6 text-charcoal/75">
          ¿Dar de baja a{" "}
          <strong>
            {toDeactivate?.first_name} {toDeactivate?.last_name}
          </strong>
          ? Sus datos y su historial se conservan, pero no podrá iniciar sesión ni hacer
          nuevas reservaciones. Podrás reactivarlo cuando quieras.
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
    </AdminLayout>
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
  for (const key of Object.keys(current) as (keyof ClientForm)[]) {
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
