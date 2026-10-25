"use client";

import { useState } from "react";

import { Button, ButtonLink } from "@/components/atoms/button";
import { Field, Input } from "@/components/atoms/field";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/atoms/states";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { AdminLayout } from "@/components/templates/admin-layout";
import {
  useAdminOrganizations,
  useCreateOrganization,
  useUpdateOrganization,
} from "@/features/admin/management-hooks";

export default function AdminOrganizationsPage() {
  const organizations = useAdminOrganizations();
  const createOrganization = useCreateOrganization();
  const updateOrganization = useUpdateOrganization();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      email_domain: emailDomain.trim().toLowerCase().replace(/^@/, ""),
    };
    try {
      if (editingId) {
        await updateOrganization.mutateAsync({
          id: editingId,
          body: { ...body, email_domain: body.email_domain || null },
        });
        setEditingId(null);
      } else {
        await createOrganization.mutateAsync(body);
      }
      setName("");
      setSlug("");
      setEmailDomain("");
    } catch {
      // The mutation displays the error; retain the form values for retry.
    }
  }

  return (
    <AdminLayout>
      <TechnicalLabel>ORGANIZATIONS_01</TechnicalLabel>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em]">
        Organizaciones
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-charcoal/65">
        Cada organización tiene su propio catálogo, usuarios y reservas. El administrador del
        sistema puede gestionar instalaciones de todas ellas; las reservas permanecen separadas.
      </p>

      <form
        onSubmit={submit}
        className="sirid-panel mt-8 grid items-start gap-5 bg-sand/25 p-5 sm:p-6 lg:grid-cols-3"
      >
        <Field label="Nombre" htmlFor="organization-name">
          <Input
            id="organization-name"
            required
            minLength={2}
            maxLength={160}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Slug público" htmlFor="organization-slug" hint="Ejemplo: organizacion-a">
          <Input
            id="organization-slug"
            required
            minLength={2}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={80}
            value={slug}
            onChange={(event) => setSlug(event.target.value.toLowerCase())}
          />
        </Field>
        <Field
          label={editingId ? "Dominio de correo (opcional)" : "Dominio de correo"}
          htmlFor="organization-domain"
          hint={editingId
            ? "Déjalo vacío para quitar el acceso por dominio de Google."
            : "Ejemplo: ejemplo.org. La API lo requiere al crear la organización."}
        >
          <Input
            id="organization-domain"
            required={!editingId}
            type="text"
            minLength={3}
            maxLength={255}
            value={emailDomain}
            onChange={(event) => setEmailDomain(event.target.value.toLowerCase())}
          />
        </Field>
        <div className="flex flex-wrap gap-3 lg:col-span-3">
          <Button
            type="submit"
            disabled={createOrganization.isPending || updateOrganization.isPending}
          >
            {createOrganization.isPending || updateOrganization.isPending
              ? "Guardando…"
              : editingId
                ? "Guardar cambios"
                : "Crear organización"}
          </Button>
          {editingId ? (
            <Button
              type="button"
              variant="ghost"
              disabled={updateOrganization.isPending}
              onClick={() => {
                setEditingId(null);
                setName("");
                setSlug("");
                setEmailDomain("");
              }}
            >
              Cancelar edición
            </Button>
          ) : null}
        </div>
      </form>

      <section className="mt-10">
        <TechnicalLabel>ORGANIZACIONES REGISTRADAS</TechnicalLabel>
        {organizations.isPending ? <div className="mt-4"><LoadingBlock /></div> : null}
        {organizations.isError ? (
          <div className="mt-4">
            <ErrorState description="No se pudieron cargar las organizaciones." />
          </div>
        ) : null}
        {organizations.isSuccess && organizations.data.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Sin organizaciones" description="Crea la primera organización." />
          </div>
        ) : null}
        <ul className="mt-4 space-y-3">
          {organizations.data?.map((organization) => (
            <li
              key={organization.id}
              className="sirid-panel flex flex-wrap items-center justify-between gap-4 px-5 py-5"
            >
              <div className="min-w-0">
                <h2 className="break-words font-display text-xl font-semibold">{organization.name}</h2>
                <p className="mt-1 break-all font-mono text-xs text-charcoal/60">
                  /{organization.slug} · {organization.email_domain ?? "Dominio sin asignar"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <ButtonLink
                  href={`/admin/organizaciones/${organization.id}`}
                  size="sm"
                  variant="primary"
                >
                  Gestionar
                </ButtonLink>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={createOrganization.isPending || updateOrganization.isPending}
                  onClick={() => {
                    setEditingId(organization.id);
                    setName(organization.name);
                    setSlug(organization.slug);
                    setEmailDomain(organization.email_domain ?? "");
                  }}
                >
                  Editar
                </Button>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-olive">
                  {organization.is_active ? "Activa" : "Inactiva"}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant={organization.is_active ? "danger" : "secondary"}
                  disabled={updateOrganization.isPending}
                  onClick={() =>
                    updateOrganization.mutate({
                      id: organization.id,
                      body: { is_active: !organization.is_active },
                    })
                  }
                >
                  {organization.is_active ? "Desactivar" : "Reactivar"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </AdminLayout>
  );
}
