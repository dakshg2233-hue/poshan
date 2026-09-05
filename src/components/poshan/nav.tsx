"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLang } from "./lang-provider";
import { TabBar, TabLink } from "./tabs";

/**
 * Whether the page has scrolled far enough for the bar to read as
 * "compact." A small hysteresis band (48px to engage, 24px to release)
 * rather than one threshold, so a page that has settled exactly on the
 * boundary does not flicker between states on sub-pixel scroll jitter.
 */
function useCompactNav() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setCompact((was) => (was ? window.scrollY > 24 : window.scrollY > 48));
        raf = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return compact;
}

/* The four anchor links that used to live here are gone. They pointed into a
   single continuous scroll; navigation is the tab strip now, and TABS in
   tabs.tsx is the one place the sections are named.

   Search, the language toggle and the account icon used to live here too,
   crowding the tab strip down to a sliver on a phone — "Check your BMI"
   truncated mid-word under the advice bar. They now live in <BottomBar>,
   fixed to the bottom in every view, so this bar only ever has to fit a
   logo and the tabs. */

export function Nav() {
  const { T } = useLang();
  const compact = useCompactNav();

  /* The bar used to stow itself while the video hero held the top of the
     frame, because the hero carries its own floating chrome and two bars
     stacked read as a mistake.
   *
   * It cannot stow any more. This bar now carries the tab strip, and the tabs
   * are the site's navigation: stowing them means a visitor landing on the
   * home tab sees no way to reach any other section, which is precisely the
   * problem tabs were meant to solve. A little duplication against the hero
   * is the smaller cost. */

  return (
    <header
      /* background and backdrop-filter come from .liquid-glass-chrome, not
         from here: an inline backdropFilter beats any stylesheet rule and
         would silently win over the refraction. */
      /* Positioning lives in .nav-slide, not in a Tailwind utility here:
         .liquid-glass-chrome sets position:relative and beats layered
         utilities. Fixed rather than sticky: sticky keeps its 66px in normal
         flow, which pushed the full-bleed hero down and left a band of page
         ground above the video. Only this page uses this component:
         /profile and /dashboard have their own <Navbar />. */
      className="liquid-glass-chrome refract nav-cinematic z-50 border-b nav-slide"
      style={{ borderColor: "var(--line)" }}
    >
      {/* Off-screen until focused, so a keyboard user's first Tab skips the nav. */}
      <a
        href="#top"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-full focus:font-extrabold focus:text-[0.88rem] focus:no-underline"
        style={{ background: "var(--ink)", color: "var(--roti)" }}
      >
        {T({ en: "Skip to content", hi: "सामग्री पर जाएँ" })}
      </a>
      <div className="w-[min(1180px,100%-2.5rem)] mx-auto flex items-center gap-4 h-[52px]">
        {/* The one persistent Poshan mark — everywhere else on the site that
            used to draw its own logo (the old cinematic hero's header, its
            mobile menu) drew a second one instead. This is the only one now. */}
        <TabLink to="dashboard" className="flex items-center gap-2.5 no-underline shrink-0" aria-label="Poshan home">
          {/* transform, not width/height: the mark scales down rather than
              the header shrinking, which would force a layout pass on every
              scroll frame. data-compact carries the state; the transition
              lives in CSS so a hover on this same link doesn't fight it. */}
          <Image
            src="/brand/logo-mark.png"
            alt=""
            aria-hidden
            width={328}
            height={390}
            priority
            data-compact={compact}
            className="nav-logo-mark w-[24px] h-auto shrink-0"
          />
          <span
            className="hidden sm:inline text-[1.28rem] leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            पोषण <span style={{ color: "var(--kesar)" }}>Poshan</span>
          </span>
        </TabLink>

        {/* Scrolls sideways rather than hiding below lg. The whole bar is
            now just this: with search, language and account gone, the tab
            strip gets the full remaining width instead of a leftover sliver. */}
        <nav
          className="flex-1 min-w-0 overflow-x-auto no-scrollbar"
          aria-label="Main"
        >
          <TabBar className="nav-tabs w-max" />
        </nav>
      </div>
    </header>
  );
}
