"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { useLang } from "./lang-provider";

/**
 * POSHAN — Quiet Vitality hero.
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
 *  - Nav LABELS are the spec's; the hrefs point at Poshan's real sections.
 *    "Ritual" and "Our blends" describe a supplements brand; pointing them at
 *    anchors that do not exist would ship five dead links, which is a bug I
 *    have already had to fix once on this page.
 *  - Copy stays bilingual. The spec is English-only, but half this site's
 *    readers are not, and a hero that silently drops Hindi is a regression.
 */

/* Swap for real botanical stills when they exist. */
const STILL = "/thali-hero.jpg";
const MOTION = "/thali-hero.jpg";

/** Poshan Leaf — the only action and status colour in this design. */
const LEAF = "#8FBF72";

const NAV = [
  { href: "#check", en: "Ritual", hi: "दिनचर्या" },
  { href: "#plate", en: "Our blends", hi: "हमारी थाली" },
  { href: "#bios", en: "The science", hi: "विज्ञान" },
  { href: "#meals", en: "Journal", hi: "जर्नल" },
  { href: "#premium", en: "Reach us", hi: "संपर्क" },
];

/**
 * The four-part botanical kernel: an abstract seed of interlocking leaves that
 * also reads as a plate seen from above. Text-free and white, as specified.
 */
function Kernel({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <g fill="currentColor">
        {[0, 90, 180, 270].map((deg) => (
          <path
            key={deg}
            transform={`rotate(${deg} 16 16)`}
            /* One leaf, rotated four times about the centre so the tips meet. */
            d="M16 15.1c0-3.6 1.2-7.2 3.6-10.1 2.9 2.4 4.5 5.6 4.5 8.8 0 3.1-1.6 5.6-4.2 6.9-1.6.8-3 .9-3.9.9z"
          />
        ))}
        <circle cx="16" cy="16" r="1.7" opacity="0.55" />
      </g>
    </svg>
  );
}

