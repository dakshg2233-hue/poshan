"use client";

import { useState } from "react";
import { useLang, useReveal } from "./lang-provider";
import { CheckoutButton } from "./checkout-button";
import { Spotlight } from "@/components/ui/spotlight";
import {
  PREMIUM,
  FREE_FEATURES,
  PREMIUM_FEATURES,
  GOALS,
  DIETS,
  REGIONS,
  buildPlan,
  type GoalKey,
  type DietKey,
  type RegionKey,
} from "@/lib/poshan-data";

export function Premium({
  baseKcal,
  goal,
  setGoal,
  diet,
  setDiet,
  region,
  setRegion,
  signedIn,
}: {
  baseKcal: number;
  /* All three now live in PoshanApp, which owns persistence. They used to be
     local state here, which is precisely why the customiser reset on every
     refresh while the rest of the page looked like it remembered you. */
  goal: GoalKey;
  setGoal: (g: GoalKey) => void;
  diet: DietKey;
  setDiet: (d: DietKey) => void;
  region: RegionKey;
  setRegion: (r: RegionKey) => void;
  signedIn: boolean;
}) {
  const { T } = useLang();
  const reveal = useReveal<HTMLDivElement>();
  const revealCards = useReveal<HTMLDivElement>();

  const [yearly, setYearly] = useState(true);

  const plan = buildPlan(region, diet, goal, baseKcal);
  const price = yearly ? PREMIUM.yearly : PREMIUM.monthly;

  return (
    <section id="premium" className="py-14 md:py-24" style={{ background: "var(--roti-2)" }}>
      <div className="w-[min(1180px,100%-2.5rem)] mx-auto">
        <div ref={reveal} className="rise max-w-[56ch] mb-11">
          <div className="shiro w-[72px] mb-5" />
          <h2
            className="text-[clamp(1.9rem,4.4vw,2.85rem)] leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {T({ en: "Poshan Home", hi: "पोषण घर" })}{" "}
            <em style={{ color: "var(--kesar)", fontStyle: "italic" }}>
              {T({ en: "— the plan that knows your kitchen", hi: "— वह प्लान जो आपकी रसोई जानता है" })}
            </em>
          </h2>
          <p className="mt-4 text-[1.02rem]" style={{ color: "var(--ink-soft)" }}>
            {T({
              en: "The free plan reads your body. Poshan Home cooks for it — a plan rebuilt around your goal, your diet and the food your region actually makes.",
              hi: "मुफ़्त प्लान आपका शरीर पढ़ता है। पोषण घर उसके लिए पकाता है — आपके लक्ष्य, आपके आहार और आपके क्षेत्र के असली खाने के हिसाब से बना प्लान।",
            })}
          </p>
        </div>

        {/* ------------------------------------------------ the customiser */}
        <div
          className="on-panel rounded-3xl p-6 md:p-9 mb-10 relative"
          style={{ background: "var(--panel)", color: "var(--panel-ink)" }}
        >
          {/* Cursor-tracked light. Dark surfaces are where this reads as
              expensive rather than busy — it does nothing on the warm ground. */}
          <Spotlight className="from-amber-100 via-amber-200 to-transparent" size={320} />
          <p
            className="text-[0.72rem] font-extrabold uppercase mb-6 relative"
            style={{ letterSpacing: "0.16em", color: "var(--haldi)" }}
          >
            {T({ en: "Build your plan", hi: "अपना प्लान बनाएँ" })}
          </p>

          {/* Says where the choices are being kept. Signed out they still
              survive a refresh, via localStorage — worth saying so, because
              "you must make an account to keep this" is the assumption most
              people arrive with. */}
          <p
            className="text-[0.74rem] -mt-4 mb-6 relative"
            style={{ color: "color-mix(in srgb, var(--panel-ink) 62%, var(--panel))" }}
          >
            {signedIn
              ? T({
                  en: "Saved to your account.",
                  hi: "आपके खाते में सहेजा गया।",
                })
              : T({
                  en: "Kept on this device — sign in to carry it across devices.",
                  hi: "इसी डिवाइस पर सुरक्षित — दूसरे डिवाइस पर ले जाने के लिए साइन इन करें।",
                })}
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            <Choice
              label={T({ en: "Your goal", hi: "आपका लक्ष्य" })}
              options={GOALS.map((g) => ({ key: g.key, label: T(g.label) }))}
              value={goal}
              onChange={(k) => setGoal(k as GoalKey)}
            />
            <Choice
              label={T({ en: "Your diet", hi: "आपका आहार" })}
              options={DIETS.map((d) => ({ key: d.key, label: T(d.label) }))}
              value={diet}
              onChange={(k) => setDiet(k as DietKey)}
            />
            <Choice
              label={T({ en: "Your region", hi: "आपका क्षेत्र" })}
              options={REGIONS.map((r) => ({ key: r.key, label: T(r.label) }))}
              value={region}
              onChange={(k) => setRegion(k as RegionKey)}
            />
          </div>

          {/* result */}
          <div
            className="mt-8 pt-7 grid gap-5 md:grid-cols-[1fr_auto]"
            style={{ borderTop: "1px solid color-mix(in srgb, var(--roti) 18%, transparent)" }}
            aria-live="polite"
          >
            <div className="grid gap-3">
              {(
                [
                  ["breakfast", { en: "Breakfast", hi: "नाश्ता" }],
                  ["lunch", { en: "Lunch", hi: "दोपहर का खाना" }],
                  ["dinner", { en: "Dinner", hi: "रात का खाना" }],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span
                    className="text-[0.68rem] font-extrabold uppercase w-[86px] shrink-0"
                    style={{ letterSpacing: "0.14em", color: "var(--haldi)" }}
                  >
                    {T(label)}
                  </span>
                  <span className="text-[1.16rem]" style={{ fontFamily: "var(--font-display)" }}>
                    {T(plan.meals[key])}
                  </span>
                </div>
              ))}
            </div>

            <div className="md:text-right">
              <div
                className="text-[2.4rem] leading-none tabular-nums"
                style={{ fontFamily: "var(--font-data)", fontWeight: 500 }}
              >
                {plan.kcal.toLocaleString("en-IN")}
              </div>
              <div
                className="text-[0.75rem] uppercase mt-1"
                style={{ letterSpacing: "0.12em", color: "color-mix(in srgb, var(--roti) 60%, transparent)" }}
              >
                {T({ en: "kilocalories a day", hi: "किलोकैलोरी प्रतिदिन" })}
              </div>
              <div className="mt-3 text-[0.85rem]" style={{ color: "var(--haldi)" }}>
                {T({ en: "Focus:", hi: "ध्यान:" })} {T(plan.focus)}
              </div>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------- the tiers */}
        <div ref={revealCards} className="rise grid gap-5 md:grid-cols-2 items-start">
          {/* Free */}
          <div
            className="rounded-2xl p-7 h-full"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          >
            <h3 className="text-[1.5rem]" style={{ fontFamily: "var(--font-display)" }}>
              {T({ en: "Free", hi: "मुफ़्त" })}
            </h3>
            <p className="mt-1 text-[0.88rem]" style={{ color: "var(--ink-soft)" }}>
              {T({ en: "Everything you have used on this page.", hi: "जो कुछ आपने इस पेज पर इस्तेमाल किया।" })}
            </p>
            <div className="my-6 text-[2.4rem] leading-none tabular-nums" style={{ fontFamily: "var(--font-data)" }}>
              ₹0
            </div>
            <ul className="grid gap-2.5 list-none p-0 m-0">
              {FREE_FEATURES.map((f, i) => (
                <li key={i} className="flex gap-2.5 text-[0.9rem]" style={{ color: "var(--ink-soft)" }}>
                  <Tick color="var(--elaichi)" />
                  <span>{T(f)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Poshan Home */}
          <div
            className="on-panel rounded-2xl p-7 h-full relative overflow-hidden"
            style={{ background: "var(--panel)", color: "var(--panel-ink)" }}
          >
            <Spotlight className="from-orange-100 via-amber-200 to-transparent" size={260} />
            <span
              className="absolute top-5 right-5 text-[0.66rem] font-extrabold uppercase px-2.5 py-1 rounded-full z-10"
              style={{ letterSpacing: "0.12em", background: "var(--kesar-fill)", color: "#fff" }}
            >
              {T({
                en: `${PREMIUM.trialDays} days free`,
                hi: `${PREMIUM.trialDays} दिन मुफ़्त`,
              })}
            </span>

            <h3 className="text-[1.5rem]" style={{ fontFamily: "var(--font-display)" }}>
              {T(PREMIUM.name)}
            </h3>
            <p
              className="mt-1 text-[0.88rem]"
              style={{ color: "color-mix(in srgb, var(--roti) 62%, transparent)" }}
            >
              {T({
                en: "A plan rebuilt for your body, not a band.",
                hi: "आपके शरीर के लिए बना प्लान, किसी वर्ग के लिए नहीं।",
              })}
            </p>

            {/* billing switch */}
            <div
              className="inline-flex rounded-full overflow-hidden mt-5 mb-4"
              style={{ border: "1.5px solid color-mix(in srgb, var(--roti) 32%, transparent)" }}
              role="group"
              aria-label={T({ en: "Billing period", hi: "बिलिंग अवधि" })}
            >
              {[
                { y: false, label: T({ en: "Monthly", hi: "मासिक" }) },
                { y: true, label: T({ en: "Yearly", hi: "वार्षिक" }) },
              ].map((o) => (
                <button
                  key={String(o.y)}
                  type="button"
                  aria-pressed={yearly === o.y}
                  onClick={() => setYearly(o.y)}
                  className="px-4 py-1.5 text-[0.8rem] font-extrabold cursor-pointer transition-colors"
                  style={
                    yearly === o.y
                      ? /* Inverted chip on a dark panel: light fill, dark label.
                           --ink resolves to the panel's light ink inside
                           .on-panel, so the label must name --panel explicitly
                           or it matches its own background exactly. */
                        { background: "var(--panel-ink)", color: "var(--panel)" }
                      : { color: "var(--panel-ink)" }
                  }
                >
                  {o.label}
                </button>
              ))}
            </div>

            <div className="flex items-end gap-2.5 flex-wrap">
              <span
                className="text-[2.4rem] leading-none tabular-nums"
                style={{ fontFamily: "var(--font-data)", fontWeight: 500 }}
              >
                ₹{price.toLocaleString("en-IN")}
              </span>
              <span
                className="text-[0.9rem] pb-1"
                style={{ color: "color-mix(in srgb, var(--roti) 60%, transparent)" }}
              >
                {yearly ? T({ en: "/ year", hi: "/ वर्ष" }) : T({ en: "/ month", hi: "/ माह" })}
              </span>
            </div>

            <p className="mt-2 text-[0.82rem] min-h-[1.2rem]" style={{ color: "var(--haldi)" }}>
              {yearly
                ? T({
                    en: `Works out to ₹${Math.round(PREMIUM.yearly / 12)} a month — you keep ₹${PREMIUM.saved.toLocaleString("en-IN")}, about ${PREMIUM.savedPercent}% off.`,
                    hi: `यानी ₹${Math.round(PREMIUM.yearly / 12)} प्रति माह — आप ₹${PREMIUM.saved.toLocaleString("en-IN")} बचाते हैं, लगभग ${PREMIUM.savedPercent}% की छूट।`,
                  })
                : T({
                    en: `Switch to yearly and keep ₹${PREMIUM.saved.toLocaleString("en-IN")}.`,
                    hi: `वार्षिक चुनें और ₹${PREMIUM.saved.toLocaleString("en-IN")} बचाएँ।`,
                  })}
            </p>

            <ul className="grid gap-2.5 list-none p-0 mt-6 mb-7">
              {PREMIUM_FEATURES.map((f, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 text-[0.9rem]"
                  style={{ color: "color-mix(in srgb, var(--roti) 80%, transparent)" }}
                >
                  <Tick color="var(--haldi)" />
                  <span>{T(f)}</span>
                </li>
              ))}
            </ul>

            {/* ---- trial timeline: what actually happens, day by day ---- */}
            <ol
              className="grid gap-0 mb-6 list-none p-0 rounded-xl overflow-hidden"
              style={{ border: "1px solid color-mix(in srgb, var(--roti) 20%, transparent)" }}
            >
              {[
                {
                  day: T({ en: "Today", hi: "आज" }),
                  what: T({ en: "Full access. No payment taken.", hi: "पूरी सुविधा। कोई भुगतान नहीं।" }),
                  lit: true,
                },
                {
                  day: T({ en: `Day ${PREMIUM.trialDays - 2}`, hi: `दिन ${PREMIUM.trialDays - 2}` }),
                  what: T({ en: "We remind you the trial is ending.", hi: "हम याद दिलाते हैं कि परीक्षण ख़त्म हो रहा है।" }),
                  lit: false,
                },
                {
                  day: T({ en: `Day ${PREMIUM.trialDays}`, hi: `दिन ${PREMIUM.trialDays}` }),
                  what: yearly
                    ? T({ en: `₹${PREMIUM.yearly.toLocaleString("en-IN")} charged, unless you cancelled.`, hi: `₹${PREMIUM.yearly.toLocaleString("en-IN")} लिए जाएँगे, जब तक आपने रद्द न किया हो।` })
                    : T({ en: `₹${PREMIUM.monthly} charged, unless you cancelled.`, hi: `₹${PREMIUM.monthly} लिए जाएँगे, जब तक आपने रद्द न किया हो।` }),
                  lit: false,
                },
              ].map((s, i) => (
                <li
                  key={i}
                  className="flex gap-3 items-baseline px-3.5 py-2.5"
                  style={{
                    borderTop: i ? "1px solid color-mix(in srgb, var(--roti) 14%, transparent)" : undefined,
                  }}
                >
                  <span
                    className="text-[0.68rem] font-extrabold uppercase w-[54px] shrink-0"
                    style={{
                      letterSpacing: "0.1em",
                      color: s.lit ? "var(--haldi)" : "color-mix(in srgb, var(--roti) 64%, transparent)",
                    }}
                  >
                    {s.day}
                  </span>
                  <span
                    className="text-[0.83rem]"
                    style={{ color: "color-mix(in srgb, var(--roti) 78%, transparent)" }}
                  >
                    {s.what}
                  </span>
                </li>
              ))}
            </ol>

            <CheckoutButton yearly={yearly} />

            <CancelAnytime />

            <p
              className="text-center text-[0.76rem] mt-3"
              style={{ color: "color-mix(in srgb, var(--roti) 55%, transparent)" }}
            >
              {T({ en: "Prices include GST.", hi: "कीमतों में जीएसटी शामिल है।" })}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Cancelling is the thing people are actually nervous about, so it gets a
 * real control rather than a line of small print. It discloses how
 * cancellation works instead of pretending to cancel a subscription that
 * does not exist yet — there is no account system behind this page.
 */
function CancelAnytime() {
  const { T } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="cancel-details"
        onClick={() => setOpen((o) => !o)}
        className="w-full min-h-11 px-4 rounded-full text-[0.85rem] font-extrabold cursor-pointer transition-colors flex items-center justify-center gap-2"
        style={{
          border: "1.5px solid color-mix(in srgb, var(--roti) 38%, transparent)",
          color: "var(--roti)",
        }}
      >
        {T({ en: "Cancel anytime — here's how", hi: "कभी भी रद्द करें — ऐसे" })}
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className="w-3.5 h-3.5 shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .25s" }}
        >
          <path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          id="cancel-details"
          className="mt-3 grid gap-2 list-none p-4 rounded-xl m-0"
          style={{
            background: "color-mix(in srgb, var(--roti) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--roti) 16%, transparent)",
          }}
        >
          {[
            { en: "One tap in Settings. No phone call, no email, no retention offer.", hi: "सेटिंग्स में एक टैप। न फ़ोन, न ईमेल, न रोकने की पेशकश।" },
            { en: "Cancel during the trial and you are never charged at all.", hi: "परीक्षण के दौरान रद्द करें तो कोई शुल्क लगता ही नहीं।" },
            { en: "Cancel later and Poshan Home runs to the end of the period you paid for.", hi: "बाद में रद्द करें तो पोषण घर आपकी भुगतान अवधि के अंत तक चलता रहेगा।" },
            { en: "Your plans, photos and biomarker history stay readable on the free tier.", hi: "आपके प्लान, फ़ोटो और बायोमार्कर इतिहास मुफ़्त स्तर पर भी पढ़े जा सकेंगे।" },
          ].map((line, i) => (
            <li
              key={i}
              className="flex gap-2.5 text-[0.83rem]"
              style={{ color: "color-mix(in srgb, var(--roti) 82%, transparent)" }}
            >
              <Tick color="var(--haldi)" />
              <span>{T(line)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: string; label: string }[];
  value: string;
  onChange: (k: string) => void;
}) {
  return (
    <div>
      <p
        className="text-[0.7rem] font-extrabold uppercase mb-2.5"
        style={{ letterSpacing: "0.13em", color: "color-mix(in srgb, var(--roti) 55%, transparent)" }}
      >
        {label}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((o) => {
          const on = o.key === value;
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.key)}
              className="px-3.5 py-2 rounded-full text-[0.85rem] font-semibold cursor-pointer transition-colors min-h-11"
              style={
                on
                  ? { background: "var(--kesar-fill)", color: "#fff" }
                  : {
                      border: "1px solid color-mix(in srgb, var(--roti) 28%, transparent)",
                      color: "color-mix(in srgb, var(--roti) 78%, transparent)",
                    }
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Tick({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="w-4 h-4 shrink-0 mt-1">
      <path
        d="M3 8.5l3.2 3.2L13 5"
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
