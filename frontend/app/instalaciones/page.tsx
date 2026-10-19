import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PublicLayout } from "@/components/templates/public-layout";
import { FacilityCatalog } from "@/components/organisms/facility-catalog";
import { TechnicalLabel } from "@/components/atoms/technical-label";

export const metadata: Metadata = {
  title: "Instalaciones",
  description: "Catalogo de canchas, piscinas y espacios de eventos del complejo SIRID.",
};

type SearchParams = { searchParams: Promise<{ organization?: string }> };

export default async function FacilitiesPage({ searchParams }: SearchParams) {
  const { organization } = await searchParams;
  if (!organization) redirect("/organizaciones");
  return (
    <PublicLayout organizationSlug={organization}>
      <section className="sirid-page-banner my-6 px-7 py-14 sm:px-12 md:py-20">
        <TechnicalLabel>ESPACIOS PARA VOS</TechnicalLabel>
        <h1 className="dvl-display mt-4">Instalaciones</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-charcoal/70">
          Filtra por zona, deporte o capacidad. Cada ficha muestra horario, tarifa y
          disponibilidad real.
        </p>
      </section>

      <FacilityCatalog organizationSlug={organization} />
    </PublicLayout>
  );
}
