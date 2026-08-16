"use client";

import { useEffect, useState } from "react";
import { useLang } from "./lang-provider";
import { LangHint } from "./lang-hint";

const LINKS = [
  { href: "#check", en: "Check your BMI", hi: "बीएमआई जाँचें" },
  { href: "#plate", en: "Your plate", hi: "आपकी थाली" },
  { href: "#bios", en: "Biomarkers", hi: "बायोमार्कर" },
  { href: "#premium", en: "Poshan Home", hi: "पोषण घर" },
];

export function Nav() {
  const { lang, setLang, T } = useLang();

  /* The video hero carries its own floating glass chrome, so this bar would
     be a second nav stacked on the first. Stand down while the hero holds the
     top of the frame, and return the moment it is scrolled past. Pages with
     no #hero (login, profile, dashboard) never observe anything and so keep
     the bar visible always, which is the correct default. */
  /* Starts visible. If anything below fails to run, the bar simply stays
     where it is — the failure mode of a permanently hidden nav is far worse
     than a redundant one, so the safe state is the default. */
  const [overHero, setOverHero] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      /* Stow while the hero still covers where the bar would sit. Measured
         against the bar's own height, so it hands over exactly as the hero
         clears rather than at some arbitrary scroll offset. */
      setOverHero(hero.getBoundingClientRect().bottom > 66);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    /* Deferred rather than called inline: a setState in an effect body is a
       cascading render and the React 19 compiler lint rejects it. */
    const initial = setTimeout(update, 0);
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll, { passive: true });
    return () => {
      clearTimeout(initial);
      if (raf) cancelAnimationFrame(raf);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <header
      /* background and backdrop-filter come from .liquid-glass-chrome, not
         from here — an inline backdropFilter beats any stylesheet rule and
         would silently win over the refraction. */
      /* Positioning lives in .nav-slide, not in a Tailwind utility here —
         .liquid-glass-chrome sets position:relative and beats layered
         utilities. Fixed rather than sticky: sticky keeps its 66px in normal
         flow, which pushed the full-bleed hero down and left a band of page
         ground above the video. Only this page uses this component —
         /profile and /dashboard have their own <Navbar />. */
      className={`liquid-glass-chrome refract z-50 border-b nav-slide${
        overHero ? " nav-stowed" : ""
      }`}
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
      <div className="w-[min(1180px,100%-2.5rem)] mx-auto flex items-center gap-6 h-[66px]">
        <a href="#top" className="flex items-center gap-2.5 no-underline shrink-0" aria-label="Poshan home">
          <svg viewBox="0 0 40 40" aria-hidden className="w-[30px] h-[30px] shrink-0">
            <circle cx={20} cy={20} r={18} fill="none" stroke="var(--steel)" strokeWidth={2.5} />
            <circle cx={20} cy={20} r={12.5} fill="none" stroke="var(--steel-lo)" strokeWidth={1.5} />
            <circle cx={14} cy={15} r={4.6} fill="var(--haldi)" />
            <circle cx={26} cy={15} r={4.6} fill="var(--elaichi)" />
            <ellipse cx={20} cy={27} rx={7.5} ry={4.4} fill="var(--kesar)" />
          </svg>
          <span className="text-[1.45rem] leading-none" style={{ fontFamily: "var(--font-display)" }}>
            पोषण <span style={{ color: "var(--kesar)" }}>Poshan</span>
          </span>
        </a>

        <nav className="hidden lg:flex gap-7 ml-auto text-[0.9rem] font-semibold" aria-label="Main">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="no-underline transition-colors hover:opacity-70"
              style={{ color: "var(--ink-soft)" }}
            >
              {T({ en: l.en, hi: l.hi })}
            </a>
          ))}
        </nav>

        {/* Hint sits immediately left of the toggle it is pointing at. */}
        <div className="lg:ml-0 ml-auto flex items-center gap-2 shrink-0">
          <LangHint />
          <div
            className="flex rounded-full overflow-hidden"
            style={{ border: "1.5px solid var(--ink)" }}
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
                  ? { background: "var(--ink)", color: "var(--roti)" }
                  : { color: "var(--ink)" }
              }
            >
              {l === "en" ? "EN" : "हिं"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
