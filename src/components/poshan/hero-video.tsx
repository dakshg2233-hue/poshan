"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { useLang } from "./lang-provider";
import { GlassJar } from "./glass-jar";


const LINKS = [
  { href: "#check", en: "BMI check", hi: "बीएमआई जाँचें" },
  { href: "#plate", en: "Your plate", hi: "आपकी थाली" },
  { href: "#bios", en: "Biomarkers", hi: "बायोमार्कर" },
  { href: "#premium", en: "Plans", hi: "प्लान" },
];

/** Dark, editorial opener derived from the supplied Measured concept. */
export function HeroVideo() {
  const { T } = useLang();
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<SVGSVGElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const target = useRef({ x: -600, y: -600 });
  const smooth = useRef({ x: -600, y: -600 });
  const [menuOpen, setMenuOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const setPreference = () => setReducedMotion(query.matches);
    setPreference();
    query.addEventListener("change", setPreference);
    return () => query.removeEventListener("change", setPreference);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    const draw = () => {
      smooth.current.x += (target.current.x - smooth.current.x) * 0.1;
      smooth.current.y += (target.current.y - smooth.current.y) * 0.1;
      const { x, y } = smooth.current;
      const mask = `radial-gradient(260px circle at ${x}px ${y}px, #000 0%, #000 40%, rgb(0 0 0 / .75) 60%, rgb(0 0 0 / .4) 75%, rgb(0 0 0 / .12) 88%, transparent 100%)`;
      if (revealRef.current) {
        revealRef.current.style.webkitMaskImage = mask;
        revealRef.current.style.maskImage = mask;
      }
      if (gridRef.current && sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        gridRef.current.style.transform = `translate(${((x - rect.width / 2) / rect.width) * 16}px, ${((y - rect.height / 2) / rect.height) * 16}px)`;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  function moveSpotlight(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType === "touch" || reducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    target.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  return (
    <section id="hero" ref={sectionRef} onPointerMove={moveSpotlight} onPointerLeave={() => { target.current = { x: -600, y: -600 }; }} className="relative isolate h-[100svh] min-h-[620px] w-full overflow-hidden bg-[#0a0a0a] text-white">
      <svg ref={gridRef} className="absolute inset-[-32px] z-0 h-[calc(100%+64px)] w-[calc(100%+64px)] opacity-20 will-change-transform" aria-hidden="true">
        <defs><pattern id="poshan-grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#94a3b8" strokeWidth="0.6" /></pattern></defs>
        <rect width="100%" height="100%" fill="url(#poshan-grid)" />
      </svg>
      {/* Our own photograph, self-hosted. The hosted terrarium that used to sit
          on top of this was full of Studio Ghibli characters. */}
      <div className="absolute inset-0 z-10 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "linear-gradient(rgb(10 10 10 / .35), rgb(10 10 10 / .6)), url('/thali-hero.jpg')" }} />
      {/* The jar, built in-house: same vessel, food inside instead of figurines. */}
      <GlassJar className="pointer-events-none absolute z-[15] left-1/2 top-[16%] h-[42%] w-[86%] -translate-x-1/2 sm:left-auto sm:right-[4%] sm:top-1/2 sm:h-[62%] sm:w-[46%] sm:translate-x-0 sm:-translate-y-1/2" />
      <div className="absolute inset-0 z-10 bg-black/35" aria-hidden="true" />
      <h1 className="pointer-events-none absolute inset-x-3 top-20 z-20 text-center text-[clamp(4.5rem,19vw,16rem)] leading-[.78] tracking-[-.07em] text-white" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>POSHAN</h1>

      <header className="absolute inset-x-0 top-0 z-[60] flex items-center justify-between p-4 sm:p-6">
        <a href="#top" className="liquid-glass flex h-12 w-12 items-center justify-center rounded-full" aria-label="Poshan home"><svg viewBox="0 0 256 256" className="h-7 w-7" aria-hidden="true"><path fill="white" d="M256 64v64h-63.5L160 95l-32-31-32 31-32.5 33H64l64 64v64H64.5L32 223 0 192V64L64 0h128zm0 128v64h-63.5L160 223l-32-31v-64h64z" /></svg></a>
        <nav className="liquid-glass absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full p-1.5 md:flex" aria-label="Main">{LINKS.map((link) => <a key={link.href} href={link.href} className="rounded-full px-4 py-2 text-sm font-medium text-white/75 no-underline transition hover:bg-white/10 hover:text-white">{T(link)}</a>)}</nav>
        <a href="#check" className="liquid-glass hidden items-center gap-2 rounded-full px-5 py-3 text-sm font-medium text-white no-underline md:flex"><span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />{T({ en: "Start your check", hi: "अपना चेक शुरू करें" })}</a>
        <button type="button" onClick={() => setMenuOpen(true)} className="liquid-glass grid h-12 w-12 place-items-center rounded-full md:hidden" aria-label={T({ en: "Open menu", hi: "मेन्यू खोलें" })} aria-expanded={menuOpen}><Menu className="h-5 w-5" /></button>
      </header>

      <div className="absolute inset-x-0 bottom-0 z-40 p-5 pb-7 sm:p-10 sm:pb-12"><div className="max-w-xl"><p className="text-sm font-semibold uppercase tracking-[.22em] text-emerald-300">{T({ en: "Nutrition, measured for India", hi: "भारत के लिए मापा गया पोषण" })}</p><p className="mt-3 max-w-lg text-base leading-relaxed text-white/90 sm:text-lg">{T({ en: "Understand your body through Asian-Indian BMI ranges, then build a plate that feels like home.", hi: "एशियाई-भारतीय बीएमआई रेंज के साथ शरीर को समझें, फिर घर जैसी थाली बनाएँ।" })}</p><a href="#check" className="liquid-glass mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white no-underline transition hover:bg-white/10"><span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />{T({ en: "Check your BMI", hi: "बीएमआई जाँचें" })}</a></div></div>

      {menuOpen && <div className="fixed inset-0 z-[70] flex min-h-[100svh] flex-col bg-[#0a0a0a] p-5 text-white md:hidden"><button type="button" onClick={() => setMenuOpen(false)} className="liquid-glass ml-auto grid h-12 w-12 place-items-center rounded-full" aria-label={T({ en: "Close menu", hi: "मेन्यू बंद करें" })}><X className="h-5 w-5" /></button><nav className="my-auto grid gap-5 text-center" aria-label="Mobile menu">{LINKS.map((link, index) => <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="animate-[poshan-menu-in_.5s_cubic-bezier(.77,0,.18,1)_both] text-3xl font-medium text-white/90 no-underline" style={{ animationDelay: `${100 + index * 60}ms` }}>{T(link)}</a>)}</nav><a href="#check" onClick={() => setMenuOpen(false)} className="liquid-glass mx-auto flex items-center gap-2 rounded-full px-6 py-4 text-sm font-medium text-white no-underline"><span className="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />{T({ en: "Start your check", hi: "अपना चेक शुरू करें" })}</a></div>}
    </section>
  );
}
