import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Check, Search } from "lucide-react";

import { ButtonLink } from "@/components/atoms/button";
import { HeroIntro } from "@/components/organisms/hero-intro";
import { HomeScrollMotion } from "@/components/organisms/home-scroll-motion";
import { SportsCarousel } from "@/components/organisms/sports-carousel";
import { SportsGallery } from "@/components/organisms/sports-gallery";
import { PublicLayout } from "@/components/templates/public-layout";

const METHOD = [
  {
    step: "01",
    icon: Search,
    title: "Encontrá tu lugar",
    detail: "Explorá los espacios disponibles y elegí el que va con tu plan.",
  },
  {
    step: "02",
    icon: CalendarDays,
    title: "Elegí cuándo",
    detail: "Revisá los horarios libres y solicitá tu reserva en minutos.",
  },
  {
    step: "03",
    icon: Check,
    title: "Salí a jugar",
    detail: "Recibí la confirmación y preparate para disfrutar el encuentro.",
  },
];

export default function HomePage() {
  return (
    <PublicLayout home>
      <HomeScrollMotion />
      <Hero />

      <section className="sirid-home-strip" aria-label="La experiencia SIRID">
        <span>UN ESPACIO PARA CADA PARTIDO</span>
        <span aria-hidden="true">✳</span>
        <span>UN HORARIO PARA CADA PLAN</span>
        <span aria-hidden="true">✳</span>
        <span>EL JUEGO ES TUYO</span>
      </section>

      <section className="sirid-gallery-section py-10 md:py-16" aria-labelledby="gallery-title">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="sirid-home-eyebrow">EL DEPORTE SE VIVE / EN MOVIMIENTO</p>
            <h2 id="gallery-title" className="mt-3 font-display text-[clamp(2.8rem,6vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.065em]">
              Salí a <span className="text-terracotta">jugar.</span>
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-6 text-charcoal/70">Una muestra del juego que te espera. Fotos ilustrativas, no de las instalaciones.</p>
        </div>
        <SportsGallery />
      </section>

      <section id="como-funciona" className="sirid-home-method py-10 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <p className="sirid-home-eyebrow">ASÍ DE SIMPLE / 01—03</p>
            <h2 className="mt-4 max-w-3xl font-display text-[clamp(2.8rem,6vw,6rem)] font-bold leading-[0.95] tracking-[-0.065em]">
              Menos vueltas.<br /><span className="text-terracotta">Más juego.</span>
            </h2>
          </div>
          <p className="max-w-xs text-base leading-7 text-charcoal/75">
            Del plan al partido, sin llamadas ni papeles de por medio.
          </p>
        </div>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {METHOD.map((item, index) => (
            <li
              key={item.step}
              className={index === 1 ? "sirid-home-step sirid-home-step-2" : index === 2 ? "sirid-home-step sirid-home-step-3" : "sirid-home-step"}
            >
              <span className="sirid-step-icon" aria-hidden="true"><item.icon className="h-6 w-6" strokeWidth={1.75} /></span>
              <span className="relative mt-5 font-mono text-xs font-semibold tracking-widest">PASO / {item.step}</span>
              <span className="sirid-home-step-number" aria-hidden="true">{item.step}</span>
              <h3 className="relative mt-auto pt-6 font-display text-2xl font-bold tracking-tight">{item.title}</h3>
              <p className="relative mt-2 max-w-xs text-sm leading-6">{item.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="sirid-gallery-section py-10 md:py-16" aria-labelledby="carousel-title">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="sirid-home-eyebrow">OTRA FORMA DE SENTIR EL JUEGO</p>
            <h2 id="carousel-title" className="mt-3 font-display text-[clamp(2.8rem,6vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.065em]">
              Seguí el <span className="text-terracotta">ritmo.</span>
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-6 text-charcoal/70">Deslizá las imágenes y descubrí tu próximo plan deportivo.</p>
        </div>
        <SportsCarousel />
      </section>

      <section className="sirid-home-finale mb-10 grid overflow-hidden rounded-[1.75rem] border border-charcoal/10 md:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-between gap-8 p-7 sm:p-12">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest">TU PRÓXIMO PLAN / EMPIEZA ACÁ</p>
          <h2 className="font-display text-[clamp(2.8rem,5vw,5rem)] font-medium leading-[1.02] tracking-[-0.055em]">
            Que no se quede<br /><span className="text-terracotta">en planes.</span>
          </h2>
        </div>
        <div className="flex flex-col items-start justify-center gap-6 p-7 text-charcoal sm:p-12">
          <div>
            <p className="mb-7 max-w-xs text-base leading-7 text-charcoal/70">Encontrá tu espacio, elegí el momento y salí a jugar.</p>
            <ButtonLink href="/organizaciones" size="lg" className="border-charcoal bg-charcoal text-ivory hover:border-coffee hover:bg-coffee">
              Explorar espacios <span aria-hidden="true">↗</span>
            </ButtonLink>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function Hero() {
  return (
    <section className="sirid-home-hero relative isolate overflow-hidden" aria-labelledby="hero-title">
      <HeroIntro />
      <div className="sirid-hero-backdrop absolute inset-y-0 right-0 -z-20">
        <Image src="/gallery/hero-clay.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
      </div>
      <div className="sirid-hero-shade pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div className="sirid-hero-layout relative z-10 mx-auto flex max-w-[1360px] flex-col justify-between">
        <div className="sirid-hero-copy">
          <p className="sirid-hero-kicker"><span aria-hidden="true">✳</span> SIRID · EL ESPACIO ES TUYO</p>
          <h1 id="hero-title" className="sirid-hero-title font-display">
            El próximo<br />partido<br /><span>empieza acá.</span>
          </h1>
          <p className="sirid-hero-description">
            Un lugar para encontrarse. Un momento para jugar.<br className="hidden sm:block" /> Descubrí tu cancha y hacé espacio para lo que te mueve.
          </p>
          <div className="sirid-hero-actions flex flex-wrap items-center gap-5">
            <Link href="/organizaciones" className="sirid-hero-book">
              Encontrá tu espacio <span aria-hidden="true">↗</span>
            </Link>
            <Link href="#como-funciona" className="sirid-hero-how">Cómo funciona <span aria-hidden="true">↓</span></Link>
          </div>
        </div>
        <div className="sirid-hero-bottom">
          <Link href="#gallery-title" className="sirid-hero-disciplines">
            <span className="sirid-hero-thumbnails" aria-hidden="true">
              {["football", "basketball", "volleyball"].map((sport) => <Image key={sport} src={`/gallery/${sport}.jpg`} alt="" width={64} height={64} />)}
            </span>
            <span>Distintos deportes.<br /><strong>La misma pasión. ↗</strong></span>
          </Link>
          <p className="sirid-hero-signoff"><span aria-hidden="true">✳</span> Menos vueltas.<br />Más juego.</p>
        </div>
      </div>
    </section>
  );
}
