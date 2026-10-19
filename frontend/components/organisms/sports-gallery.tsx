"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import GridMotion from "@/components/GridMotion";
import { SPORTS_PHOTOS } from "@/lib/sports-media";

const TILES = [
  SPORTS_PHOTOS[0],
  <span key="play" className="sirid-grid-word">JUGÁ<span className="text-terracotta">.</span></span>,
  SPORTS_PHOTOS[1],
  SPORTS_PHOTOS[3],
  <span key="moment" className="sirid-grid-word">TU<br />MOMENTO.</span>,
  SPORTS_PHOTOS[2],
  SPORTS_PHOTOS[0],
  <span key="sirid" className="sirid-grid-word">SIRID<span className="text-terracotta">↗</span></span>,
];

export function SportsGallery() {
  const [reduceMotion, setReduceMotion] = useState(true);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = window.matchMedia("(max-width: 640px)");
    const sync = () => setReduceMotion(media.matches);
    const syncWidth = () => setCompact(narrow.matches);
    sync();
    syncWidth();
    media.addEventListener("change", sync);
    narrow.addEventListener("change", syncWidth);
    return () => {
      media.removeEventListener("change", sync);
      narrow.removeEventListener("change", syncWidth);
    };
  }, []);

  return (
    <div>
      <p className="mb-5 font-mono text-xs font-medium uppercase tracking-widest text-charcoal/65">LA ENERGÍA DEL JUEGO / 01—04</p>
      <div className="sirid-gallery-frame relative h-[26rem] overflow-hidden rounded-[2rem] bg-coffee sm:h-[32rem]">
        {reduceMotion ? (
          <div className="grid h-full grid-cols-2 grid-rows-2 gap-2 p-2" aria-label="Galería de deportes">
            {SPORTS_PHOTOS.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={photo.src} src={photo.src} alt={photo.alt} loading="lazy" className="h-full w-full rounded-2xl object-cover" />
            ))}
          </div>
        ) : (
          <>
            <ul className="sr-only" aria-label="Deportes de la galería">
              {SPORTS_PHOTOS.map((photo) => <li key={photo.src}>{photo.alt}</li>)}
            </ul>
            <GridMotion
              items={TILES}
              rows={compact ? 2 : 3}
              aspectRatio={compact ? 1.15 : 1.45}
              gap={12}
              radius={18}
              angle={compact ? -4 : -7}
              tilt={compact ? 0 : 6}
              speed={12}
              spotlight={0.28}
              dim={0.08}
              fade={0.12}
              tileColor="rgb(var(--dvl-ui-sand))"
              textColor="rgb(var(--dvl-ui-charcoal))"
            />
          </>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-charcoal/65 to-transparent p-5 sm:p-7">
          <Link href="/organizaciones" className="pointer-events-auto inline-flex min-h-11 items-center rounded-full bg-ivory px-5 text-sm font-semibold text-charcoal transition-transform hover:-translate-y-0.5">
            Encontrá tu espacio <span aria-hidden="true" className="ml-2">↗</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
