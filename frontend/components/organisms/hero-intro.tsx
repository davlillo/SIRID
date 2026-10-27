"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

gsap.registerPlugin(useGSAP);

export function HeroIntro() {
  const [canAnimate, setCanAnimate] = useState(false);
  const [intro, setIntro] = useState(true);
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setCanAnimate(!media.matches);
      if (media.matches) setIntro(false);
    };
    sync();
    media.addEventListener("change", sync);
    try {
      if (sessionStorage.getItem("sirid-intro-seen")) setIntro(false);
    } catch {
      // The introduction can still be skipped without storage.
    }
    return () => media.removeEventListener("change", sync);
  }, []);

  useGSAP(() => {
    if (!canAnimate || !intro) return;
    const timeline = gsap.timeline({ onComplete: () => {
      setIntro(false);
      try { sessionStorage.setItem("sirid-intro-seen", "1"); } catch { /* storage optional */ }
    } });
    timeline.fromTo(".sirid-intro-mark", { opacity: 0, scale: 0.7, rotation: -30 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.6, ease: "back.out(1.8)" })
      .fromTo(".sirid-intro-name", { opacity: 0, y: 20, letterSpacing: "0.55em" }, { opacity: 1, y: 0, letterSpacing: "0.22em", duration: 0.65, ease: "power3.out" }, "-=0.2")
      .to(".sirid-intro-progress", { scaleX: 1, duration: 0.55, ease: "power2.inOut" }, "-=0.3")
      .to(".sirid-intro", { opacity: 0, duration: 0.45, ease: "power2.inOut" }, "+=0.1");
    return () => timeline.kill();
  }, { scope, dependencies: [canAnimate, intro], revertOnUpdate: true });

  return intro ? (
    <div ref={scope} className="sirid-intro fixed inset-0 z-[100] flex items-center justify-center bg-[#191817] text-[#F7F3EA]" aria-label="Presentación de SIRID">
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/davlillos-symbol-inverse.svg" alt="" className="sirid-intro-mark mx-auto h-20 w-44 object-contain opacity-0" />
        <p className="sirid-intro-name mt-4 font-display text-5xl font-bold tracking-[0.22em] opacity-0 sm:text-7xl">SIRID</p>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.28em] text-[#E8D8BE]">El espacio es tuyo</p>
        <div className="mx-auto mt-8 h-px w-44 overflow-hidden bg-[#E8D8BE]/30"><div className="sirid-intro-progress h-full origin-left scale-x-0 bg-[#C65F45]" /></div>
        <button type="button" onClick={() => setIntro(false)} className="mt-8 min-h-11 rounded-full border border-[#E8D8BE]/40 px-5 text-xs hover:bg-[#E8D8BE]/10">Omitir introducción</button>
      </div>
    </div>
  ) : null;
}
