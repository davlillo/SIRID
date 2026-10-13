"use client";

import Link from "next/link";

import { TechnicalLabel } from "@/components/atoms/technical-label";
import { AdminLayout } from "@/components/templates/admin-layout";

export default function AdminDashboardPage() {
  return (
    <AdminLayout>
      <TechnicalLabel>SYSTEM_ADMIN / CONTROL</TechnicalLabel>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em]">Administración del sistema</h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-charcoal/65">
        Crea organizaciones y administra las cuentas del sistema. Los clientes y las
        instalaciones de cada organización se gestionan entrando a ella; las reservas las
        operan los encargados.
      </p>

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
              className="block h-full border border-charcoal/20 bg-sand/30 p-5 transition-colors hover:border-charcoal"
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
