import type { Metadata } from "next";
import { Anek_Devanagari, Mukta, IBM_Plex_Mono, Instrument_Serif, DM_Sans } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/components/poshan/lang-provider";
import { AdviceBar } from "@/components/poshan/advice-bar";

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

/* Mukta is by Ek Type, Mumbai: drawn for Indian screens. */
const ui = Mukta({
  variable: "--font-ui",
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

const DESCRIPTION =
  "Poshan reads your Body Mass Index on Asian-Indian cutoffs, tracks the biomarkers that actually fail in India, and builds the thali you already eat.";

export const metadata: Metadata = {
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${wordmark.variable} ${uiSans.variable} ${uiSans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LangProvider>
          <AdviceBar />
          {children}
        </LangProvider>
      </body>
    </html>
  );
}
