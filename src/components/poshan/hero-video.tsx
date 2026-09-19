"use client";

import { useLang } from "./lang-provider";
import { DEFAULT_HERO_PHOTO } from "@/lib/hero-photos";

/**
 * POSHAN, Quiet Vitality hero.
 *
 * Built to the supplied spec: 100dvh, dark botanical still-life, monumental
 * Instrument Serif wordmark, frosted glass navigation, and a pointer-following
 * The spotlight that used to uncover a second still-life is gone. It never
 * uncovered anything: STILL and MOTION were the same file, so the mask
 * revealed the identical photograph and all it produced was a bright disc
 * chasing the pointer across the hero. It also ran a requestAnimationFrame
 * loop that re-encoded a canvas to a data URL on every frame, for that.
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



/** Poshan Leaf: the only action and status colour in this design. */
const LEAF = "#8FBF72";

export function HeroVideo() {
  const { T } = useLang();

  return (
    <section
      id="hero"
      className="relative isolate w-full overflow-hidden text-white"
      style={{ height: "100dvh", minHeight: 600, background: "#0a0b0a" }}
    >
      {/* 1, the still-life */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `var(--hero-photo, url('${DEFAULT_HERO_PHOTO}'))` }}
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
