"use client";

import { useState, useMemo } from "react";
import { useLang, useReveal } from "./lang-provider";
import { FoodMark } from "./meal-library";
import { MEAL_LIBRARY, PREMIUM } from "@/lib/poshan-data";
import {
  CONDITIONS,
  CONFLICTS,
  conditionByKey,
  checkMealAll,
  VERDICT_LABEL,
  VERDICT_COLOUR,
  MEDICAL_DISCLAIMER,
  type ConditionKey,
} from "@/lib/conditions";

export function Conditions() {
  const { T, lang } = useLang();
  const reveal = useReveal<HTMLDivElement>();
  const [picked, setPicked] = useState<ConditionKey[]>(["diabetes"]);

  const toggle = (k: ConditionKey) =>
    setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const active = picked.map(conditionByKey);

  /* Surface clashing advice rather than silently picking a winner. */
  const conflicts = useMemo(
    () =>
      CONFLICTS.filter(
        (c) => picked.includes(c.pair[0]) && picked.includes(c.pair[1])
      ),
    [picked]
  );

  const checked = useMemo(() => {
    if (!picked.length) return [];
    return MEAL_LIBRARY.map((m) => ({ meal: m, ...checkMealAll(m.id, picked) })).sort(
      (a, b) => {
        const rank = { good: 0, caution: 1, avoid: 2 } as const;
        return rank[a.worst] - rank[b.worst] || b.meal.macros.protein - a.meal.macros.protein;
      }
    );
  }, [picked]);

  const counts = useMemo(
    () => ({
      good: checked.filter((c) => c.worst === "good").length,
      caution: checked.filter((c) => c.worst === "caution").length,
      avoid: checked.filter((c) => c.worst === "avoid").length,
    }),
    [checked]
  );

  return (
    <section id="conditions" className="py-14 md:py-24">
      <div className="w-[min(1180px,100%-2.5rem)] mx-auto">
        <div ref={reveal} className="rise">
          <div className="max-w-[58ch] mb-9">
            <div className="shiro w-[72px] mb-5" />
            <span
              className="inline-block text-[0.64rem] font-extrabold uppercase px-2.5 py-1 rounded-full mb-4"
              style={{ letterSpacing: "0.12em", background: "var(--kesar-fill)", color: "#fff" }}
            >
              {T({ en: "Poshan Home", hi: "पोषण घर" })}
            </span>
            <h2
              className="text-[clamp(1.9rem,4.4vw,2.85rem)] leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {T({
                en: "Tell Poshan what you're managing",
                hi: "पोषण को बताएँ आप क्या सँभाल रहे हैं",
              })}
            </h2>
            <p className="mt-4 text-[1.02rem]" style={{ color: "var(--ink-soft)" }}>
              {T({
                en: "Pick one or more. Every plan in the library is then checked against your condition and marked: with the reason, not just a colour.",
                hi: "एक या अधिक चुनें। फिर लाइब्रेरी का हर प्लान आपकी स्थिति के हिसाब से जाँचा और चिह्नित होता है: कारण के साथ, सिर्फ़ रंग नहीं।",
              })}
            </p>
          </div>

          {/* ---------- condition picker ---------- */}
          <div
            className="flex flex-wrap gap-2 mb-6"
            role="group"
            aria-label={T({ en: "Your conditions", hi: "आपकी स्थितियाँ" })}
          >
            {CONDITIONS.map((c) => {
              const on = picked.includes(c.key);
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(c.key)}
                  className="px-4 min-h-11 rounded-full text-[0.86rem] font-semibold cursor-pointer transition-colors"
                  style={
                    on
                      ? { background: "var(--ink)", color: "var(--roti)" }
                      : { border: "1px solid var(--line)", color: "var(--ink)", background: "var(--surface)" }
                  }
                >
                  {T(c.name)}
                </button>
              );
            })}
          </div>

          {/* ---------- conflicting advice ---------- */}
          {conflicts.map((c, i) => (
            <div
              key={i}
              role="alert"
              className="rounded-2xl p-4 mb-5 flex gap-3"
              style={{ background: "color-mix(in srgb, var(--mirch) 10%, var(--surface))", border: "1px solid var(--mirch)" }}
            >
              <svg viewBox="0 0 20 20" aria-hidden className="w-5 h-5 shrink-0 mt-0.5">
                <path d="M10 2.5 18.5 17.5H1.5Z M10 8v4 M10 14.6v.2" fill="none" stroke="var(--mirch)" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              <p className="text-[0.87rem]" style={{ color: "var(--ink)" }}>
                <strong>{T({ en: "These conflict. ", hi: "ये आपस में टकराते हैं। " })}</strong>
                {T(c.note)}
              </p>
            </div>
          ))}

          {/* ---------- per-condition guidance ---------- */}
          <div className="grid gap-4 mb-8 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
            {active.map((c) => (
              <article
                key={c.key}
                className="surface-card rounded-2xl p-5"
              >
                <h3 className="text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>
                  {T(c.name)}
                </h3>
                <p className="text-[0.78rem] mt-1" style={{ color: "var(--ink-soft)" }}>
                  {T(c.prevalence)}
                </p>
                <p className="text-[0.9rem] mt-3">{T(c.principle)}</p>

                <div className="grid sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-[0.66rem] font-extrabold uppercase mb-1.5" style={{ letterSpacing: "0.12em", color: "var(--elaichi)" }}>
                      {T({ en: "Favour", hi: "बढ़ाएँ" })}
                    </p>
                    <ul className="list-none p-0 m-0 grid gap-1">
                      {c.favour.map((f, i) => (
                        <li key={i} className="text-[0.82rem]" style={{ color: "var(--ink-soft)" }}>{T(f)}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[0.66rem] font-extrabold uppercase mb-1.5" style={{ letterSpacing: "0.12em", color: "var(--mirch)" }}>
                      {T({ en: "Limit", hi: "घटाएँ" })}
                    </p>
                    <ul className="list-none p-0 m-0 grid gap-1">
                      {c.limit.map((f, i) => (
                        <li key={i} className="text-[0.82rem]" style={{ color: "var(--ink-soft)" }}>{T(f)}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div
                  className="mt-4 pt-3 text-[0.84rem]"
                  style={{ borderTop: "1px solid var(--line)" }}
                >
                  <span className="font-extrabold" style={{ color: "var(--haldi-ink)" }}>
                    {T({ en: "Most people get this wrong: ", hi: "यहाँ ज़्यादातर लोग चूकते हैं: " })}
                  </span>
                  <span style={{ color: "var(--ink-soft)" }}>{T(c.watchOut)}</span>
                </div>
              </article>
            ))}
          </div>

          {/* ---------- the checker ---------- */}
          {picked.length > 0 && (
            <>
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 mb-4">
                <h3 className="text-[1.4rem]" style={{ fontFamily: "var(--font-display)" }}>
                  {T({ en: "Is this food good for me?", hi: "क्या यह खाना मेरे लिए ठीक है?" })}
                </h3>
                <p className="text-[0.84rem] tabular-nums" style={{ color: "var(--ink-soft)", fontFamily: "var(--font-data)" }}>
                  {counts.good} {T({ en: "good", hi: "अच्छे" })} · {counts.caution} {T({ en: "careful", hi: "सावधानी" })} · {counts.avoid} {T({ en: "avoid", hi: "बचें" })}
                </p>
              </div>

              <ul className="grid gap-2.5 list-none p-0 m-0 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
                {checked.map(({ meal, worst, results }) => {
                  const reasons = results.flatMap((r) => r.reasons).filter((r) => r.verdict === worst);
                  return (
                    <li
                      key={meal.id}
                      className="rounded-xl p-4"
                      style={{
                        background: "var(--surface)",
                        border: "1px solid var(--line)",
                        borderLeft: `4px solid ${VERDICT_COLOUR[worst]}`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className="mt-0.5"><FoodMark category={meal.category} size={15} /></span>
                          <span
                            className="text-[1.05rem] leading-tight"
                            style={{ fontFamily: "var(--font-display)" }}
                            lang={lang === "hi" ? "hi" : undefined}
                          >
                            {T(meal.name)}
                          </span>
                        </div>
                        <span
                          className="text-[0.68rem] font-extrabold uppercase px-2 py-1 rounded-full whitespace-nowrap shrink-0"
                          style={{ letterSpacing: "0.08em", background: VERDICT_COLOUR[worst], color: "#fff" }}
                        >
                          {T(VERDICT_LABEL[worst])}
                        </span>
                      </div>
                      {reasons.length > 0 && (
                        <p className="text-[0.8rem] mt-2" style={{ color: "var(--ink-soft)" }}>
                          {T(reasons[0].why)}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {/* ---------- disclaimer ---------- */}
          <div
            className="rounded-2xl p-5 mt-8 flex gap-3"
            style={{ background: "var(--roti-2)", border: "1px solid var(--line)" }}
          >
            <svg viewBox="0 0 20 20" aria-hidden className="w-5 h-5 shrink-0 mt-0.5">
              <circle cx={10} cy={10} r={8.5} fill="none" stroke="var(--ink-soft)" strokeWidth={1.5} />
              <path d="M10 6.2v.2M10 9v5" fill="none" stroke="var(--ink-soft)" strokeWidth={1.7} strokeLinecap="round" />
            </svg>
            <p className="text-[0.83rem]" style={{ color: "var(--ink-soft)" }}>
              {T(MEDICAL_DISCLAIMER)}
            </p>
          </div>

          <p className="text-[0.8rem] mt-4" style={{ color: "var(--ink-soft)" }}>
            {T({
              en: `Condition plans are part of Poshan Home, ₹${PREMIUM.monthly} a month with ${PREMIUM.trialDays} days free.`,
              hi: `स्थिति-आधारित प्लान पोषण घर का हिस्सा हैं, ₹${PREMIUM.monthly} प्रति माह, ${PREMIUM.trialDays} दिन मुफ़्त।`,
            })}
          </p>
        </div>
      </div>
    </section>
  );
}
