"use client";

import { AdminLayout } from "@/components/templates/admin-layout";
import { FacilitiesManager } from "@/features/admin/facilities-manager";
import { useAuth } from "@/features/auth/auth-context";

/**
 * Catalogo de instalaciones de la organizacion del encargado. El administrador
 * del sistema lo gestiona desde `/admin/organizaciones/[id]`.
 */
export default function AdminFacilitiesPage() {
  const { user } = useAuth();

  return (
    <AdminLayout access="catalog">
      {user?.organization_id ? (
        <FacilitiesManager organizationId={user.organization_id} />
      ) : null}
    </AdminLayout>
  );
}
