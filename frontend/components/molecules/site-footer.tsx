import Link from "next/link";

import { BrandMark } from "@/components/atoms/brand-mark";
import { TechnicalLabel } from "@/components/atoms/technical-label";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-charcoal/15 py-10">
      <div className="grid gap-8 md:grid-cols-[1.2fr_1fr]">
        <div>
          <BrandMark withTagline />
          <p className="mt-4 max-w-xs text-sm leading-6 text-charcoal/65">
            Complejo deportivo con reserva en linea. Horarios claros y sin cruces.
          </p>
        </div>
        <nav aria-label="Enlaces de ayuda">
          <TechnicalLabel>NAVEGACION</TechnicalLabel>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link className="hover:text-terracotta" href="/instalaciones">
                Instalaciones
              </Link>
            </li>
            <li>
              <Link className="hover:text-terracotta" href="/mis-reservas">
                Mis reservas
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-charcoal/10 pt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal/55">
        <span>SIRID RESERVA DEPORTIVA</span>
        <span>Consulta disponibilidad y gestiona tus reservas en línea.</span>
      </div>
    </footer>
  );
}
