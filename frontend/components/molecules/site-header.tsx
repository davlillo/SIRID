"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandMark } from "@/components/atoms/brand-mark";
import { SessionMenu } from "@/features/auth/auth-button";
import { ThemeToggle } from "@/features/ui/theme-toggle";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/organizaciones", label: "Organizaciones" },
  { href: "/instalaciones", label: "Instalaciones" },
];

export function SiteHeader({ organizationSlug }: { organizationSlug?: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const overHero = pathname === "/" && !scrolled;

  useEffect(() => {
    const sync = () => setScrolled(window.scrollY > 48);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  return (
    <header className={cn("sticky top-3 z-40 mt-3 flex min-h-16 items-center justify-between gap-2 px-3 transition-colors sm:px-5", overHero ? "sirid-header-overlay text-[#fff9ef]" : "rounded-full border border-charcoal/15 bg-ivory/95 shadow-[0_12px_30px_-20px_rgba(25,24,23,0.32)] backdrop-blur-xl")}>
      <Link href="/" aria-label="SIRID, inicio" className="shrink-0" onClick={() => setMenuOpen(false)}>
        <BrandMark inverse={overHero} />
      </Link>
      <nav
        aria-label="Navegación principal"
        id="sirid-public-nav"
        className={cn(
          "absolute left-0 right-0 top-[calc(100%+0.5rem)] flex-col gap-1 rounded-3xl border border-charcoal/15 bg-ivory p-3 shadow-lg sm:static sm:flex sm:flex-row sm:items-center sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none",
          menuOpen ? "flex" : "hidden sm:flex",
        )}
      >
        {LINKS.map((link) => {
          const href =
            link.href === "/organizaciones"
              ? link.href
              : organizationSlug
                ? `${link.href}?organization=${encodeURIComponent(organizationSlug)}`
                : "/organizaciones";
          return (
            <Link
              key={link.href}
              href={href}
              aria-current={pathname.startsWith(link.href) ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "rounded-full px-4 py-3 text-sm transition-colors duration-fast hover:bg-sand/65 hover:text-terracotta sm:py-2.5",
                pathname.startsWith(link.href) && "bg-sand/70 font-semibold text-terracotta",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <ThemeToggle />
        <SessionMenu />
        <button
          type="button"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-controls="sirid-public-nav"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-charcoal/25 sm:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>
    </header>
  );
}