export function HeroVideo() {
  const { T } = useLang();
  const heroRef = useRef<HTMLElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const target = useRef({ x: -800, y: -800 });
  const smooth = useRef({ x: -800, y: -800 });

  const [menuOpen, setMenuOpen] = useState(false);
  /* True by default so nothing animates before the preference is known. */
  const [calm, setCalm] = useState(true);

  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setCalm(q.matches);
    apply();
    q.addEventListener("change", apply);
    return () => q.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

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
      if (gridRef.current) {
        /* ~16px of travel, eased. */
        const dx = ((x - rect.width / 2) / rect.width) * 16;
        const dy = ((y - rect.height / 2) / rect.height) * 16;
        gridRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
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
      {/* 1 — the still-life */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${STILL}')` }}
        aria-hidden="true"
      />

      {/* 2 — warm dark-to-transparent overlay, weighted to the upper left,
             which the spec asks to keep dark and spacious for the headline */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(120% 100% at 18% 6%, rgba(10,11,10,.94), rgba(10,11,10,.6) 42%, rgba(10,11,10,.25) 70%, transparent 100%)," +
            "linear-gradient(180deg, rgba(10,11,10,.78) 0%, rgba(10,11,10,.3) 46%, rgba(10,11,10,.84) 100%)",
        }}
        aria-hidden="true"
      />
      {/* Warm amber bloom, plus one restrained botanical accent */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(52% 42% at 78% 72%, rgba(196,132,58,.22), transparent 70%)," +
            `radial-gradient(38% 30% at 12% 82%, ${LEAF}1f, transparent 72%)`,
        }}
        aria-hidden="true"
      />

      {/* 3 — 48px technical grid, parallaxed */}
      <div
        ref={gridRef}
        className="absolute inset-[-40px] z-[2] will-change-transform"
        style={{
          opacity: 0.09,
          backgroundSize: "48px 48px",
          backgroundImage:
            "linear-gradient(to right, #cfd8cd 1px, transparent 1px)," +
            "linear-gradient(to bottom, #cfd8cd 1px, transparent 1px)",
        }}
        aria-hidden="true"
      />

      {/* 5 — masked reveal, clipped to the lower 60% */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      {!calm && (
        <div
          ref={revealRef}
          className="pointer-events-none absolute inset-0 z-[3] hidden bg-cover bg-center md:block"
          style={{ backgroundImage: `url('${MOTION}')`, clipPath: "inset(40% 0 0 0)" }}
          aria-hidden="true"
        />
      )}

      {/* ----------------------------------------------------------- nav */}
      <header className="absolute inset-x-0 top-0 z-50 flex items-start justify-between p-5 sm:p-7">
        <a href="#top" className="flex items-center gap-2.5 no-underline" aria-label="Poshan">
          <Kernel className="h-7 w-7 text-white" />
          <span
            className="text-[1.35rem] italic leading-none text-white"
            style={{ fontFamily: "var(--font-wordmark), Georgia, serif" }}
          >
            Poshan
          </span>
        </a>

        <nav
          className="liquid-glass absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 rounded-full p-1.5 md:flex"
          style={{ backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)" }}
          aria-label="Main"
        >
          {NAV.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-[0.82rem] no-underline transition-colors hover:text-white active:scale-[.97]"
              style={{ color: "rgb(255 255 255 / .72)", fontFamily: "var(--font-ui), sans-serif" }}
            >
              {T(l)}
            </a>
          ))}
        </nav>

        <a
          href="#check"
          className="hidden items-center gap-2 rounded-full px-5 py-3 text-[0.82rem] font-medium no-underline transition-transform active:scale-[.97] md:flex"
          style={{ background: LEAF, color: "#0a0b0a", fontFamily: "var(--font-ui), sans-serif" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#0a0b0a]" aria-hidden="true" />
          {T({ en: "Find your blend", hi: "अपनी थाली पाएँ" })}
          <ArrowUpRight className="h-4 w-4" />
        </a>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="liquid-glass grid h-11 w-11 place-items-center rounded-full active:scale-[.97] md:hidden"
          style={{ backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)" }}
          aria-label={T({ en: "Open menu", hi: "मेन्यू खोलें" })}
          aria-expanded={menuOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

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
            en: "Nourishment, in your rhythm — consciously made.",
            hi: "पोषण, आपकी अपनी लय में — सोच-समझकर बनाया गया।",
          })}
        </p>
      </div>

      {/* --------------------------------------------------------- footer */}
      <div
        className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-4 px-5 pb-5 text-[0.68rem] sm:px-7 sm:pb-7"
        style={{ color: "rgb(255 255 255 / .62)", fontFamily: "var(--font-ui), sans-serif" }}
      >
        <span className="shrink-0">
          {T({ en: "Thoughtfully made for the everyday.", hi: "रोज़मर्रा के लिए, सोच के साथ बना।" })}
        </span>
        <span className="h-px flex-1" style={{ background: "rgb(255 255 255 / .18)" }} aria-hidden="true" />
        <span className="shrink-0 tabular-nums">
          01 <span style={{ color: LEAF }}>/</span> 01
        </span>
      </div>

      {/* ---------------------------------------------------- mobile menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[70] flex flex-col p-5 md:hidden"
          style={{ background: "#0a0b0a", minHeight: "100dvh" }}
        >
          <div className="flex items-start justify-between">
            <a href="#top" className="flex items-center gap-2.5 no-underline" aria-label="Poshan">
              <Kernel className="h-7 w-7 text-white" />
              <span
                className="text-[1.35rem] italic leading-none text-white"
                style={{ fontFamily: "var(--font-wordmark), Georgia, serif" }}
              >
                Poshan
              </span>
            </a>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="liquid-glass grid h-11 w-11 place-items-center rounded-full active:scale-[.97]"
              style={{ backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)" }}
              aria-label={T({ en: "Close menu", hi: "मेन्यू बंद करें" })}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="my-auto grid gap-6" aria-label="Mobile menu">
            {NAV.map((l, i) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="text-4xl text-white/90 no-underline"
                style={{
                  fontFamily: "var(--font-wordmark), Georgia, serif",
                  animation: calm
                    ? undefined
                    : `poshan-menu-in .5s cubic-bezier(.77,0,.18,1) ${100 + i * 60}ms both`,
                }}
              >
                {T(l)}
              </a>
            ))}
          </nav>

          <a
            href="#check"
            onClick={() => setMenuOpen(false)}
            className="flex items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-medium no-underline active:scale-[.97]"
            style={{ background: LEAF, color: "#0a0b0a", fontFamily: "var(--font-ui), sans-serif" }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#0a0b0a]" aria-hidden="true" />
            {T({ en: "Find your blend", hi: "अपनी थाली पाएँ" })}
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      )}
    </section>
  );
}
