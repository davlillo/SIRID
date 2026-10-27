"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function HomeScrollMotion() {
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.to(".sirid-home-letter", {
        yPercent: (index) => index % 2 ? -3 : 3,
        rotation: (index) => index % 2 ? 0.35 : -0.35,
        stagger: 0.06,
        ease: "none",
        scrollTrigger: {
          trigger: ".sirid-home-hero",
          start: "top top",
          end: "bottom top",
          scrub: 0.8,
        },
      });
      gsap.fromTo(".sirid-home-method h2", { y: 20 }, {
        y: 0,
        ease: "none",
        scrollTrigger: {
          trigger: ".sirid-home-method",
          start: "top bottom",
          end: "top 45%",
          scrub: true,
        },
      });
    });
    return () => media.revert();
  });

  return null;
}
