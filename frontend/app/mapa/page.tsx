import type { Metadata } from "next";

import { TechnicalLabel } from "@/components/atoms/technical-label";
import { PublicLayout } from "@/components/templates/public-layout";
import { ComplexMapClient } from "@/components/organisms/complex-map-client";
import { facilitiesApi } from "@/lib/api";
import type { Facility } from "@/lib/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Plano del complejo",
  description: "Vista esquematica e interactiva del complejo deportivo SIRID.",
};

export default async function MapPage() {
  let facilities: Facility[] = [];
  try {
    facilities = (await facilitiesApi.list({ limit: 50 }, 60)).items;
  } catch {
    facilities = [];
  }

  return (
    <PublicLayout>
      <section className="py-14">
        <TechnicalLabel>MAP_3D / COMPLEX_LAYOUT</TechnicalLabel>
        <h1 className="dvl-display mt-4">El complejo</h1>
        <p className="mt-5 mb-10 max-w-2xl text-lg leading-8 text-charcoal/70">
          Estadio, canchas, piscinas y espacios para eventos. Selecciona una instalacion para
          abrir su disponibilidad. El plano es una maqueta esquematica: la disponibilidad real
          siempre viene de la API.
        </p>

        <ComplexMapClient facilities={facilities} />
      </section>
    </PublicLayout>
  );
}
