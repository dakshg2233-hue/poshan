"use client";

import { useLang } from "./lang-provider";

const LINKS = [
  { href: "#check", en: "Check your BMI", hi: "बीएमआई जाँचें" },
  { href: "#plate", en: "Your plate", hi: "आपकी थाली" },
  { href: "#bios", en: "Biomarkers", hi: "बायोमार्कर" },
  { href: "#premium", en: "Poshan Home", hi: "पोषण घर" },
];

export function Nav() {
  const { lang, setLang, T } = useLang();

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        borderColor: "var(--line)",
        background: "color-mix(in srgb, var(--roti) 88%, transparent)",
        backdropFilter: "blur(12px)",
      }}
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

        <div
          className="lg:ml-0 ml-auto flex rounded-full overflow-hidden shrink-0"
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
    </header>
  );
}
