"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The hero's pointer spotlight, extended to the whole page.
 *
 * The hero reveals a photograph through a mask, which only works where there
 * is a second image to uncover. Below it the sections are flat colour, so the
 * same idea has to be expressed as light rather than as an unmasking: a soft
 * pool that follows the pointer and lifts whatever it passes over.
 *
 * Two details that matter:
 *
 *  - The blend mode flips with the band. Screen lightens, which reads well on
 *    the charcoal and olive sections but washes the cream ones out; multiply
 *    does the reverse. The layer samples the luminance under the pointer and
 *    picks accordingly, so one component serves the page's whole rhythm.
 *  - Position is written as CSS custom properties from a single rAF loop,
 *    never as React state. A setState per pointer move would re-render the
 *    entire page on every frame.
 */
export function PointerLight() {
  const ref = useRef<HTMLDivElement>(null);
  const target = useRef({ x: -900, y: -900 });
  const smooth = useRef({ x: -900, y: -900 });
  const [calm, setCalm] = useState(true);

  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setCalm(q.matches);
    apply();
    q.addEventListener("change", apply);
    return () => q.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (calm) return;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      target.current = { x: e.clientX, y: e.clientY };
    };
    const onLeave = () => {
      target.current = { x: -900, y: -900 };
    };

    let frame = 0;
    let lastBand = "";
    let lastBandCheck = 0;
    const el = ref.current;

    /* How often the band under the pointer is re-read, in ms.
       This used to happen on every frame, and that was the single most
       expensive thing on the page: elementFromPoint followed by
       getComputedStyle forces the browser to flush style and layout, 60
       times a second, for the entire visit. The result it produces is one
       of two values, and a section boundary is crossed maybe twice in a
       scroll — so 59 of every 60 reads returned what the last one did and
       paid a full style recalc to say so.

       160ms is under the ~200ms at which a change of this kind stops
       reading as instant, and it is a 90% cut in the work. */
    const BAND_MS = 160;

    const tick = (now: number) => {
      /* Same lerp as the hero, so the two feel like one system. */
      const dx = target.current.x - smooth.current.x;
      const dy = target.current.y - smooth.current.y;

      /* Settled: stop the loop entirely rather than burning a frame every
         16ms writing the same two numbers. It restarts on the next
         pointermove. An idle tab was previously running this forever. */
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        frame = 0;
        return;
      }

      smooth.current.x += dx * 0.1;
      smooth.current.y += dy * 0.1;
      const { x, y } = smooth.current;

      if (el) {
        el.style.setProperty("--px", `${x}px`);
        el.style.setProperty("--py", `${y}px`);

        if (now - lastBandCheck > BAND_MS) {
          lastBandCheck = now;
          /* Which band is under the pointer? elementFromPoint is exact and
             beats guessing from scroll offsets — it is just not something
             to do on every frame. */
          const under = document.elementFromPoint(x, y)?.closest("section");
          const bg = under ? getComputedStyle(under).backgroundColor : "";
          const m = bg.match(/[\d.]+/g);
          let light = false;
          if (m && m.length >= 3) {
            const [r, g, b] = m
              .slice(0, 3)
              .map((v) => (Number(v) > 1 ? Number(v) / 255 : Number(v)));
            light = 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.5;
          }
          const band = light ? "light" : "dark";
          if (band !== lastBand) {
            lastBand = band;
            el.style.mixBlendMode = light ? "multiply" : "screen";
            el.style.setProperty("--glow", light ? "0.10" : "0.16");
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };

    /* Kick the loop only when there is something to animate towards. */
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const move = (e: PointerEvent) => {
      onMove(e);
      wake();
    };
    const leave = () => {
      onLeave();
      wake();
    };

    addEventListener("pointermove", move, { passive: true });
    addEventListener("pointerleave", leave);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      removeEventListener("pointermove", move);
      removeEventListener("pointerleave", leave);
    };
  }, [calm]);

  /* Nothing rendered under reduced motion: a light that chases the pointer
     is exactly what that preference asks to be spared. */
  if (calm) return null;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[40]"
      style={{
        mixBlendMode: "screen",
        background:
          "radial-gradient(260px circle at var(--px, -900px) var(--py, -900px)," +
          "color-mix(in srgb, var(--brand-1) 60%, #fff) 0%," +
          "color-mix(in srgb, var(--brand-2) 45%, #fff) 34%," +
          "transparent 72%)",
        opacity: "var(--glow, 0.16)",
        transition: "opacity .3s ease",
      }}
    />
  );
}
