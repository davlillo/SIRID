"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/atoms/brand-mark";
import { LoadingBlock } from "@/components/atoms/states";
import { TechnicalLabel } from "@/components/atoms/technical-label";
import { GoogleAuthButton, SessionMenu } from "@/features/auth/auth-button";
import { useAuth } from "@/features/auth/auth-context";
import { cn } from "@/lib/cn";

const SECTIONS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/reservas", label: "Reservas" },
  { href: "/admin/instalaciones", label: "Instalaciones" },
];

/**
 * Layout administrativo.
 *
 * Ocultar el panel es comodidad, no seguridad: cada endpoint de `/v1/admin`
 * vuelve a exigir rol ADMIN en el backend.
 */
export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="dvl-shell py-20">
        <LoadingBlock label="VERIFICANDO PERMISOS" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="dvl-shell py-20">
        <TechnicalLabel>ADMIN_01</TechnicalLabel>
        <h1 className="dvl-display mt-4">Acceso restringido</h1>
        <p className="mt-5 max-w-lg text-lg leading-8 text-charcoal/70">
          {user
            ? "Tu cuenta no tiene rol de administrador. Pedile a un administrador que te asigne el permiso."
            : "Inicia sesion con una cuenta administradora para gestionar el complejo."}
        </p>
        {!user ? (
          <div className="mt-8">
            <GoogleAuthButton />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <div className="dvl-shell">
        <header className="flex items-center justify-between border-b border-charcoal/15 py-4">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark />
            <span className="border border-charcoal px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em]">
              Admin
            </span>
          </Link>
          <SessionMenu />
        </header>

        <div className="grid gap-8 py-8 lg:grid-cols-[13rem_1fr] lg:items-start">
          <nav aria-label="Secciones del panel" className="lg:sticky lg:top-8">
            <TechnicalLabel>PANEL</TechnicalLabel>
            <ul className="mt-3 flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
              {SECTIONS.map((section) => {
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
                        "block whitespace-nowrap border px-4 py-2.5 text-sm transition-colors duration-fast lg:w-full",
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
