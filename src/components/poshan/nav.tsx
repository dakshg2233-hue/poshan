"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLang } from "./lang-provider";
import { LangHint } from "./lang-hint";
import { TabBar } from "./tabs";
import { SiteSearch } from "./site-search";

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
   tabs.tsx is the one place the sections are named. */

export function Nav({ signedIn = false }: { signedIn?: boolean }) {
  const { lang, setLang, T } = useLang();
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
      <div className="w-[min(1180px,100%-2.5rem)] mx-auto flex items-center gap-4 h-[66px]">
        <a href="#top" className="flex items-center gap-2.5 no-underline shrink-0" aria-label="Poshan home">
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
            className="nav-logo-mark w-[26px] h-auto shrink-0"
          />
          {/* The wordmark goes below xl. Five tabs, a search and a language
              toggle do not fit beside it, and the tab strip is the thing that
              has to survive: the mark alone still identifies the site and
              still links home. */}
          <span
            className="hidden xl:inline text-[1.45rem] leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            पोषण <span style={{ color: "var(--kesar)" }}>Poshan</span>
          </span>
        </a>

        {/* Scrolls sideways rather than hiding below lg. The links this
            replaced were desktop-only, which left small screens with no
            navigation at all once the sections stopped being one scroll. */}
        <nav
          className="flex-1 min-w-0 overflow-x-auto no-scrollbar"
          aria-label="Main"
        >
          <TabBar className="nav-tabs w-max" />
        </nav>

        <SiteSearch />

        {/* Hint sits immediately left of the toggle it is pointing at. */}
        <div className="lg:ml-0 ml-auto flex items-center gap-2 shrink-0 relative">
          <div className="hidden xl:block"><LangHint /></div>
          <div
            className="flex rounded-full overflow-hidden"
            style={{ border: "1px solid rgb(255 255 255 / .28)" }}
            role="group"
            aria-label="Language / भाषा"
          >
          {(["en", "hi"] as const).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
              className="px-3 py-1.5 text-[0.82rem] font-extrabold tracking-wider transition-colors cursor-pointer"
              style={
                lang === l
                      ? { background: "#fff", color: "#111" }
                      : { color: "#fff" }
              }
            >
              {l === "en" ? "EN" : "हिं"}
              </button>
            ))}
          </div>
          {/* Account, on the main site's own nav: signed in goes straight to
              the profile, signed out to sign-in. Before this the only path
              to /profile ran through the dashboard's own bar, so a visitor
              browsing the marketing site had no way to reach their account
              at all. Icon-only — the bar already scrolls sideways under
              five tabs, search and the language toggle. */}
          <a
            href={signedIn ? "/profile" : "/login"}
            aria-label={
              signedIn
                ? T({ en: "Your account", hi: "आपका खाता" })
                : T({ en: "Sign in", hi: "साइन इन करें" })
            }
            className="flex h-9 w-9 items-center justify-center rounded-full shrink-0 no-underline"
            style={{ color: "#fff", border: "1px solid rgb(255 255 255 / .28)" }}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="8" r="4.5" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}
