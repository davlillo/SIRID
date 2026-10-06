"use client";

/**
 * Frontera cliente del plano.
 *
 * `dynamic(..., { ssr: false })` solo es valido dentro de un client component,
 * asi que la carga diferida del canvas WebGL vive aqui y no en la ruta.
 */

import dynamic from "next/dynamic";

import { LoadingBlock } from "@/components/atoms/states";
import type { Facility } from "@/lib/types";
import { MapFallback } from "./complex-map-3d";

const ComplexMap3D = dynamic(
  () => import("./complex-map-3d").then((module) => module.ComplexMap3D),
  { ssr: false, loading: () => <LoadingBlock label="CARGANDO PLANO 3D" /> },
);

export function ComplexMapClient({ facilities }: { facilities: Facility[] }) {
  if (facilities.length === 0) {
    return (
      <p className="border border-dashed border-charcoal/30 px-6 py-10 text-center text-sm text-charcoal/60">
        No se pudieron cargar los espacios del complejo. Verifica que el backend responda.
      </p>
    );
  }

  // Con `prefers-reduced-motion` se entrega la lista, sin canvas ni orbitas.
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return <MapFallback facilities={facilities} />;
  }

  return <ComplexMap3D facilities={facilities} />;
}
