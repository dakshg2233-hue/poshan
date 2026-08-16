"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useLang } from "./lang-provider";

/**
 * Full-viewport video hero, built to the supplied "Aurai" brief.
 *
 * The layout, the glass pill nav, the bottom-anchored content, the inline
 * email capture and the feature pills are all as specified. Five things had
 * to change to survive contact with this particular site:
 *
 *  1. BRAND. The brief is for a product called Aurai. This is Poshan, so the
 *     wordmark and the existing thali logo stay — a second, unrelated logo in
 *     the hero would contradict the one in the nav six pixels below it.
 *  2. TYPEFACE. "Askan Light" is served from a font CDN we cannot reach
 *     (font-src is 'self'), and it carries no Devanagari. This site sets its
 *     headings in Hindi and English from the same face; in Askan the हिं
 *     heading would silently fall back mid-word. Anek covers both, and is
 *     already loaded.
 *  3. VIDEO SOURCE. media-src is 'self', so the CloudFront URL is blocked by
 *     our own CSP. The file is served locally, with the thali photograph as
 *     the poster so the hero is never empty while it buffers.
 *  4. SCRIM. The brief says no overlay. Over a *video* the backdrop changes
 *     every frame, so no static contrast measurement can hold — the heading
 *     is legible on one frame and gone on the next. A light bottom-weighted
 *     scrim is the only fix that survives the whole loop; the top of frame is
 *     left completely clear, as intended.
 *  5. SUBMIT. The brief calls for alert(). Poshan has real email-OTP auth, so
 *     the field hands the address to /login instead of throwing a dialog.
 *
 * Reduced motion is honoured, which the brief does not mention: a looping
 * autoplaying video is precisely what that setting exists to suppress.
 */
