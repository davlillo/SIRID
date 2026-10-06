import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ApiError, facilitiesApi } from "@/lib/api";

export const metadata: Metadata = { title: "Reservar" };

type Params = { params: Promise<{ id: string }> };

/**
 * Entrada por id de instalacion.
 *
 * El flujo de reserva vive en el detalle para no duplicarlo: tanto el catalogo
 * como el plano terminan en la misma pantalla (spect/07-flujos-de-interfaz.md).
 */
export default async function ReservePage({ params }: Params) {
  const { id } = await params;

  try {
    const facility = await facilitiesApi.byId(id);
    redirect(`/instalaciones/${facility.slug}#contenido`);
  } catch (error) {
    if (error instanceof ApiError) notFound();
    throw error;
  }
}
