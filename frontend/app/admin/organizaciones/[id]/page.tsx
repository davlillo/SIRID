"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { TechnicalLabel } from "@/components/atoms/technical-label";
import { AdminLayout } from "@/components/templates/admin-layout";
import { ClientsManager } from "@/features/admin/clients-manager";
import { FacilitiesManager } from "@/features/admin/facilities-manager";
import { useAdminOrganizations } from "@/features/admin/management-hooks";
import { cn } from "@/lib/cn";

type Tab = "clientes" | "instalaciones";

const TABS: [Tab, string][] = [
  ["clientes", "Clientes"],
  ["instalaciones", "Instalaciones"],
];

export default function AdminOrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const organizationId = params.id;
  const organizations = useAdminOrganizations();
  const organization = organizations.data?.find((item) => item.id === organizationId);
  const [tab, setTab] = useState<Tab>("clientes");

  return (
    <AdminLayout>
      <Link
        href="/admin/organizaciones"
        className="text-sm text-charcoal/60 transition-colors hover:text-charcoal"
      >
        ← Organizaciones
      </Link>
      <div className="mt-6"><TechnicalLabel>DETALLE DE ORGANIZACIÓN</TechnicalLabel></div>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em]">
        {organization?.name ?? "Organización"}
      </h1>
      {organization ? (
        <p className="mt-2 font-mono text-xs text-charcoal/60">
          /{organization.slug} · {organization.email_domain ?? "Dominio sin asignar"}
        </p>
      ) : null}

      <div className="mt-8 flex gap-2 border-b border-charcoal/15" role="tablist">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "-mb-px min-h-11 border-b-2 px-4 py-2.5 text-sm transition-colors duration-fast",
              tab === value
                ? "border-charcoal font-semibold text-charcoal"
                : "border-transparent text-charcoal/60 hover:text-charcoal",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "clientes" ? (
          <ClientsManager organizationId={organizationId} />
        ) : (
          <FacilitiesManager organizationId={organizationId} />
        )}
      </div>
    </AdminLayout>
  );
}
