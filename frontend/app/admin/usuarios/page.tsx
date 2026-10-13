"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/atoms/button";
import { Field, Input, Select } from "@/components/atoms/field";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/atoms/states";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { AdminLayout } from "@/components/templates/admin-layout";
import {
  useAdminOrganizations,
  useAdminUsers,
  useCreateSystemUser,
  useUpdateSystemUser,
} from "@/features/admin/management-hooks";
import type { UserRole } from "@/lib/types";

export default function AdminUsersPage() {
  const organizations = useAdminOrganizations();
  const users = useAdminUsers();
  const createUser = useCreateSystemUser();
  const updateUser = useUpdateSystemUser();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [role, setRole] = useState<"CLIENT" | "ENCARGADO">("ENCARGADO");

  const organizationNames = useMemo(
    () => new Map((organizations.data ?? []).map((item) => [item.id, item.name])),
    [organizations.data],
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createUser.mutateAsync({
      email: email.trim().toLowerCase(),
      name: name.trim() || undefined,
      organization_id: organizationId,
      role,
      password: password || undefined,
    });
    setEmail("");
    setName("");
    setPassword("");
  }

  return (
    <AdminLayout>
      <TechnicalLabel>USERS_01</TechnicalLabel>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em]">Usuarios</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-charcoal/65">
        Provisiona cuentas Google y asigna cada usuario a una organización. Los encargados solo
        gestionan reservas de su organización; los clientes solo pueden operar sus propias reservas.
      </p>

      <form
        onSubmit={submit}
        className="mt-8 grid gap-4 border border-charcoal bg-sand/30 p-5 md:grid-cols-2"
      >
        <Field label="Correo de Google" htmlFor="managed-user-email">
          <Input
            id="managed-user-email"
            type="email"
            required
            maxLength={320}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Nombre (opcional)" htmlFor="managed-user-name">
          <Input
            id="managed-user-name"
            maxLength={160}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field
          label="Contraseña (opcional)"
          htmlFor="managed-user-password"
          hint="Mínimo 8 caracteres. Si se omite, la cuenta solo entra con Google."
          className="md:col-span-2"
        >
          <Input
            id="managed-user-password"
            type="password"
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <Field label="Organización" htmlFor="managed-user-org">
          <Select
            id="managed-user-org"
            required
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
          >
            <option value="">Selecciona una organización</option>
            {organizations.data
              ?.filter((item) => item.is_active)
              .map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Rol" htmlFor="managed-user-role">
          <Select
            id="managed-user-role"
            value={role}
            onChange={(event) => setRole(event.target.value as "CLIENT" | "ENCARGADO")}
          >
            <option value="ENCARGADO">Encargado de reservaciones</option>
            <option value="CLIENT">Cliente</option>
          </Select>
        </Field>
        <div className="md:col-span-2">
          <Button type="submit" disabled={createUser.isPending || !organizationId}>
            {createUser.isPending ? "Guardando…" : "Crear usuario"}
          </Button>
        </div>
      </form>

      <section className="mt-10">
        <TechnicalLabel>CUENTAS Y PERMISOS</TechnicalLabel>
        {users.isPending ? <div className="mt-4"><LoadingBlock /></div> : null}
        {users.isError ? (
          <div className="mt-4">
            <ErrorState description="No se pudo cargar el listado de usuarios." />
          </div>
        ) : null}
        {users.isSuccess && users.data.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Sin usuarios" description="Las cuentas aparecerán aquí." />
          </div>
        ) : null}

        {users.data && users.data.length > 0 ? (
          <div className="mt-4 overflow-x-auto border border-charcoal/20">
            <table className="w-full min-w-[42rem] border-collapse text-sm">
              <thead>
                <tr className="bg-charcoal text-ivory">
                  {["Usuario", "Organización", "Rol", "Estado", "Acción"].map((heading) => (
                    <th key={heading} scope="col" className="px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.14em]">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.data.map((user) => (
                  <tr key={user.id} className="border-t border-charcoal/10">
                    <td className="px-3 py-2.5">
                      <span className="font-medium">{user.name}</span>
                      <span className="block text-xs text-charcoal/55">{user.email}</span>
                    </td>
                    <td className="px-3 py-2.5">{organizationNames.get(user.organization_id) ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      {user.role === "ADMIN" ? (
                        "Administrador del sistema"
                      ) : (
                        <Select
                          aria-label={`Rol de ${user.email}`}
                          value={user.role}
                          disabled={updateUser.isPending || !user.is_active}
                          onChange={(event) =>
                            updateUser.mutate({
                              id: user.id,
                              body: { role: event.target.value as UserRole },
                            })
                          }
                        >
                          <option value="ENCARGADO">Encargado</option>
                          <option value="CLIENT">Cliente</option>
                        </Select>
                      )}
                    </td>
                    <td className="px-3 py-2.5">{user.is_active ? "Activo" : "Desactivado"}</td>
                    <td className="px-3 py-2.5">
                      {user.role !== "ADMIN" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant={user.is_active ? "danger" : "secondary"}
                          disabled={updateUser.isPending}
                          onClick={() =>
                            updateUser.mutate({
                              id: user.id,
                              body: { is_active: !user.is_active },
                            })
                          }
                        >
                          {user.is_active ? "Desactivar" : "Reactivar"}
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </AdminLayout>
  );
}
