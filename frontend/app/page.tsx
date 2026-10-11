import Link from "next/link";

import { ButtonLink } from "@/components/atoms/button";
import { BrandMark } from "@/components/atoms/brand-mark";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { PublicLayout } from "@/components/templates/public-layout";

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
    detail: "El encargado de reservaciones aprueba la solicitud y recibis el aviso por correo.",
  },
];

export default function HomePage() {
  return (
    <PublicLayout>
      <Hero />

      <section className="dvl-rule py-20">
        <TechnicalLabel>ORGANIZATIONS / PUBLIC CATALOG</TechnicalLabel>
        <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold tracking-[-0.03em]">
          Cada organización, su propio espacio.
        </h2>
        <p className="mt-5 max-w-xl leading-7 text-charcoal/70">
          Elige una organización para consultar sus instalaciones y disponibilidad. Sus reservas
          permanecen separadas de las demás.
        </p>
        <div className="mt-7">
          <ButtonLink href="/organizaciones">Explorar organizaciones</ButtonLink>
        </div>
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

      <MapTeaser />
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
          <ButtonLink href="/organizaciones" size="lg">
            Elegir organización
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

function MapTeaser() {
  return (
    <section className="dvl-rule grid gap-10 py-20 md:grid-cols-[0.85fr_1.15fr] md:items-center">
      <div>
        <TechnicalLabel>MAP_3D / COMPLEX_LAYOUT</TechnicalLabel>
        <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.03em]">
          Elegi el espacio desde el plano.
        </h2>
        <p className="mt-5 max-w-md leading-7 text-charcoal/70">
          Después de elegir una organización, abre su plano para ubicar los espacios antes de
          reservar.
        </p>
        <div className="mt-8">
          <ButtonLink href="/organizaciones" variant="secondary">
            Abrir el plano
          </ButtonLink>
        </div>
      </div>

      <div className="technical-grid relative aspect-[4/3] overflow-hidden border border-charcoal bg-olive/20 p-6">
        <div className="absolute left-[8%] top-[14%] flex h-[34%] w-[40%] items-end border-2 border-coffee bg-ivory/70 p-2 font-mono text-[10px] uppercase tracking-[0.14em]">
          ESPACIO 01
        </div>
        <div className="absolute right-[10%] top-[22%] flex h-[28%] w-[32%] items-end border-2 border-olive bg-ivory/70 p-2 font-mono text-[10px] uppercase tracking-[0.14em]">
          ESPACIO 02
        </div>
        <div className="absolute bottom-[12%] left-[26%] flex h-[24%] w-[44%] items-end border-2 border-terracotta bg-ivory/70 p-2 font-mono text-[10px] uppercase tracking-[0.14em]">
          ESPACIO 03
        </div>
        <span className="absolute bottom-4 right-4 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal/60">
          CATALOG: PUBLIC
        </span>
      </div>
    </section>
  );
}
