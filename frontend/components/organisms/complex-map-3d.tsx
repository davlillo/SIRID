"use client";

/**
 * Plano esquematico del complejo.
 *
 * La escena no tiene nombres codificados: las nueve instalaciones y sus
 * coordenadas llegan de `GET /v1/facilities`. La escena tampoco decide si una
 * hora esta libre; para eso esta la disponibilidad (spect/08-plano-3d.md).
 */

import { OrbitControls, Text } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { TechnicalLabel } from "@/components/atoms/technical-label";
import { KIND_LABEL, SPORT_LABEL } from "@/lib/format";
import type { Facility, FacilityKind } from "@/lib/types";

const PALETTE = {
  ivory: "#F7F3EA",
  sand: "#E8D8BE",
  terracotta: "#C65F45",
  olive: "#65705A",
  coffee: "#49352C",
  charcoal: "#191817",
} as const;

/** Color base por tipo de espacio. El seleccionado siempre pasa a terracota. */
const KIND_COLOR: Record<FacilityKind, string> = {
  STADIUM: PALETTE.coffee,
  FIELD: PALETTE.olive,
  COURT: PALETTE.terracotta,
  POOL: "#4E6E7A",
  EVENT_SPACE: PALETTE.charcoal,
  MULTIUSE: PALETTE.sand,
};

const KIND_HEIGHT: Record<FacilityKind, number> = {
  STADIUM: 2.6,
  FIELD: 0.12,
  COURT: 0.5,
  POOL: 0.3,
  EVENT_SPACE: 1.8,
  MULTIUSE: 0.35,
};

type MapNode = {
  facility: Facility;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
};

function toNodes(facilities: Facility[]): MapNode[] {
  return facilities
    .filter((facility) => facility.map_x !== null && facility.map_z !== null)
    .map((facility) => ({
      facility,
      x: Number(facility.map_x),
      z: Number(facility.map_z),
      width: Number(facility.map_width ?? 4),
      depth: Number(facility.map_depth ?? 3),
      height: KIND_HEIGHT[facility.facility_kind],
      color: facility.is_bookable ? KIND_COLOR[facility.facility_kind] : PALETTE.sand,
    }));
}

