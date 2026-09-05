"use client";

import { useLang } from "./lang-provider";
import { HeroVideo } from "./hero-video";
import { AdviceBar } from "./advice-bar";
import { TabLink } from "./tabs";
import type { TabKey } from "./tabs";

/**
 * The site's actual home — what the logo now points at.
 *
 * HeroVideo used to sit inside "Check your BMI", carrying its own header
 * (a second logo, a second nav, "Find your blend") that duplicated the real
 * one. It's purely the cinematic opener now, moved here, with a real utility
 * row underneath instead of chrome floating over the footage: today's advice
 * and a set of shortcuts into the tools "Check your BMI" itself is one of.
 */
const LINKS: { to: TabKey; target?: string; title: { en: string; hi: string }; desc: { en: string; hi: string } }[] = [
  {
    to: "home",
    target: "check",
    title: { en: "Check your BMI", hi: "बीएमआई जाँचें" },
    desc: { en: "Asian-Indian cutoffs, not the Western ones.", hi: "एशियाई-भारतीय मानक, पश्चिमी नहीं।" },
  },
  {
    to: "yourmeals",
    title: { en: "Your Meals", hi: "आपके भोजन" },
    desc: { en: "Build today's plate from 1,600+ dishes, tracked live against your limits.", hi: "1,600+ भोजन से आज की थाली बनाएँ, आपकी सीमा के अनुसार ट्रैक।" },
  },
  {
    to: "scanner",
    title: { en: "Food Scanner", hi: "भोजन स्कैनर" },
    desc: { en: "Point a camera at a plate, or build your plan by hand.", hi: "थाली पर कैमरा रखें, या हाथ से अपना प्लान बनाएँ।" },
  },
  {
    to: "health",
    title: { en: "Biomarkers", hi: "बायोमार्कर" },
    desc: { en: "Track the labs that actually fail in India.", hi: "वे बायोमार्कर जो भारत में असल में बिगड़ते हैं।" },
  },
  {
    to: "premium",
    title: { en: "Poshan+", hi: "पोषण+" },
    desc: { en: "A plan rebuilt for your body, not a band.", hi: "आपके शरीर के लिए बना प्लान, किसी वर्ग के लिए नहीं।" },
  },
];

export function Dashboard() {
  const { T } = useLang();

  return (
    <div id="dashboard">
      {/* Today's advice sits first, directly under the (always-topmost) nav
          — not floating over the hero footage as chrome, and not buried
          below it either. */}
      <div className="w-[min(1180px,100%-2.5rem)] mx-auto pt-5">
        <AdviceBar />
      </div>

      <HeroVideo />

      <section className="py-14 md:py-20">
        <div className="w-[min(1180px,100%-2.5rem)] mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
            <h2
              className="text-[clamp(1.5rem,3.4vw,2.1rem)] leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {T({ en: "Find your blend", hi: "अपनी थाली पाएँ" })}
            </h2>
          </div>

          <ul className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] list-none p-0 m-0">
            {LINKS.map((l) => (
              <li key={l.to + (l.target ?? "")}>
                <TabLink
                  to={l.to}
                  target={l.target}
                  className="surface-card lift rounded-2xl p-5 flex flex-col gap-1.5 h-full no-underline"
                >
                  <span
                    className="text-[1.1rem]"
                    style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}
                  >
                    {T(l.title)}
                  </span>
                  <span className="text-[0.85rem]" style={{ color: "var(--ink-soft)" }}>
                    {T(l.desc)}
                  </span>
                </TabLink>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
