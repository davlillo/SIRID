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
        Gestiona organizaciones, sus usuarios y sus instalaciones. Las reservas y sus datos se
        administran desde la organización por sus encargados.
      </p>

      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["Organizaciones", "Crea organizaciones y administra sus dominios.", "/admin/organizaciones"],
          ["Usuarios", "Asigna organización, rol y estado de cada cuenta.", "/admin/usuarios"],
          ["Instalaciones", "Administra instalaciones, horarios y tarifas.", "/admin/instalaciones"],
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
