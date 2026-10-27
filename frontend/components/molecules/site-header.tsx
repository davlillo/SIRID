"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/atoms/brand-mark";
import { SessionMenu } from "@/features/auth/auth-button";
import { useAuth } from "@/features/auth/auth-context";
import { ThemeToggle } from "@/features/ui/theme-toggle";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/organizaciones", label: "Organizaciones" },
  { href: "/instalaciones", label: "Instalaciones" },
];

export function SiteHeader({ organizationSlug }: { organizationSlug?: string }) {
  const { user, isLoading } = useAuth();
  const isClient = user?.role === "CLIENT";
  const selectedOrganization = isClient ? user.organization_id : organizationSlug;
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const overHero = pathname === "/" && !scrolled;

  useEffect(() => {
    const sync = () => setScrolled(window.scrollY > 48);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", dismissOutside);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", dismissOutside);
    };
  }, [menuOpen]);

  return (
    <header ref={headerRef} className={cn("sticky top-3 z-40 mt-3 flex min-h-16 items-center justify-between gap-2 px-3 transition-colors sm:px-5", overHero ? "sirid-header-overlay text-[#fff9ef]" : "rounded-full border border-charcoal/15 bg-ivory/95 shadow-[0_12px_30px_-20px_rgba(25,24,23,0.32)] backdrop-blur-xl")}>
      <Link href="/" aria-label="SIRID, inicio" className="shrink-0" onClick={() => setMenuOpen(false)}>
        <BrandMark inverse={overHero} />
      </Link>
      <nav
        aria-label="Navegación principal"
        id="sirid-public-nav"
        className={cn(
          "absolute left-0 right-0 top-[calc(100%+0.5rem)] flex-col gap-1 rounded-3xl border border-charcoal/15 bg-ivory p-3 !text-charcoal shadow-lg lg:static lg:flex lg:flex-row lg:items-center lg:border-0 lg:bg-transparent lg:p-0 lg:!text-inherit lg:shadow-none",
          menuOpen ? "flex" : "hidden lg:flex",
        )}
      >
        {LINKS.filter((link) => link.href !== "/organizaciones" || (!isLoading && !isClient)).map((link) => {
          const href =
            link.href === "/organizaciones"
              ? link.href
              : selectedOrganization
                ? `${link.href}?organization=${encodeURIComponent(selectedOrganization)}`
                : "/instalaciones";
          return (
            <Link
              key={link.href}
              href={href}
              aria-current={pathname.startsWith(link.href) ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "rounded-full px-4 py-3 text-sm transition-colors duration-fast hover:bg-sand/65 hover:text-terracotta lg:py-2.5",
                pathname.startsWith(link.href) && "bg-sand/70 font-semibold text-terracotta",
                overHero && "!text-charcoal lg:!text-[#fff9ef]",
              )}
            >
              {link.label}
            </Link>
          );
        })}
        <div className="mt-2 border-t border-charcoal/15 px-2 pt-2 lg:hidden">
          <SessionMenu />
        </div>
      </nav>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <ThemeToggle />
        <div className="hidden lg:block"><SessionMenu /></div>
        <button
          type="button"
          ref={menuButtonRef}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-controls="sirid-public-nav"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-charcoal/25 lg:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>
    </header>
  );
}
