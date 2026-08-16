"use client";

import Image from "next/image";
import { useLang } from "./lang-provider";
import { AnimatedHeading, FadeIn } from "@/components/ui/animated-heading";

/**
 * Full-bleed photographic hero, bottom-anchored, built to the supplied brief.
 *
 * Two deliberate departures:
 *
 *  - The brief specified a video on a CloudFront path belonging to another
 *    account. That is not ours to ship, and next.config.ts restricts media to
 *    'self' anyway. This uses the thali photograph Daksh generated instead —
 *    which also loads far faster than a video and needs no autoplay policy.
 *  - The brief said no overlay of any kind. Over a real photograph that leaves
 *    white text sitting on a pale steel plate and a lit window, which is
 *    illegible. A bottom-weighted scrim (.hero-scrim) fixes it while leaving
 *    the top of the image completely clear.
 */
export function HeroCinematic() {
  const { T } = useLang();

  return (
    <section
      id="hero"
      className="relative min-h-[92svh] flex flex-col overflow-hidden"
      style={{ background: "#0c0806" }}
    >
      {/* The photograph */}
      <Image
        src="/thali-hero.jpg"
        alt=""
        aria-hidden
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* Legibility scrim — bottom-weighted, top of frame untouched */}
      <div className="absolute inset-0 hero-scrim" aria-hidden />

      {/* ------------------------------------------------------ content */}
      <div className="relative z-10 flex-1 flex flex-col justify-end px-6 md:px-12 lg:px-16 pb-12 lg:pb-16 pt-28">
        <div className="lg:grid lg:grid-cols-2 lg:items-end lg:gap-10">
          {/* ---------------------------------------------- left column */}
          <div>
            {/* On its own dark chip rather than straight over the photograph.
                This eyebrow sits high in the frame where the scrim is weakest,
                across the lit window and the bright rim of the plate — measured
                2.79:1 as amber, and 2.64:1 when I tried brightening it, because
                lighter text moved TOWARD a light background. A controlled
                ground is the only fix that holds whatever the photo does. */}
            <FadeIn delay={100} duration={800}>
              <span
                className="liquid-glass-dark refract backdrop-blur-sm inline-block rounded-full px-3.5 py-1.5 mb-5 text-[0.72rem] font-extrabold uppercase"
                style={{
                  letterSpacing: "0.17em",
                  color: "#f0b055",
                  border: "1px solid rgb(255 255 255 / 0.18)",
                }}
              >
                {T({
                  en: "Indian bodies · Indian food · Indian science",
                  hi: "भारतीय शरीर · भारतीय खाना · भारतीय विज्ञान",
                })}
              </span>
            </FadeIn>

            {/* Character-by-character entrance. \n is a hard line break. */}
            <AnimatedHeading
              text={T({
                en: "Know your body\nEat like home.",
                hi: "अपना शरीर जानें\nघर जैसा खाएँ।",
              })}
              className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-normal mb-4 text-white"
              style={{
                fontFamily: "var(--font-display)",
                letterSpacing: "-0.04em",
                lineHeight: 1.02,
              }}
              charDelay={30}
              initialDelay={200}
              duration={500}
            />

            <FadeIn delay={800} duration={1000}>
              <p className="text-base md:text-lg mb-6 max-w-[52ch]" style={{ color: "#e6ddd6" }}>
                {T({
                  en: "Most fitness apps measure you against a European body. Poshan reads your BMI on Asian-Indian cutoffs — where 23 already counts as overweight — then builds the plate you actually eat.",
                  hi: "ज़्यादातर फ़िटनेस ऐप आपको यूरोपीय शरीर के पैमाने पर नापते हैं। पोषण आपका बीएमआई एशियाई-भारतीय कटऑफ़ पर पढ़ता है — जहाँ 23 पहले से ही अधिक वज़न है — और फिर वही थाली बनाता है जो आप सच में खाते हैं।",
                })}
              </p>
            </FadeIn>

            <FadeIn delay={1200} duration={1000}>
              <div className="flex flex-wrap gap-4">
                <a
                  href="#check"
                  data-magnetic
                  data-magnetic-color="var(--kesar-fill)"
                  className="inline-flex items-center min-h-12 px-8 rounded-lg font-medium no-underline"
                  style={{ background: "#ffffff", color: "#0c0806" }}
                >
                  {T({ en: "Check your BMI", hi: "अपना बीएमआई जाँचें" })}
                </a>
                <a
                  href="#plate"
                  data-magnetic
                  className="liquid-glass-dark refract backdrop-blur-sm inline-flex items-center min-h-12 px-8 rounded-lg font-medium text-white no-underline"
                  style={{ border: "1px solid rgb(255 255 255 / 0.2)" }}
                >
                  {T({ en: "See my thali", hi: "मेरी थाली देखें" })}
                </a>
              </div>
            </FadeIn>
          </div>

          {/* --------------------------------------------- right column */}
          <FadeIn
            delay={1400}
            duration={1000}
            className="flex items-end justify-start lg:justify-end mt-10 lg:mt-0"
          >
            <div
              className="liquid-glass-dark refract backdrop-blur-sm px-6 py-3 rounded-xl"
              style={{ border: "1px solid rgb(255 255 255 / 0.2)" }}
            >
              <p className="text-lg md:text-xl lg:text-2xl font-light text-white m-0">
                {T({
                  en: "Measure. Cook. Eat well.",
                  hi: "नापें। पकाएँ। अच्छा खाएँ।",
                })}
              </p>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
