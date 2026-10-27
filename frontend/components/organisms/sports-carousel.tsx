"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { SPORTS_PHOTOS } from "@/lib/sports-media";

const FlexCarousel = dynamic(() => import("@/components/FlexCarousel"), { ssr: false });

export function SportsCarousel() {
  const frame = useRef<HTMLDivElement>(null);
  const [reduceMotion, setReduceMotion] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!frame.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "250px" });
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frame} className="sirid-gallery-frame relative h-[23rem] overflow-hidden rounded-[2rem] bg-coffee sm:h-[31rem]">
      {reduceMotion || !visible ? (
        <div className="grid h-full grid-cols-2 gap-2 p-2 sm:grid-cols-4" aria-label="Deportes para explorar">
          {SPORTS_PHOTOS.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={photo.src} src={photo.src} alt={photo.alt} loading="lazy" className="h-full w-full rounded-2xl object-cover" />
          ))}
        </div>
      ) : (
        <FlexCarousel
          items={SPORTS_PHOTOS}
          preset="ribbon"
          intro="bloom"
          fit="portrait"
          cardHeight={0.72}
          gap={18}
          radius={24}
          bend={0.2}
          dispersion={0.12}
          captureWheel={false}
          autoplay={false}
        />
      )}
    </div>
  );
}
