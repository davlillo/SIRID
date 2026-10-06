import Link from "next/link";

import { ButtonLink } from "@/components/atoms/button";
import { BrandMark } from "@/components/atoms/brand-mark";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { FacilityCard } from "@/components/molecules/facility-card";
import { PublicLayout } from "@/components/templates/public-layout";
import { facilitiesApi } from "@/lib/api";
import { KIND_LABEL } from "@/lib/format";
import type { Facility } from "@/lib/types";

// El catalogo publico cambia poco: se cachea un minuto en el servidor.
export const revalidate = 60;

const METHOD = [
  {
    step: "01",
    title: "Elegir",
    detail: "Explora el catalogo o el plano del complejo y abri la instalacion que necesitas.",
  },
  {
    step: "02",
    title: "Solicitar",
    detail: "Selecciona fecha y bloque libre. El importe se calcula en el servidor.",
  },
  {
    step: "03",
    title: "Confirmar",
    detail: "Un administrador aprueba la solicitud y recibis el aviso por correo.",
  },
];

export default async function HomePage() {
  let featured: Facility[] = [];
  try {
    const page = await facilitiesApi.list({ only_bookable: true, limit: 3 }, 60);
    featured = page.items;
  } catch {
    // La landing debe renderizar aunque la API este caida.
    featured = [];
  }

  return (
    <PublicLayout>
      <Hero />

      <section className="dvl-rule py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <TechnicalLabel>CATALOG_01</TechnicalLabel>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em]">
              Espacios para moverse.
            </h2>
          </div>
          <ButtonLink href="/instalaciones">Ver catalogo completo</ButtonLink>
        </div>

        {featured.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-3">
            {featured.map((facility, index) => (
              <FacilityCard key={facility.id} facility={facility} index={index} />
            ))}
          </div>
        ) : (
          <p className="border border-dashed border-charcoal/30 px-6 py-10 text-center text-sm text-charcoal/60">
            El catalogo se mostrara cuando la API responda. Verifica que el backend este
            levantado en <code className="font-mono">http://localhost:8000</code>.
          </p>
        )}
      </section>

      <section id="como-funciona" className="dvl-rule py-20">
        <TechnicalLabel>METHOD_03</TechnicalLabel>
        <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold tracking-[-0.03em]">
          Elegir. Solicitar. Confirmar.
        </h2>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {METHOD.map((item) => (
            <li key={item.step} className="border-t-2 border-charcoal pt-5">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-terracotta">
                {item.step}
              </span>
              <h3 className="mt-2 font-display text-2xl font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-charcoal/65">{item.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <MapTeaser facilities={featured} />
    </PublicLayout>
  );
}

function Hero() {
  return (
    <section className="grid items-center gap-12 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
      <div>
        <TechnicalLabel>DVL / RESERVE_01</TechnicalLabel>
        <h1 className="dvl-display mt-5 max-w-3xl">Reserva el lugar. Juega sin cruces.</h1>
        <p className="mt-8 max-w-lg text-lg leading-8 text-charcoal/70">
          Instalaciones deportivas reales, horarios claros y una reserva confirmada sin llamadas
          ni papeles.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/instalaciones" size="lg">
            Explorar instalaciones
          </ButtonLink>
          <Link
            href="#como-funciona"
            className="inline-flex min-h-11 items-center border border-charcoal px-7 text-sm font-semibold transition-colors duration-fast hover:bg-sand"
          >
            Como funciona
          </Link>
        </div>
      </div>

      {/* Visual tecnico: planta de un campo, no una foto de stock. */}
      <div className="technical-grid paper-grain relative aspect-square border border-charcoal bg-terracotta p-6 text-ivory md:rotate-2">
        <div className="flex justify-between font-mono text-xs uppercase tracking-[0.16em]">
          <span>FIELD / 01</span>
          <span>ACTIVE</span>
        </div>
        <div className="absolute inset-12 border border-ivory/60">
          <div className="absolute left-1/2 top-0 h-full border-l border-ivory/60" />
          <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ivory/60" />
          <div className="absolute left-0 top-1/2 h-20 w-8 -translate-y-1/2 border border-ivory/60" />
          <div className="absolute right-0 top-1/2 h-20 w-8 -translate-y-1/2 border border-ivory/60" />
        </div>
        <div className="absolute bottom-6 left-6">
          <BrandMark inverse />
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-sand">
            Ideas que se construyen.
          </p>
        </div>
      </div>
    </section>
  );
}

function MapTeaser({ facilities }: { facilities: Facility[] }) {
  return (
    <section className="dvl-rule grid gap-10 py-20 md:grid-cols-[0.85fr_1.15fr] md:items-center">
      <div>
        <TechnicalLabel>MAP_3D / COMPLEX_LAYOUT</TechnicalLabel>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em]">
          Elegi el espacio desde el plano.
        </h2>
        <p className="mt-5 max-w-md leading-7 text-charcoal/70">
          Una vista esquematica del complejo para ubicar el estadio, las canchas, las piscinas y
          los espacios de eventos antes de reservar.
        </p>
        <div className="mt-8">
          <ButtonLink href="/mapa" variant="secondary">
            Abrir el plano
          </ButtonLink>
        </div>
      </div>

      <div className="technical-grid relative aspect-[4/3] overflow-hidden border border-charcoal bg-olive/20 p-6">
        <div className="absolute left-[8%] top-[14%] flex h-[34%] w-[40%] items-end border-2 border-coffee bg-ivory/70 p-2 font-mono text-[10px] uppercase tracking-[0.14em]">
          {facilities[0]?.name ?? "ESTADIO"}
        </div>
        <div className="absolute right-[10%] top-[22%] flex h-[28%] w-[32%] items-end border-2 border-olive bg-ivory/70 p-2 font-mono text-[10px] uppercase tracking-[0.14em]">
          {facilities[1]?.name ?? "CANCHAS"}
        </div>
        <div className="absolute bottom-[12%] left-[26%] flex h-[24%] w-[44%] items-end border-2 border-terracotta bg-ivory/70 p-2 font-mono text-[10px] uppercase tracking-[0.14em]">
          {facilities[2]?.name ?? "EVENTOS"}
        </div>
        <span className="absolute bottom-4 right-4 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal/60">
          {facilities[0] ? KIND_LABEL[facilities[0].facility_kind] : "STATUS"}: BUILDING
        </span>
      </div>
    </section>
  );
}
