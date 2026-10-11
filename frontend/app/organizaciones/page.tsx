import Link from "next/link";
import type { Metadata } from "next";

import { PublicLayout } from "@/components/templates/public-layout";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { organizationsApi } from "@/lib/api";
import type { PublicOrganization } from "@/lib/types";

export const metadata: Metadata = {
  title: "Organizaciones",
  description: "Selecciona una organización para ver sus instalaciones deportivas.",
};

export const revalidate = 60;

export default async function OrganizationsPage() {
  let organizations: PublicOrganization[] = [];
  try {
    organizations = await organizationsApi.listPublic();
  } catch {
    organizations = [];
  }

  return (
    <PublicLayout>
      <section className="py-14">
        <TechnicalLabel>ORGANIZATIONS / DIRECTORY</TechnicalLabel>
        <h1 className="dvl-display mt-4">Elige tu organización.</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-charcoal/70">
          Cada organización administra sus propias instalaciones y reservas. El catálogo público
          muestra únicamente los espacios de la organización que selecciones.
        </p>
      </section>

      {organizations.length ? (
        <ul className="grid gap-5 pb-16 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((organization) => (
            <li key={organization.id}>
              <Link
                href={`/instalaciones?organization=${encodeURIComponent(organization.slug)}`}
                className="group block border border-charcoal/20 bg-ivory p-6 transition-colors hover:border-charcoal"
              >
                <TechnicalLabel>{organization.slug.toUpperCase()}</TechnicalLabel>
                <h2 className="mt-3 font-display text-2xl font-semibold">{organization.name}</h2>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-terracotta">
                  Ver instalaciones <span aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border border-dashed border-charcoal/30 px-6 py-10 text-center text-sm text-charcoal/60">
          No hay organizaciones activas disponibles por el momento.
        </p>
      )}
    </PublicLayout>
  );
}
