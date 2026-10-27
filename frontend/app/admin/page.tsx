"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { LoadingBlock } from "@/components/atoms/states";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { AdminLayout } from "@/components/templates/admin-layout";
import { useAuth } from "@/features/auth/auth-context";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isReservationManager } = useAuth();

  useEffect(() => {
    if (isReservationManager) router.replace("/encargado");
  }, [isReservationManager, router]);

  if (isReservationManager) return <LoadingBlock label="ABRIENDO PANEL" />;

  return (
    <AdminLayout>
      <div className="sirid-page-banner px-7 py-10 sm:px-10">
        <TechnicalLabel>SYSTEM_ADMIN / CONTROL</TechnicalLabel>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em]">Administración del sistema</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-charcoal/65">
          Crea organizaciones y administra las cuentas del sistema. Los clientes y las
          instalaciones de cada organización se gestionan entrando a ella; las reservas las
          operan los encargados.
        </p>
      </div>

      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {[
          [
            "Organizaciones",
            "Crea organizaciones y, al entrar, administra sus clientes e instalaciones.",
            "/admin/organizaciones",
          ],
          ["Usuarios", "Asigna organización, rol y estado de cada cuenta.", "/admin/usuarios"],
        ].map(([title, description, href]) => (
          <li key={href}>
            <Link
              href={href}
              className="sirid-organization-card sirid-panel block h-full min-h-44 bg-sand/20 p-7 transition-all duration-base hover:-translate-y-1 hover:border-terracotta/60 hover:shadow-lg"
            >
              <TechnicalLabel>SYSTEM / {title.toUpperCase()}</TechnicalLabel>
              <h2 className="mt-3 font-display text-2xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-charcoal/65">{description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </AdminLayout>
  );
}
