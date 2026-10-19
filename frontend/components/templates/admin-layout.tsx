"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/atoms/brand-mark";
import { ButtonLink } from "@/components/atoms/button";
import { LoadingBlock } from "@/components/atoms/states";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { SessionMenu } from "@/features/auth/auth-button";
import { useAuth } from "@/features/auth/auth-context";
import { ThemeToggle } from "@/features/ui/theme-toggle";
import { cn } from "@/lib/cn";

// El administrador del sistema ve 3 secciones: resumen, organizaciones y
// usuarios. Clientes e instalaciones viven dentro de cada organizacion.
// El encargado ve las reservas y el catalogo de su propia organizacion.
const SECTIONS = [
  { href: "/admin", label: "Resumen", access: "admin" },
  { href: "/admin/organizaciones", label: "Organizaciones", access: "admin" },
  { href: "/admin/usuarios", label: "Usuarios", access: "admin" },
  { href: "/encargado/reservas", label: "Reservas", access: "manager" },
  { href: "/encargado/clientes", label: "Clientes", access: "manager" },
  { href: "/encargado/instalaciones", label: "Instalaciones", access: "manager" },
  { href: "/encargado/reportes", label: "Reportes", access: "manager" },
] as const;

/**
 * Layout administrativo.
 *
 * Ocultar el panel es comodidad, no seguridad: cada endpoint de `/v1/admin`
 * vuelve a validar ADMIN o ENCARGADO en el backend segun la operacion.
 */
export function AdminLayout({
  children,
  access = "admin",
}: {
  children: React.ReactNode;
  access?: "admin" | "catalog" | "reservations";
}) {
  const pathname = usePathname();
  const { user, isAdmin, isReservationManager, isLoading } = useAuth();
  const allowed =
    access === "reservations"
      ? isReservationManager
      : access === "catalog"
        ? isAdmin || isReservationManager
        : isAdmin;

  if (isLoading) {
    return (
      <div className="dvl-shell py-20">
        <LoadingBlock label="VERIFICANDO PERMISOS" />
      </div>
    );
  }

  if (!user || !allowed) {
    return (
      <div className="dvl-shell py-20">
        <TechnicalLabel>ADMIN_01</TechnicalLabel>
        <h1 className="dvl-display mt-4">Acceso restringido</h1>
        <p className="mt-5 max-w-lg text-lg leading-8 text-charcoal/70">
          {user
            ? "Tu cuenta no tiene permisos para esta seccion. Pedile a un administrador que te asigne el rol correspondiente."
            : "Inicia sesion con una cuenta interna para gestionar el complejo."}
        </p>
        {!user ? (
          <div className="mt-8">
            <ButtonLink href="/ingresar">Iniciar sesion</ButtonLink>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="sirid-admin-shell min-h-dvh">
      <div className="dvl-shell">
        <header className="sticky top-3 z-40 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-charcoal/15 bg-ivory/95 px-5 py-3 backdrop-blur-xl sm:rounded-full">
          <Link href={isAdmin ? "/admin" : "/encargado"} className="flex items-center gap-3">
            <BrandMark />
            <span className="rounded-full border border-charcoal/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em]">
              {isAdmin ? "Admin" : "Encargado"}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <SessionMenu />
          </div>
        </header>

        <div className="grid gap-8 py-8 lg:grid-cols-[13rem_1fr] lg:items-start">
          <nav aria-label="Secciones del panel" className="min-w-0 lg:sticky lg:top-24">
            <TechnicalLabel>PANEL</TechnicalLabel>
            <ul className="mt-3 flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
              {SECTIONS.filter((section) =>
                section.access === "admin" ? isAdmin : isReservationManager,
              ).map((section) => {
                const active =
                  section.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(section.href);
                return (
                  <li key={section.href}>
                    <Link
                      href={section.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                         "block min-h-11 whitespace-nowrap rounded-xl border px-4 py-2.5 text-sm transition-colors duration-fast lg:w-full",
                        active
                          ? "border-charcoal bg-charcoal font-semibold text-ivory"
                          : "border-charcoal/20 hover:border-charcoal",
                      )}
                    >
                      {section.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <main id="contenido" className="min-w-0 pb-16">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
