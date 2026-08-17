"use client";

import { useEffect, useState } from "react";
import { useLang } from "./lang-provider";
import { LangHint } from "./lang-hint";
import { PALETTES as POSHAN_PALETTES } from "./palette-switcher";

const LINKS = [
  { href: "#check", en: "Check your BMI", hi: "बीएमआई जाँचें" },
  { href: "#plate", en: "Your plate", hi: "आपकी थाली" },
  { href: "#bios", en: "Biomarkers", hi: "बायोमार्कर" },
  { href: "#premium", en: "Poshan Home", hi: "पोषण घर" },
];

/* The real palettes, imported rather than restated.
 *
 * This picker previously carried its own four-name list and wrote
 * data-poshan-palette, which only two background glows ever read — so
 * choosing a palette here visibly did nothing. The site's actual theming
 * runs off data-palette with these nine, so the control now drives that. */
const PALETTES = POSHAN_PALETTES.map((p) => ({
  key: p.key,
  name: p.name,
  colors: p.swatch,
}));

/* Shared with palette-switcher.tsx so the two controls cannot disagree. */
const PALETTE_STORAGE_KEY = "poshan-palette";

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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [palette, setPalette] = useState("sindoor");

  function choosePalette(key: string) {
    setPalette(key);
    setPaletteOpen(false);
    /* setAttribute, not `dataset.x = …`: assigning to a property of a value
       from outside the component trips the React 19 immutability lint, while
       the equivalent method call does not. Sindoor is the bare :root, so it
       is the absence of the attribute — same convention as the other picker. */
    if (key === "sindoor") document.documentElement.removeAttribute("data-palette");
    else document.documentElement.setAttribute("data-palette", key);
    try {
      localStorage.setItem(PALETTE_STORAGE_KEY, key);
    } catch {
      /* Private mode or blocked storage: the palette still applies for this
         visit, it just will not be remembered. Not worth failing over. */
    }
  }

  /* Reflect whatever palette is already applied, so the tick in this menu
     matches the page after a refresh or a change made from the other picker. */
  useEffect(() => {
    /* Deferred: a setState in an effect body is a cascading render and the
       React 19 compiler lint rejects it. */
    const t = setTimeout(() => {
      const saved = localStorage.getItem(PALETTE_STORAGE_KEY);
      const active =
        document.documentElement.getAttribute("data-palette") ?? saved ?? "sindoor";
      if (PALETTES.some((p) => p.key === active)) setPalette(active);
    }, 0);
    return () => clearTimeout(t);
  }, []);

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
      className={`liquid-glass-chrome refract nav-cinematic z-50 border-b nav-slide${
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
      <div className="w-[min(1180px,100%-2.5rem)] mx-auto flex items-center gap-4 h-[66px]">
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

        <nav className="hidden lg:flex gap-1 ml-auto text-[0.9rem] font-semibold" aria-label="Main">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-2 no-underline transition-colors hover:bg-white/10"
              style={{ color: "#ffffffb8" }}
            >
              {T({ en: l.en, hi: l.hi })}
            </a>
          ))}
        </nav>

        {/* Hint sits immediately left of the toggle it is pointing at. */}
        <div className="lg:ml-0 ml-auto flex items-center gap-2 shrink-0 relative">
          <div className="hidden xl:block"><LangHint /></div>
          <div className="relative">
            <button type="button" onClick={() => setPaletteOpen((open) => !open)} aria-expanded={paletteOpen} aria-label="Choose colour palette" className="flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-white/[.06] px-2.5 cursor-pointer">
              {(PALETTES.find((item) => item.key === palette) ?? PALETTES[0]).colors.map((color) => <span key={color} className="h-3 w-3 rounded-full" style={{ background: color }} />)}
            </button>
            {paletteOpen && <div className="absolute right-0 top-11 w-44 rounded-2xl border border-white/15 bg-[#111411]/95 p-2 shadow-2xl backdrop-blur-xl">{PALETTES.map((item) => <button key={item.key} type="button" onClick={() => choosePalette(item.key)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold text-white/85 hover:bg-white/10 cursor-pointer" aria-pressed={palette === item.key}><span>{item.name}</span><span className="flex gap-1">{item.colors.map((color) => <span key={color} className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />)}</span></button>)}</div>}
          </div>
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
        </div>
      </div>
    </header>
  );
}
