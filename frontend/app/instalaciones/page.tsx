import type { Metadata } from "next";

import { PublicLayout } from "@/components/templates/public-layout";
import { FacilityCatalog } from "@/components/organisms/facility-catalog";
import { TechnicalLabel } from "@/components/atoms/technical-label";

export const metadata: Metadata = {
  title: "Instalaciones",
  description: "Catalogo de canchas, piscinas y espacios de eventos del complejo SIRID.",
};

export default function FacilitiesPage() {
  return (
    <PublicLayout>
      <section className="py-14">
        <TechnicalLabel>CATALOG_01</TechnicalLabel>
        <h1 className="dvl-display mt-4">Instalaciones</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-charcoal/70">
          Filtra por zona, deporte o capacidad. Cada ficha muestra horario, tarifa y
          disponibilidad real.
        </p>
      </section>

      <FacilityCatalog />
    </PublicLayout>
  );
}
