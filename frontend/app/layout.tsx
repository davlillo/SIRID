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
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var saved=localStorage.getItem('sirid-theme');var theme=saved==='light'||saved==='dark'?saved:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=theme;document.documentElement.classList.toggle('dark',theme==='dark')}catch(e){document.documentElement.dataset.theme='light'}`,
          }}
        />
      </head>
      <body>
        <div className="sirid-flow-background" aria-hidden="true" />
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-charcoal focus:px-4 focus:py-2 focus:text-ivory"
        >
          Saltar al contenido
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