function FacilityNode({
  node,
  isSelected,
  onSelect,
}: {
  node: MapNode;
  isSelected: boolean;
  onSelect: (node: MapNode | null) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = isSelected || hovered ? PALETTE.terracotta : node.color;

  return (
    <group position={[node.x, 0, node.z]}>
      <mesh
        position={[0, node.height / 2, 0]}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(node);
        }}
      >
        <boxGeometry args={[node.width, node.height, node.depth]} />
        <meshStandardMaterial
          color={color}
          roughness={0.85}
          transparent={node.facility.facility_kind === "POOL"}
          opacity={node.facility.facility_kind === "POOL" ? 0.78 : 1}
        />
      </mesh>

      {/* Huella del espacio sobre el terreno: ancla el volumen a la reticula. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[node.width + 0.5, node.depth + 0.5]} />
        <meshBasicMaterial color={isSelected ? PALETTE.terracotta : PALETTE.coffee} opacity={0.18} transparent />
      </mesh>

      <Text
        position={[0, node.height + 0.55, 0]}
        rotation={[-Math.PI / 2.6, 0, 0]}
        fontSize={0.52}
        color={PALETTE.charcoal}
        outlineWidth={0.045}
        outlineColor={PALETTE.ivory}
        anchorX="center"
        anchorY="middle"
      >
        {node.facility.name.toUpperCase()}
      </Text>
    </group>
  );
}

function Scene({
  nodes,
  selected,
  onSelect,
}: {
  nodes: MapNode[];
  selected: MapNode | null;
  onSelect: (node: MapNode | null) => void;
}) {
  return (
    <>
      <ambientLight intensity={1.6} />
      <directionalLight position={[14, 20, 10]} intensity={1.9} />

      {/* Terreno con reticula tecnica. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={() => onSelect(null)}>
        <planeGeometry args={[56, 40]} />
        <meshStandardMaterial color={PALETTE.sand} roughness={1} />
      </mesh>
      <gridHelper args={[56, 28, PALETTE.coffee, PALETTE.coffee]} position={[0, 0.01, 0]} />

      {nodes.map((node) => (
        <FacilityNode
          key={node.facility.id}
          node={node}
          isSelected={selected?.facility.id === node.facility.id}
          onSelect={onSelect}
        />
      ))}

      <OrbitControls
        enablePan={false}
        minDistance={16}
        maxDistance={52}
        // Angulo acotado para no perder la orientacion del plano.
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2.35}
      />
    </>
  );
}

export function ComplexMap3D({ facilities }: { facilities: Facility[] }) {
  const router = useRouter();
  const nodes = useMemo(() => toNodes(facilities), [facilities]);
  const [selected, setSelected] = useState<MapNode | null>(null);

  // Sin WebGL no hay escena: se degrada a la lista, no a una pantalla rota.
  const webglSupported = useMemo(() => {
    if (typeof document === "undefined") return false;
    try {
      const canvas = document.createElement("canvas");
      return Boolean(
        canvas.getContext("webgl2") ?? canvas.getContext("webgl"),
      );
    } catch {
      return false;
    }
  }, []);

  if (!webglSupported || nodes.length === 0) {
    return <MapFallback facilities={facilities} />;
  }

  return (
    <div>
      <div className="relative h-[26rem] w-full border border-charcoal bg-sand md:h-[34rem]">
        <Canvas
          camera={{ position: [22, 20, 26], fov: 38 }}
          onCreated={({ gl }) => gl.setClearColor(PALETTE.ivory)}
          // Sombras desactivadas y una sola luz direccional: el plano es una
          // maqueta, no un render (spect/08 limita el coste de la escena).
          shadows={false}
        >
          <Scene nodes={nodes} selected={selected} onSelect={setSelected} />
        </Canvas>

        {selected ? (
          <div className="absolute bottom-4 left-4 max-w-xs border border-charcoal bg-ivory p-4 shadow-sm">
            <TechnicalLabel>
              {KIND_LABEL[selected.facility.facility_kind]} ·{" "}
              {SPORT_LABEL[selected.facility.sport_type]}
            </TechnicalLabel>
            <p className="mt-1 font-display text-xl font-semibold">{selected.facility.name}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-charcoal/60">
              {selected.facility.location_label} · CAP. {selected.facility.capacity}
            </p>
            {selected.facility.is_bookable ? (
              <button
                onClick={() => router.push(`/instalaciones/${selected.facility.slug}`)}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center bg-terracotta px-4 text-sm font-semibold text-ivory transition-colors hover:bg-coffee"
              >
                Ver disponibilidad
              </button>
            ) : (
              <p className="mt-3 border border-dashed border-charcoal/30 px-3 py-2 text-xs text-charcoal/65">
                Espacio informativo, no reservable.
              </p>
            )}
          </div>
        ) : null}

        <MapLegend />
      </div>

      {/* Alternativa accesible: teclado, mobile y ausencia de WebGL. */}
      <MapFallback facilities={facilities} compact />
    </div>
  );
}

function MapLegend() {
  const items: [FacilityKind, string][] = [
    ["STADIUM", "Estadio"],
    ["FIELD", "Campos"],
    ["COURT", "Canchas"],
    ["POOL", "Piscinas"],
    ["EVENT_SPACE", "Eventos"],
  ];

  return (
    <dl className="absolute right-4 top-4 flex flex-col gap-1.5 border border-charcoal/25 bg-ivory/90 p-3">
      {items.map(([kind, label]) => (
        <div key={kind} className="flex items-center gap-2">
          <dt
            aria-hidden="true"
            className="h-3 w-3 border border-charcoal/40"
            style={{ background: KIND_COLOR[kind] }}
          />
          <dd className="font-mono text-[10px] uppercase tracking-[0.14em]">{label}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Lista equivalente al plano. Funciona sin WebGL y es navegable por teclado. */
export function MapFallback({
  facilities,
  compact = false,
}: {
  facilities: Facility[];
  compact?: boolean;
}) {
  return (
    <section className={compact ? "mt-6" : ""} aria-label="Listado de espacios del complejo">
      <TechnicalLabel>
        {compact ? "LISTA EQUIVALENTE DEL PLANO" : "PLANO NO DISPONIBLE · LISTA DE ESPACIOS"}
      </TechnicalLabel>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {facilities.map((facility) => (
          <li key={facility.id}>
            <a
              href={facility.is_bookable ? `/instalaciones/${facility.slug}` : undefined}
              aria-disabled={!facility.is_bookable}
              className={
                facility.is_bookable
                  ? "flex min-h-16 flex-col justify-center border border-charcoal/20 bg-ivory px-4 py-3 transition-colors duration-fast hover:border-terracotta"
                  : "flex min-h-16 flex-col justify-center border border-dashed border-charcoal/25 px-4 py-3 text-charcoal/55"
              }
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-olive">
                {KIND_LABEL[facility.facility_kind]} · {facility.location_label}
              </span>
              <span className="mt-0.5 font-display text-lg font-semibold">{facility.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
