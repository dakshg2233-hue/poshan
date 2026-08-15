"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-media-query";

/**
 * Page-level motion that has no single owner: the scroll progress rule and the
 * pointer-tilt behaviour on cards.
 *
 * Everything here is off under prefers-reduced-motion — not merely
 * transition-less, but not installed at all, so no listeners and no frame work.
 */
export function MotionLayer() {
  const calm = usePrefersReducedMotion();
  const [progress, setProgress] = useState(0);

  /* Scroll progress. Reads the shirorekha language: a rule that draws left to
     right as you move down the page. */
  useEffect(() => {
    if (calm) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(max > 0 ? window.scrollY / max : 0);
        raf = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [calm]);

  /* Pointer tilt on any .lift card. Delegated from the document rather than
     bound per card — there are 35+ of them, and 35 pairs of listeners for a
     hover effect is not a trade worth making. */
  useEffect(() => {
    if (calm) return;
    if (window.matchMedia("(hover: none)").matches) return;

    let active: HTMLElement | null = null;

    const onMove = (e: PointerEvent) => {
      const card = (e.target as HTMLElement)?.closest?.(".lift") as HTMLElement | null;
      if (card !== active) {
        if (active) active.style.transform = "";
        active = card;
      }
      if (!card) return;
      const r = card.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      /* Deliberately small. Past about 5deg a card stops reading as depth and
         starts reading as a gimmick, and the nutrition figures on it skew. */
      card.style.transform = `perspective(900px) rotateX(${(-ny * 3.2).toFixed(
        2
      )}deg) rotateY(${(nx * 3.2).toFixed(2)}deg) translateZ(0)`;
    };

    const onLeave = () => {
      if (active) active.style.transform = "";
      active = null;
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      if (active) active.style.transform = "";
    };
  }, [calm]);

  if (calm) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[90] pointer-events-none print:hidden"
      aria-hidden
    >
      <div
        className="h-[2px] origin-left"
        style={{
          background: "var(--kesar)",
          transform: `scaleX(${progress})`,
          transition: "transform 90ms linear",
        }}
      />
    </div>
  );
}
