"use client";

import { useState } from "react";

import { Button } from "@/components/atoms/button";
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
    if (editingId) {
      await updateOrganization.mutateAsync({ id: editingId, body });
      setEditingId(null);
    } else {
      await createOrganization.mutateAsync(body);
    }
    setName("");
    setSlug("");
    setEmailDomain("");
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
        className="mt-8 grid gap-4 border border-charcoal bg-sand/30 p-5 md:grid-cols-3"
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
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={80}
            value={slug}
            onChange={(event) => setSlug(event.target.value.toLowerCase())}
          />
        </Field>
        <Field label="Dominio Google" htmlFor="organization-domain" hint="Ejemplo: ejemplo.org">
          <Input
            id="organization-domain"
            required
            type="text"
            maxLength={255}
            value={emailDomain}
            onChange={(event) => setEmailDomain(event.target.value.toLowerCase())}
          />
        </Field>
        <div className="md:col-span-3">
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
              className="ml-2"
              type="button"
              variant="ghost"
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
              className="flex flex-wrap items-center justify-between gap-4 border border-charcoal/20 bg-ivory px-4 py-3"
            >
              <div>
                <h2 className="font-display text-xl font-semibold">{organization.name}</h2>
                <p className="mt-1 font-mono text-xs text-charcoal/60">
                  /{organization.slug} · {organization.email_domain ?? "Dominio sin asignar"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
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
