import type { Metadata } from "next";
import Link from "next/link";

/**
 * 404, built to the supplied composition.
 *
 * Three substitutions, each because the spec's asset cannot be used here:
 *
 *  - The background video is on the CloudFront host this project removed from
 *    its CSP; media-src is 'self', so it would be blocked outright. The site's
 *    own thali photograph carries the background instead.
 *  - The font is served from static.figma.com, which font-src 'self' blocks,
 *    and its licence for redistribution is not established. IBM Plex Mono is
 *    already self-hosted here and is the same compact mono at 600.
 *  - The LGPSM mark and logotype belong to another brand. The Poshan kernel
 *    and wordmark take their place, at the same 233x40 frame and position.
 *
 * Everything else follows the spec: 100svh, no overlay on the background, the
 * centred column at 483px with 44px gaps, the gradient-clipped numerals, the
 * 425x1 rule, and the 640px mobile behaviour.
 */
export const metadata: Metadata = {
  title: "Page not found, Poshan",
  description:
    "That page does not exist. Head back to Poshan to check your BMI on Asian-Indian cutoffs and build a plate that fits how you actually eat.",
  robots: { index: false, follow: true },
};

/* The 404 gradient, exactly as specified. */
const NUMERAL_GRADIENT =
  "linear-gradient(247.3282658084845deg, rgb(255,255,255) 2.5334%, rgba(255,255,255,0.4) 93.612%)";

export default function NotFound() {
  return (
    <main
      className="relative w-full overflow-x-hidden"
      style={{ minHeight: "100svh", background: "#000" }}
    >
      {/* Background: lowest layer, no overlay of any kind over it. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 h-full w-full bg-cover bg-center"
        style={{ backgroundImage: "url('/thali-hero.jpg')" }}
      />

      {/* Header logo: centred, 233x40, white only, unanimated. */}
      <div
        aria-label="Poshan"
        className="absolute z-10 flex items-center not-found-logo"
        style={{ top: 80, left: "50%", transform: "translateX(-50%)", height: 40 }}
      >
        <svg viewBox="0 0 54 40" fill="none" aria-hidden="true" style={{ width: 54, height: 40 }}>
          <path d="M38 0H26V12H38V0Z" fill="white" />
          <path d="M54 12H38V28H54V12Z" fill="white" />
          <path d="M38 28H26V40H38V28Z" fill="white" />
          <path d="M26 12H16V22H26V12Z" fill="white" />
          <path d="M16 22H8V30H16V22Z" fill="white" />
          <path d="M16 2H6V12H16V2Z" fill="white" />
          <path d="M6 12H0V18H6V12Z" fill="white" />
        </svg>
        {/* 14px to the right of the mark, per the spec. */}
        <span
          className="text-white"
          style={{
            marginLeft: 14,
            fontFamily: "var(--font-wordmark), Georgia, serif",
            fontSize: 30,
            lineHeight: 1,
            fontStyle: "italic",
          }}
        >
          Poshan
        </span>
      </div>

      {/* Centred content: 483px column, 44px gaps. */}
      <div
        className="absolute z-10 flex flex-col items-center text-center not-found-group"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 483, gap: 44 }}
      >
        <h1
          className="not-found-numerals m-0"
          style={{
            fontFamily: "var(--font-data), ui-monospace, monospace",
            fontWeight: 600,
            fontSize: "295.751px",
            lineHeight: 1.1,
            letterSpacing: "-24.6459px",
            backgroundImage: NUMERAL_GRADIENT,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            /* Room for the baseline so the numerals are never cropped. */
            paddingBottom: "0.12em",
          }}
        >
          404
        </h1>

        <div
          aria-hidden="true"
          className="not-found-rule"
          style={{ width: 425, height: 1, background: "#fff" }}
        />

        <p
          className="not-found-message m-0 text-white"
          style={{
            fontFamily: "var(--font-data), ui-monospace, monospace",
            fontWeight: 600,
            fontSize: 24,
            lineHeight: 1.1,
            letterSpacing: "-2px",
          }}
        >
          The path may be broken, but the journey isn&apos;t. Let&apos;s get you back.
        </p>

        {/* Not in the spec, and deliberate: a 404 with no way out is a dead end,
            and this is the one page where a user is already lost. Styled as
            plain text so it adds no card, button or hover treatment. */}
        <Link
          href="/"
          className="text-white/70 underline underline-offset-4 transition-colors hover:text-white"
          style={{
            fontFamily: "var(--font-data), ui-monospace, monospace",
            fontWeight: 600,
            fontSize: 14,
            letterSpacing: "-0.5px",
          }}
        >
          Back to Poshan
        </Link>
      </div>
    </main>
  );
}
