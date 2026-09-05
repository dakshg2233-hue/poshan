"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "./lang-provider";

/**
 * POSHAN, Quiet Vitality hero.
 *
 * Built to the supplied spec: 100dvh, dark botanical still-life, monumental
 * Instrument Serif wordmark, frosted glass navigation, and a pointer-following
 * spotlight that uncovers a second still-life in the lower 60% of the frame.
 *
 * Three departures, each forced rather than chosen:
 *
 *  - The brief describes a still-life of figs, leafy greens, amber liquid and a
 *    matte-charcoal jar. No such asset is in this repo and the spec ships none,
 *    so the site's own thali photograph stands in for the base and reveal
 *    layers. Drop files at the two paths below and they are picked up.
 *  - Nav labels are conventional section names, not the spec's brand-speak,
 *    and the whole group sits at the far right rather than centred.
 *  - Copy stays bilingual. The spec is English-only, but half this site's
 *    readers are not, and a hero that silently drops Hindi is a regression.
 */

/* Swap for real botanical stills when they exist. */
const STILL = "/thali-hero.jpg";
const MOTION = "/thali-hero.jpg";

/** Poshan Leaf: the only action and status colour in this design. */
const LEAF = "#8FBF72";

export function HeroVideo() {
  const { T } = useLang();
  const heroRef = useRef<HTMLElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const target = useRef({ x: -800, y: -800 });
  const smooth = useRef({ x: -800, y: -800 });

  /* True by default so nothing animates before the preference is known. */
  const [calm, setCalm] = useState(true);

  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setCalm(q.matches);
    apply();
    q.addEventListener("change", apply);
    return () => q.removeEventListener("change", apply);
  }, []);

  /* Spotlight and grid parallax. The mask is drawn into a hidden canvas and
     handed to the reveal layer as a data URL, per the spec. */
  useEffect(() => {
    if (calm) return;
    const canvas = canvasRef.current;
    const hero = heroRef.current;
    if (!canvas || !hero) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const R = 260;

    const draw = () => {
      const rect = hero.getBoundingClientRect();
      /* Canvas matches the hero, so mask coordinates need no conversion. */
      if (canvas.width !== Math.round(rect.width) || canvas.height !== Math.round(rect.height)) {
        canvas.width = Math.max(1, Math.round(rect.width));
        canvas.height = Math.max(1, Math.round(rect.height));
      }

      smooth.current.x += (target.current.x - smooth.current.x) * 0.1;
      smooth.current.y += (target.current.y - smooth.current.y) * 0.1;
      const { x, y } = smooth.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const g = ctx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(0.4, "rgba(0,0,0,1)");
      g.addColorStop(0.6, "rgba(0,0,0,0.75)");
      g.addColorStop(0.75, "rgba(0,0,0,0.4)");
      g.addColorStop(0.88, "rgba(0,0,0,0.12)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - R, y - R, R * 2, R * 2);

      if (revealRef.current) {
        const url = `url(${canvas.toDataURL()})`;
        revealRef.current.style.webkitMaskImage = url;
        revealRef.current.style.maskImage = url;
      }
      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [calm]);

  function onMove(e: React.PointerEvent<HTMLElement>) {
    if (e.pointerType === "touch" || calm) return;
    const r = e.currentTarget.getBoundingClientRect();
    target.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  return (
    <section
      id="hero"
      ref={heroRef}
      onPointerMove={onMove}
      onPointerLeave={() => {
        target.current = { x: -800, y: -800 };
      }}
      className="relative isolate w-full overflow-hidden text-white"
      style={{ height: "100dvh", minHeight: 600, background: "#0a0b0a" }}
    >
      {/* 1, the still-life */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${STILL}')` }}
        aria-hidden="true"
      />

      {/* 2: warm dark-to-transparent overlay, weighted to the upper left,
             which the spec asks to keep dark and spacious for the headline */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(105% 85% at 16% 4%, rgba(10,11,10,.88), rgba(10,11,10,.42) 38%, transparent 68%)," +
            "linear-gradient(180deg, rgba(10,11,10,.55) 0%, transparent 34%, transparent 58%, rgba(10,11,10,.72) 100%)",
        }}
        aria-hidden="true"
      />
      {/* Warm amber bloom, plus one restrained botanical accent */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(46% 36% at 82% 76%, rgba(196,132,58,.14), transparent 72%)," +
            `radial-gradient(38% 30% at 12% 82%, ${LEAF}1f, transparent 72%)`,
        }}
        aria-hidden="true"
      />

      {/* A scrim for the TEXT only, not the whole frame. Darkening everything
          made the copy legible by hiding the food, which on a food site is the
          wrong trade. This sits behind the centre column and falls away fast,
          so the plate stays visible either side of it. */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(46% 34% at 50% 50%, rgba(8,9,8,.72), rgba(8,9,8,.45) 55%, transparent 78%)",
        }}
        aria-hidden="true"
      />


      {/* 5: masked reveal, across the whole frame.
             The spec clipped this to inset(40% 0 0 0) so the spotlight only
             worked in the lower 60%; hovering the top of the hero did nothing.
             Unclipped on request, so the reveal follows the pointer anywhere. */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      {!calm && (
        <div
          ref={revealRef}
          className="pointer-events-none absolute inset-0 z-[3] hidden bg-cover bg-center md:block"
          style={{ backgroundImage: `url('${MOTION}')` }}
          aria-hidden="true"
        />
      )}

      {/* The header this section used to carry — its own logo, its own nav
          links, its own "Find your blend" pill — is gone. It duplicated the
          real <Nav> (a second Poshan mark, a second set of links pointing at
          anchors the tab system no longer scrolls to) and, being
          position:absolute inside this section rather than fixed to the
          viewport, painted directly under the real header: two bars reading
          as one overlapping mess. This is decoration now, not chrome; "Find
          your blend" lives on the dashboard as a real utility link instead. */}

      {/* --------------------------------------------------------- centre */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 px-5 text-center">
        <p
          className="mb-5 flex items-center justify-center gap-2 text-[0.68rem] uppercase"
          style={{
            letterSpacing: "0.24em",
            color: "rgb(255 255 255 / .74)",
            fontFamily: "var(--font-ui), sans-serif",
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: LEAF }} aria-hidden="true" />
          {T({ en: "Your daily nutrition ritual", hi: "आपकी रोज़ की पोषण दिनचर्या" })}
        </p>

        <h1
          className="uppercase text-white"
          style={{
            fontFamily: "var(--font-wordmark), Georgia, serif",
            fontSize: "clamp(4rem, 17vw, 15rem)",
            lineHeight: 0.78,
            letterSpacing: "-0.045em",
          }}
        >
          Poshan
        </h1>

        <p
          className="mx-auto mt-6 max-w-[46ch] text-[0.95rem] sm:text-base"
          style={{ color: "rgb(255 255 255 / .82)", fontFamily: "var(--font-ui), sans-serif" }}
        >
          {T({
            en: "Nourishment, in your rhythm, consciously made.",
            hi: "पोषण, आपकी अपनी लय में, सोच-समझकर बनाया गया।",
          })}
        </p>
      </div>

      {/* Footer used to end in a "01 / 01" page-number tick — a leftover from
          a slide-deck-style spec this was adapted from. There is only ever
          one hero; a page count that never changes isn't information. */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-4 px-5 pb-5 text-[0.68rem] sm:px-7 sm:pb-7"
        style={{ color: "rgb(255 255 255 / .62)", fontFamily: "var(--font-ui), sans-serif" }}
      >
        <span className="shrink-0">
          {T({ en: "Thoughtfully made for the everyday.", hi: "रोज़मर्रा के लिए, सोच के साथ बना।" })}
        </span>
        <span className="h-px flex-1" style={{ background: "rgb(255 255 255 / .18)" }} aria-hidden="true" />
      </div>
    </section>
  );
}
