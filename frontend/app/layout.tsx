import type { Metadata } from "next";

import { Providers } from "@/features/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SIRID Reserva Deportiva",
    template: "%s · SIRID",
  },
  description:
    "Consulta instalaciones del complejo, revisa disponibilidad real y reserva sin cruces de horario.",
  icons: { icon: "/brand/davlillos-favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-charcoal focus:px-4 focus:py-2 focus:text-ivory"
        >
          Saltar al contenido
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
