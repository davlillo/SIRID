"use client";

import { AdminLayout } from "@/components/templates/admin-layout";
import { ClientsManager } from "@/features/admin/clients-manager";
import { useAuth } from "@/features/auth/auth-context";

/**
 * Clientes de la organizacion del encargado. El administrador del sistema los
 * gestiona desde `/admin/organizaciones/[id]`.
 */
export default function ManagerClientsPage() {
  const { user } = useAuth();

  return (
    <AdminLayout access="reservations">
      {user?.organization_id ? (
        <ClientsManager organizationId={user.organization_id} />
      ) : null}
    </AdminLayout>
  );
}
