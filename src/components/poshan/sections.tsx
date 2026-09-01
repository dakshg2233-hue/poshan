"use client";

import { useLang, useReveal } from "./lang-provider";
import { DishArt } from "./dish-art";
import { TabLink } from "./tabs";
import {
  BANDS,
  DISHES,
  BIOMARKERS,
  NUTRIENT,
  isDropped,
  type Band,
  type Plan,
} from "@/lib/poshan-data";

const SHELL = "w-[min(1180px,100%-2.5rem)] mx-auto";

/* ------------------------------------------------------------------ bands */

export function Bands() {
  const { T } = useLang();
  const reveal = useReveal<HTMLDivElement>();

  return (
    <section className="py-14 md:py-24" style={{ background: "var(--roti-2)" }}>
      <div className={SHELL}>
        <div ref={reveal} className="rise">
          <div className="max-w-[56ch] mb-11">
            <div className="shiro w-[72px] mb-5" />
            <h2
              className="text-[clamp(1.9rem,4.4vw,2.85rem)] leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {T({ en: "23 is not the new 25. It never was.", hi: "23 कोई नया 25 नहीं है। कभी था ही नहीं।" })}
            </h2>
            <p className="mt-4 text-[1.02rem]" style={{ color: "var(--ink-soft)" }}>
              {T({
                en: "Indians carry more visceral fat and develop insulin resistance at a lower body mass than Europeans. The Indian Council of Medical Research and the World Health Organization Asia-Pacific thresholds account for that. Most apps still do not.",
                hi: "भारतीयों में यूरोपीय लोगों की तुलना में कम वज़न पर ही ज़्यादा विसरल फ़ैट और इंसुलिन रेज़िस्टेंस पनपता है। भारतीय आयुर्विज्ञान अनुसंधान परिषद और विश्व स्वास्थ्य संगठन एशिया-पैसिफ़िक मानक यही मानते हैं। ज़्यादातर ऐप आज भी नहीं।",
              })}
            </p>
          </div>

          <div
            className="surface-card rounded-2xl p-6 overflow-x-auto"
          >
            <div className="grid grid-cols-4 min-w-[520px]">
              {BANDS.map((b) => (
                <div key={b.key} className="px-4 py-3.5" style={{ borderLeft: `3px solid ${b.color}` }}>
                  <div
                    className="text-[1.02rem] tabular-nums"
                    style={{ fontFamily: "var(--font-data)", color: b.ink, fontWeight: 500 }}
                  >
                    {b.range}
                  </div>
                  <div className="text-[1.1rem] mt-1" style={{ fontFamily: "var(--font-display)" }} lang="hi">
                    {b.name.hi}
                  </div>
                  <div
                    className="text-[0.72rem] uppercase font-semibold"
                    style={{ letterSpacing: "0.1em", color: "var(--ink-soft)" }}
                  >
                    {b.name.en}
                  </div>
                </div>
              ))}
            </div>
            <p
              className="mt-5 pt-4 text-[0.85rem] min-w-[520px]"
              style={{ borderTop: "1px solid var(--line)", color: "var(--ink-soft)" }}
            >
              {T({
                en: "A Western calculator calls a Body Mass Index of 24 perfectly normal. On Asian-Indian cutoffs it is overweight, and that gap is where a decade of undiagnosed pre-diabetes hides.",
                hi: "कोई पश्चिमी कैलकुलेटर 24 बॉडी मास इंडेक्स को बिल्कुल सामान्य बताएगा। एशियाई-भारतीय मानकों पर वह अधिक वज़न है: और इसी अंतर में एक दशक की बिना पहचानी प्री-डायबिटीज़ छिपी रहती है।",
              })}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ meals */

export function Meals({ band, plan }: { band: Band; plan: Plan }) {
  const { T } = useLang();
  const reveal = useReveal<HTMLDivElement>();

  return (
    <section id="plate" className="py-14 md:py-24">
      <div className={SHELL}>
        <div ref={reveal} className="rise">
          <div className="max-w-[56ch] mb-11">
            <div className="shiro w-[72px] mb-5" />
            <h2
              className="text-[clamp(1.9rem,4.4vw,2.85rem)] leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {T({ en: "Today's plate, for", hi: "आज की थाली," })}{" "}
              <em style={{ color: "var(--kesar)", fontStyle: "italic" }}>{T(band.name)}</em>
            </h2>
            <p className="mt-4 text-[1.02rem]" style={{ color: "var(--ink-soft)" }}>
              {T({
                en: `About ${plan.kcal.toLocaleString("en-IN")} kilocalories a day, split across three meals. Same kitchen, same food, measured properly.`,
                hi: `लगभग ${plan.kcal.toLocaleString("en-IN")} किलोकैलोरी प्रतिदिन, तीन बार में बँटी। वही रसोई, वही खाना: बस सही अनुपात में।`,
              })}
            </p>
          </div>

          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
            {DISHES.map((d) => {
              const qty = plan.qty[d.key];
              const off = isDropped(qty);
              return (
                <article
                  key={d.key}
                  className="lift rounded-2xl p-5"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    opacity: off ? 0.52 : 1,
                  }}
                >
                  <div className="mb-3.5">
                    <DishArt dish={d.key} />
                  </div>
                  <h3 className="text-[1.32rem] leading-tight" style={{ fontFamily: "var(--font-display)" }} lang="hi">
                    {d.name.hi}
                  </h3>
                  <p
                    className="text-[0.78rem] font-semibold uppercase mt-0.5"
                    style={{ letterSpacing: "0.1em", color: "var(--ink-soft)" }}
                  >
                    {d.name.en} · {T(d.sub)}
                  </p>
                  <p
                    className="text-[0.86rem] mt-2.5 font-medium"
                    style={{ fontFamily: "var(--font-data)", color: off ? "var(--ink-soft)" : "var(--kesar)" }}
                  >
                    {T(qty)}
                  </p>
                  <dl
                    className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2.5 pt-2.5 text-[0.72rem]"
                    style={{
                      borderTop: "1px solid var(--line)",
                      color: "var(--ink-soft)",
                      textDecoration: off ? "line-through" : "none",
                    }}
                  >
                    {(["protein", "carbohydrate", "fat", "fibre"] as const).map((n) => (
                      <div key={n} className="flex justify-between gap-1">
                        <dt>{T(NUTRIENT[n])}</dt>
                        <dd style={{ fontFamily: "var(--font-data)" }}>{d.macros[n]} g</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- biomarkers */

function Spark({ points, healthy }: { points: number[]; healthy: boolean }) {
  const w = 200;
  const h = 44;
  const mn = Math.min(...points);
  const mx = Math.max(...points);
  const rg = mx - mn || 1;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - 4 - ((p - mn) / rg) * (h - 10);
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden
      className="mt-3.5 w-full h-[44px] block"
    >
      <path
        d={d}
        fill="none"
        stroke={healthy ? "var(--elaichi)" : "var(--kesar)"}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function Biomarkers() {
  const { T } = useLang();
  const reveal = useReveal<HTMLDivElement>();

  return (
    <section id="bios" className="py-14 md:py-24" style={{ background: "var(--roti-2)" }}>
      <div className={SHELL}>
        <div ref={reveal} className="rise">
          <div className="max-w-[56ch] mb-11">
            <div className="shiro w-[72px] mb-5" />
            <h2
              className="text-[clamp(1.9rem,4.4vw,2.85rem)] leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {T({ en: "The four that actually fail in India", hi: "भारत में असल में जो चार गिरते हैं" })}
            </h2>
            <p className="mt-4 text-[1.02rem]" style={{ color: "var(--ink-soft)" }}>
              {T({
                en: "Poshan tracks the full panel, but these four are where Indian reports break, and each one has a fix that lives on your own plate.",
                hi: "पोषण पूरा पैनल ट्रैक करता है, पर भारतीय रिपोर्ट में गड़बड़ी इन्हीं चार में आती है: और हर एक का इलाज आपकी अपनी थाली में है।",
              })}
            </p>
          </div>

          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {BIOMARKERS.map((b) => (
              <article
                key={b.short}
                className="surface-card rounded-2xl p-5"
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="font-extrabold text-[0.95rem]">{b.short}</div>
                    <div className="text-[0.72rem] mt-0.5" style={{ color: "var(--ink-soft)" }}>
                      {T(b.full)}
                    </div>
                  </div>
                  <div
                    className="text-[1.3rem] tabular-nums leading-none whitespace-nowrap"
                    style={{ fontFamily: "var(--font-data)" }}
                  >
                    {b.value}
                  </div>
                </div>

                <Spark points={b.points} healthy={b.healthy} />

                <div className="flex items-center gap-2 mt-2.5 text-[0.76rem]" style={{ color: "var(--ink-soft)" }}>
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: b.healthy ? "var(--elaichi)" : "var(--kesar)" }}
                  />
                  <span>{T(b.status)}</span>
                  <span aria-hidden>·</span>
                  <span>{T(b.unit)}</span>
                </div>
                <p className="text-[0.79rem] mt-2 leading-snug" style={{ color: "var(--ink-soft)" }}>
                  {T(b.why)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------- testimonials, CTA, foot */

const QUOTES = [
  {
    initials: "RM",
    colour: "var(--kesar-fill)",
    name: "Rohit Mehra",
    meta: { en: "Pune · 8 months", hi: "पुणे · 8 माह" },
    text: {
      en: "“Three apps told me 24 was fine. Poshan flagged it, I got tested, and my glycated haemoglobin was 6.1. I was pre-diabetic and nobody had said a word.”",
      hi: "“तीन ऐप कहते रहे कि 24 ठीक है। पोषण ने चेताया, मैंने जाँच करवाई, ग्लाइकेटेड हीमोग्लोबिन 6.1 निकला। मैं प्री-डायबिटिक था और किसी ने बताया तक नहीं।”",
    },
  },
  {
    initials: "SK",
    colour: "var(--elaichi-fill)",
    name: "Sneha Kulkarni",
    meta: { en: "Nagpur · 1 year", hi: "नागपुर · 1 वर्ष" },
    text: {
      en: "“I don't want a diet. I want to eat what my mother cooks, in the right amount. That is the only thing Poshan ever asked of me.”",
      hi: "“मुझे डाइट नहीं चाहिए। मुझे वही खाना है जो माँ बनाती हैं, बस सही मात्रा में। पोषण ने मुझसे सिर्फ़ यही माँगा।”",
    },
  },
  {
    initials: "AV",
    colour: "var(--imli-fill)",
    name: "Aditya Verma",
    meta: { en: "Jaipur · 6 months", hi: "जयपुर · 6 माह" },
    text: {
      en: "“My mother uses it in Hindi, I use it in English, and we are looking at the same thali. That has never happened with an app in our house.”",
      hi: "“माँ इसे हिंदी में चलाती हैं, मैं अंग्रेज़ी में, और हम दोनों एक ही थाली देख रहे होते हैं। हमारे घर में किसी ऐप के साथ ऐसा कभी नहीं हुआ।”",
    },
  },
];

export function Testimonials() {
  const { T } = useLang();
  const reveal = useReveal<HTMLDivElement>();

  return (
    <section className="py-14 md:py-24">
      <div className={SHELL}>
        <div ref={reveal} className="rise">
          <div className="max-w-[56ch] mb-11">
            <div className="shiro w-[72px] mb-5" />
            <h2
              className="text-[clamp(1.9rem,4.4vw,2.85rem)] leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {T({
                en: "People who stopped fighting their own kitchen",
                hi: "जिन्होंने अपनी ही रसोई से लड़ना छोड़ दिया",
              })}
            </h2>
          </div>

          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            {QUOTES.map((q) => (
              <figure
                key={q.initials}
                className="surface-card rounded-2xl p-6 flex flex-col m-0"
              >
                <blockquote
                  className="text-[1.16rem] leading-relaxed flex-1 m-0"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {T(q.text)}
                </blockquote>
                <figcaption
                  className="flex items-center gap-3 mt-5 pt-4"
                  style={{ borderTop: "1px solid var(--line)" }}
                >
                  <span
                    className="w-10 h-10 rounded-full grid place-items-center font-extrabold text-[0.86rem] text-white shrink-0"
                    style={{ background: q.colour }}
                    aria-hidden
                  >
                    {q.initials}
                  </span>
                  <span>
                    <span className="block font-extrabold text-[0.88rem] leading-tight">{q.name}</span>
                    <span className="block text-[0.76rem]" style={{ color: "var(--ink-soft)" }}>
                      {T(q.meta)}
                    </span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ClosingCta() {
  const { T } = useLang();
  const reveal = useReveal<HTMLDivElement>();

  return (
    <section className="pb-14 md:pb-24">
      <div className={SHELL}>
        <div
          ref={reveal}
          className="on-panel rise rounded-3xl p-9 md:p-14 text-center relative overflow-hidden"
          style={{ background: "var(--panel)", color: "var(--panel-ink)" }}
        >
          {[420, 600].map((s) => (
            <span
              key={s}
              aria-hidden
              className="absolute rounded-full pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: s,
                height: s,
                border: "1.5px solid color-mix(in srgb, var(--roti) 12%, transparent)",
              }}
            />
          ))}
          <h2
            className="text-[clamp(1.9rem,4.6vw,3rem)] leading-tight relative max-w-[22ch] mx-auto text-balance"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {T({
              en: "Your thali is already right. Poshan just measures it.",
              hi: "आपकी थाली पहले से सही है। पोषण उसे बस नाप देता है।",
            })}
          </h2>
          <p
            className="mt-4 max-w-[46ch] mx-auto relative"
            style={{ color: "color-mix(in srgb, var(--roti) 68%, transparent)" }}
          >
            {T({
              en: "Free to start. Poshan Home from ₹299 a month. Hindi and English from day one.",
              hi: "शुरू करना मुफ़्त। पोषण घर ₹299 प्रति माह से। पहले दिन से हिंदी और अंग्रेज़ी।",
            })}
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-8 relative">
            <TabLink
              to="premium"
              target="premium"
              className="inline-flex items-center min-h-12 px-6 rounded-full font-extrabold text-[0.94rem] no-underline transition-transform hover:-translate-y-0.5"
              style={{ background: "var(--kesar-fill)", color: "#fff" }}
            >
              {T({ en: "See Poshan Home", hi: "पोषण घर देखें" })}
            </TabLink>
            <TabLink
              to="home"
              target="check"
              className="inline-flex items-center min-h-12 px-6 rounded-full font-extrabold text-[0.94rem] no-underline transition-colors"
              style={{
                border: "1.5px solid color-mix(in srgb, var(--roti) 45%, transparent)",
                color: "var(--roti)",
              }}
            >
              {T({ en: "Check my BMI first", hi: "पहले बीएमआई जाँचें" })}
            </TabLink>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const { T } = useLang();
  return (
    <footer className="py-11 mt-auto" style={{ borderTop: "1px solid var(--line)" }}>
      <div className={`${SHELL} flex flex-wrap gap-5 justify-between items-center`}>
        <p className="text-[0.82rem]" style={{ color: "var(--ink-soft)" }}>
          © 2026 Poshan · {T({ en: "Made in India", hi: "भारत में बना" })}
        </p>
        {/* These were plain hash links into one long scroll. The sections now
            live behind tabs and the target may not be mounted, so each one
            switches tab first and scrolls second. */}
        <nav className="flex flex-wrap gap-6 text-[0.84rem]" aria-label="Footer">
          {[
            { to: "home" as const, target: "check", en: "BMI", hi: "बीएमआई" },
            { to: "plate" as const, target: "plate", en: "Meal plans", hi: "मील प्लान" },
            { to: "health" as const, target: "bios", en: "Biomarkers", hi: "बायोमार्कर" },
            { to: "premium" as const, target: "premium", en: "Pricing", hi: "मूल्य" },
            { to: "premium" as const, target: "clinics", en: "For clinics", hi: "क्लिनिकों के लिए" },
          ].map((l) => (
            <TabLink
              key={l.target}
              to={l.to}
              target={l.target}
              className="no-underline underline-draw"
              style={{ color: "var(--ink-soft)" }}
            >
              {T({ en: l.en, hi: l.hi })}
            </TabLink>
          ))}
        </nav>
      </div>
    </footer>
  );
}