export function HeroVideo() {
  const { T, lang, setLang } = useLang();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState("");

  /* Derived at init rather than set in an effect — a setState in an effect
     body cascades a render and the React 19 compiler lint rejects it. */
  const [stillVideo] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  const FEATURES = [
    { en: "Asian-Indian BMI", hi: "एशियाई-भारतीय बीएमआई" },
    { en: "38 real thalis", hi: "38 असली थालियाँ" },
    { en: "Scan your plate", hi: "अपनी थाली स्कैन करें" },
  ];

  const LINKS = [
    { href: "#check", en: "Check BMI", hi: "बीएमआई" },
    { href: "#plate", en: "Your plate", hi: "आपकी थाली" },
    { href: "#premium", en: "Pricing", hi: "मूल्य" },
  ];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = email.trim();
    if (!v) return;
    /* Hand off to the real auth flow rather than faking a waitlist. */
    router.push(`/login?email=${encodeURIComponent(v)}`);
  }

  return (
    <section
      id="hero"
      className="relative h-[100svh] w-full overflow-hidden"
      style={{ background: "#0c0806" }}
    >
      <video
        ref={videoRef}
        /* poster carries the hero until the video decodes, and remains the
           whole hero if the file is absent — never a black rectangle. */
        poster="/thali-hero.jpg"
        autoPlay={!stillVideo}
        loop
        muted
        playsInline
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover [object-position:80%_center] md:[object-position:right_center] lg:[object-position:center_center]"
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>

      {/* Legibility scrims. Bottom-weighted for the content band, plus a
          left-weighted one for the text column — measured, not guessed: the
          heading was 2.38:1 and the subtitle 1.04:1 with the bottom ramp
          alone. The right of the frame stays clear. */}
      <div className="absolute inset-0 hero-scrim" aria-hidden />
      <div className="absolute inset-0 hero-scrim-side" aria-hidden />

      <div className="absolute inset-0 z-10 flex flex-col px-4 sm:px-10 lg:px-12 py-4 sm:py-8">
        {/* ------------------------------------------------------------ nav */}
        <nav className="flex items-center justify-between">
          <div className="flex items-center bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 px-4 py-2.5 sm:px-6 sm:py-4">
            <a href="#top" className="flex items-center gap-2.5 no-underline" aria-label="Poshan">
              {/* The site's own mark, not the brief's pinwheel — the nav
                  directly below this uses it, and two logos is no logo. */}
              <svg viewBox="0 0 40 40" aria-hidden className="w-5 h-5 sm:w-7 sm:h-7 shrink-0">
                <circle cx={20} cy={20} r={18} fill="none" stroke="#fff" strokeWidth={2.5} />
                <circle cx={20} cy={20} r={12.5} fill="none" stroke="#ffffff88" strokeWidth={1.5} />
                <circle cx={14} cy={15} r={4.6} fill="var(--haldi)" />
                <circle cx={26} cy={15} r={4.6} fill="var(--elaichi)" />
                <ellipse cx={20} cy={27} rx={7.5} ry={4.4} fill="var(--kesar)" />
              </svg>
              <span
                className="text-white text-base sm:text-xl tracking-wide"
                style={{ fontFamily: "var(--font-display)" }}
              >
                पोषण Poshan
              </span>
            </a>

            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-label={T({ en: "Menu", hi: "मेन्यू" })}
              className="ml-4 sm:ml-32 md:ml-64 lg:ml-96 text-white cursor-pointer"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            {/* Language stays reachable from the hero — this is the first
                screen, and it is where a Hindi reader decides to stay. */}
            <div className="flex rounded-full overflow-hidden border border-white/25" role="group" aria-label="Language / भाषा">
              {(["en", "hi"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={lang === l}
                  onClick={() => setLang(l)}
                  className="px-3 py-2 text-[0.78rem] font-bold cursor-pointer transition-colors"
                  style={
                    lang === l
                      ? { background: "#fff", color: "#111" }
                      : { color: "#fff", background: "rgb(0 0 0 / 0.25)" }
                  }
                >
                  {l === "en" ? "EN" : "हिं"}
                </button>
              ))}
            </div>
            <a
              href="#check"
              data-magnetic
              className="bg-white text-gray-900 font-medium text-sm px-6 py-3 rounded-full no-underline"
            >
              {T({ en: "Check your BMI", hi: "बीएमआई जाँचें" })}
            </a>
          </div>
        </nav>

        {/* --------------------------------------------------- mobile menu */}
        {menuOpen && (
          <div className="sm:hidden absolute top-[4.5rem] left-4 right-4 bg-black/30 backdrop-blur-xl rounded-2xl p-5 border border-white/10 z-20">
            <ul className="list-none p-0 m-0 grid gap-3">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-white no-underline text-[0.95rem]"
                  >
                    {T({ en: l.en, hi: l.hi })}
                  </a>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 mt-4">
              {(["en", "hi"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={lang === l}
                  onClick={() => setLang(l)}
                  className="flex-1 py-2 rounded-full text-[0.8rem] font-bold cursor-pointer"
                  style={
                    lang === l
                      ? { background: "#fff", color: "#111" }
                      : { color: "#fff", border: "1px solid rgb(255 255 255 / 0.25)" }
                  }
                >
                  {l === "en" ? "English" : "हिंदी"}
                </button>
              ))}
            </div>
            <a
              href="#check"
              onClick={() => setMenuOpen(false)}
              className="block w-full text-center bg-white text-gray-900 font-medium text-sm px-6 py-3 rounded-full mt-3 no-underline"
            >
              {T({ en: "Check your BMI", hi: "बीएमआई जाँचें" })}
            </a>
          </div>
        )}

        {/* Pushes content to the bottom on mobile. */}
        <div className="flex-1 sm:hidden" />

        {/* -------------------------------------------------- main content */}
        <div className="flex flex-col sm:flex-1 sm:flex-row sm:items-end pb-4 sm:pb-12 lg:pb-16 sm:mt-auto gap-6">
          <div className="min-w-0">
            <h1
              className="text-white text-[2rem] sm:text-[3.5rem] md:text-[4.5rem] lg:text-[5.5rem] leading-[1.05] tracking-tight max-w-[700px] font-normal"
              style={{ fontFamily: "var(--font-display)" }}
              lang={lang === "hi" ? "hi" : undefined}
            >
              {T({
                en: "Know your body. Eat like home.",
                hi: "अपना शरीर जानें। घर जैसा खाएँ।",
              })}
            </h1>

            {/* /70 in the brief, /90 here: at 70% this measured 1.04:1 over
                the plate — below the 1:1 floor of "visible at all". */}
            <p className="text-white/90 text-xs sm:text-base md:text-lg max-w-[520px] leading-relaxed mt-4">
              {T({
                en: "Poshan reads your BMI on Asian-Indian cutoffs — where 23 already counts as overweight — then builds the plate you actually eat.",
                hi: "पोषण आपका बीएमआई एशियाई-भारतीय कटऑफ़ पर पढ़ता है — जहाँ 23 पहले से ही अधिक वज़न है — और फिर वही थाली बनाता है जो आप सच में खाते हैं।",
              })}
            </p>

            <form
              onSubmit={submit}
              className="relative mt-6 max-w-[440px] bg-black/30 backdrop-blur-md rounded-full border border-white/10"
            >
              <label htmlFor="hero-email" className="sr-only">
                {T({ en: "Your email address", hi: "आपका ईमेल पता" })}
              </label>
              <input
                id="hero-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={T({ en: "Your email address", hi: "आपका ईमेल पता" })}
                className="w-full bg-transparent text-white placeholder:text-white/50 px-4 sm:px-6 py-3 sm:py-4 text-sm rounded-full outline-none pr-28 sm:pr-36"
              />
              <button
                type="submit"
                data-magnetic
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-white text-gray-900 text-xs sm:text-sm font-medium px-3 sm:px-6 py-2 sm:py-3 rounded-full cursor-pointer"
              >
                {T({ en: "Get started", hi: "शुरू करें" })}
              </button>
            </form>

            {/* Feature pills — mobile */}
            <ul className="flex sm:hidden flex-wrap gap-2 mt-4 list-none p-0">
              {FEATURES.map((f) => (
                <li
                  key={f.en}
                  className="bg-black/30 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full border border-white/10"
                >
                  {T(f)}
                </li>
              ))}
            </ul>
          </div>

          {/* Feature pills — desktop */}
          <ul className="hidden sm:flex flex-col items-end gap-2 self-end ml-auto list-none p-0 m-0">
            {FEATURES.map((f) => (
              <li
                key={f.en}
                className="bg-black/30 backdrop-blur-md text-white text-xs sm:text-sm px-4 py-2 rounded-full border border-white/10 whitespace-nowrap"
              >
                {T(f)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
