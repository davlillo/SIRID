"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/atoms/brand-mark";
import { SessionMenu } from "@/features/auth/auth-button";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/instalaciones", label: "Instalaciones" },
  { href: "/mapa", label: "Mapa" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-charcoal/15 bg-ivory/95 py-4 backdrop-blur">
      <Link href="/" aria-label="SIRID, inicio">
        <BrandMark />
      </Link>
      <nav className="flex items-center gap-5 sm:gap-6">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={pathname.startsWith(link.href) ? "page" : undefined}
            className={cn(
              "text-sm transition-colors duration-fast hover:text-terracotta",
              pathname.startsWith(link.href) && "font-semibold text-terracotta",
            )}
          >
            {link.label}
          </Link>
        ))}
        <SessionMenu />
      </nav>
    </header>
  );
}
