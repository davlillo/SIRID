import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ApiError, facilitiesApi } from "@/lib/api";

export const metadata: Metadata = { title: "Reservar" };

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ organization?: string }>;
};

/**
 * Entrada por id de instalacion.
 *
 * El flujo de reserva vive en el detalle para no duplicarlo: tanto el catalogo
 * como el plano terminan en la misma pantalla (spect/07-flujos-de-interfaz.md).
 */
export default async function ReservePage({ params, searchParams }: Params) {
  const { id } = await params;
  const { organization } = await searchParams;
  if (!organization) redirect("/organizaciones");

  try {
    const facility = await facilitiesApi.byIdForOrganization(organization, id);
    redirect(`/instalaciones/${facility.slug}?organization=${encodeURIComponent(organization)}#contenido`);
  } catch (error) {
    if (error instanceof ApiError) notFound();
    throw error;
  }
}
