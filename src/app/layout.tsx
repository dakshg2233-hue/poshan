import type { Metadata } from "next";
import { Anek_Devanagari, Mukta, IBM_Plex_Mono, Instrument_Serif, DM_Sans, Press_Start_2P } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/components/poshan/lang-provider";
import { heroPickScript } from "@/lib/hero-photos.server";
import { SITE_URL } from "@/lib/site";

/* One face covering Latin and Devanagari, so the two scripts share a single
   design intent instead of being bolted together.
 *
 * Was Tiro Devanagari Hindi: a calligraphic serif. It set the tone well but
 * read traditional, which is the single strongest "dated" signal on the page.
 * Anek keeps the one-face-two-scripts discipline and the Indian-type lineage
 * (Ek Type, same foundry as Mukta below) while being a contemporary variable
 * grotesque rather than a calligraphic serif. */
/* The hero wordmark only. Latin-only face, which is fine because it sets
   "POSHAN" and nothing in Devanagari. next/font self-hosts it at build time,
   so font-src stays 'self' and no Google request goes out at runtime. */
/* DM Sans for labels, navigation and supporting copy, per the Quiet Vitality
   spec. Latin-only, so it is exposed as its own variable rather than replacing
   Mukta: the Hindi half of this bilingual site still needs Devanagari, which
   DM Sans does not carry. Self-hosted by next/font, so font-src stays 'self'. */
const uiSans = DM_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});

const wordmark = Instrument_Serif({
  variable: "--font-wordmark",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const display = Anek_Devanagari({
  variable: "--font-display",
  /* 300 added for the Seed theme, whose signature is whisper-light display
     weights. Anek is variable and covers Devanagari, so the Hindi headings
     thin out with the Latin rather than falling back to a different face. */
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["devanagari", "latin"],
  display: "swap",
});

/* Mukta is by Ek Type, Mumbai: drawn for Indian screens. It carries the
   Devanagari that DM Sans does not, so it is the second face in the UI
   stack rather than a replacement for it.

   It used to declare `variable: "--font-ui"` — the same name DM Sans
   claims — and the <html> className applied `uiSans.variable` twice and
   this one never. So Mukta was downloaded on every page load, bound to
   nothing, and every Devanagari string on the site fell through to
   system-ui: the exact outcome the comment above says this face exists to
   prevent. Its own variable now, with globals.css listing both. */
const ui = Mukta({
  variable: "--font-ui-deva",
  weight: ["400", "600", "800"],
  subsets: ["devanagari", "latin"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-data",
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
});

/* The gamification layer's Minecraft skin only — scoped to .mc-ui, never
   the rest of the site's typography. Only ever short strings (badge
   names, streak counts): Press Start 2P is authentically 8-bit but
   illegible at body-text length, so it's reserved for headers/labels,
   never paragraphs, inside that one skin. */
const pixel = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const DESCRIPTION =
  "Poshan reads your Body Mass Index on Asian-Indian cutoffs, tracks the biomarkers that actually fail in India, and builds the thali you already eat.";

export const metadata: Metadata = {
  /* Every relative image in the metadata below — the OG card, the Twitter
     card, the icons — is resolved against this. Unset, Next falls back to
     http://localhost:3000 and says so at build time, which means a link
     shared from production carries a preview image pointing at the
     sharer's own machine. Same origin the sitemap and robots.txt use. */
  metadataBase: new URL(SITE_URL),
  title: "Poshan: पोषण · Know your body. Eat like home.",
  description: DESCRIPTION,
  applicationName: "Poshan",
  keywords: [
    "Indian diet", "BMI Asian Indian cutoff", "ICMR", "meal plan India",
    "vegetarian", "non-vegetarian", "biomarkers", "thali", "पोषण",
  ],
  authors: [{ name: "Daksh" }],
  /* Without these the link previews as a bare URL on WhatsApp, which is how
     most of this audience would ever share it. */
  openGraph: {
    type: "website",
    siteName: "Poshan",
    title: "Poshan: Know your body. Eat like home.",
    description: DESCRIPTION,
    locale: "en_IN",
    alternateLocale: "hi_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Poshan: Know your body. Eat like home.",
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

/**
 * Same kill-switch shape as GAMIFICATION_ENABLED: one env var, checked
 * server-side, reversible by unsetting it — no code change needed either
 * way. Applied on the server-rendered <html> tag (not via client JS) so
 * there is no flash of Sindoor before a client effect corrects it.
 * PaletteControl (dev-only) still reads whatever this sets as the current
 * palette and can preview others on top of it locally.
 */
const DEFAULT_PALETTE = process.env.NEXT_PUBLIC_DEFAULT_PALETTE;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-palette={DEFAULT_PALETTE || undefined}
      className={`${display.variable} ${wordmark.variable} ${uiSans.variable} ${ui.variable} ${mono.variable} ${pixel.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: heroPickScript() }} />
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
