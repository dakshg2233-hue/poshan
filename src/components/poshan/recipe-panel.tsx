"use client";

import { useId, useState } from "react";
import { useLang } from "./lang-provider";
import { recipeFor, NUTRIENT_ORDER, NUTRIENT_META } from "@/lib/recipes";

/**
 * Recipe disclosure. Deliberately not a modal — it keeps the recipe beside the
 * meal it belongs to, avoids focus trapping, and leaves the veg/non-veg filters
 * usable while a recipe is open.
 */
export function RecipePanel({ mealId }: { mealId: string }) {
  const { T, lang } = useLang();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const recipe = recipeFor(mealId);
  /* Guard costs nothing and means a meal without a recipe degrades to a card
     with no button, rather than a broken one. */
  if (!recipe) return null;

  return (
    <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 min-h-11 text-[0.84rem] font-extrabold cursor-pointer"
        style={{ color: "var(--kesar)" }}
      >
        <span>
          {open
            ? T({ en: "Hide recipe", hi: "विधि छिपाएँ" })
            : T({ en: "How to cook it", hi: "कैसे बनाएँ" })}
          <span
            className="ml-2 font-medium"
            style={{ fontFamily: "var(--font-data)", color: "var(--ink-soft)" }}
          >
            {recipe.minutes} min · {T({ en: "serves", hi: "मात्रा" })} {recipe.serves}
          </span>
        </span>
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className="w-3.5 h-3.5 shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .3s var(--ease)" }}
        >
          <path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div id={panelId} className="mt-4 grid gap-5">
          {/* ---------------- ingredients ---------------- */}
          <div>
            <h4
              className="text-[0.68rem] font-extrabold uppercase mb-2"
              style={{ letterSpacing: "0.13em", color: "var(--ink-soft)" }}
            >
              {T({ en: "You need", hi: "सामग्री" })}
            </h4>
            <ul className="grid gap-1 list-none p-0 m-0">
              {recipe.ingredients.map((ing, i) => (
                <li
                  key={i}
                  className="text-[0.85rem] pl-3.5 relative"
                  style={{ color: "var(--ink-soft)" }}
                  lang={lang === "hi" ? "hi" : undefined}
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-[0.55em] w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--haldi)" }}
                  />
                  {T(ing)}
                </li>
              ))}
            </ul>
          </div>

          {/* ---------------- method ---------------- */}
          <div>
            <h4
              className="text-[0.68rem] font-extrabold uppercase mb-2"
              style={{ letterSpacing: "0.13em", color: "var(--ink-soft)" }}
            >
              {T({ en: "Method", hi: "विधि" })}
            </h4>
            {/* Numbered because the order genuinely matters here — this is a
                sequence, not a decorative list. */}
            <ol className="grid gap-2.5 list-none p-0 m-0 counter-reset">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-2.5 text-[0.85rem]">
                  <span
                    className="shrink-0 w-5 h-5 rounded-full grid place-items-center text-[0.66rem] font-extrabold mt-0.5"
                    style={{ background: "var(--roti-2)", color: "var(--kesar)", fontFamily: "var(--font-data)" }}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span style={{ color: "var(--ink-soft)" }} lang={lang === "hi" ? "hi" : undefined}>
                    {T(step)}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* ---------------- full nutrition ---------------- */}
          <div>
            <h4
              className="text-[0.68rem] font-extrabold uppercase mb-2.5"
              style={{ letterSpacing: "0.13em", color: "var(--ink-soft)" }}
            >
              {T({ en: "Nutrition per serving", hi: "प्रति मात्रा पोषण" })}
            </h4>
            <dl className="grid gap-1.5 m-0">
              {NUTRIENT_ORDER.map((key) => {
                const meta = NUTRIENT_META[key];
                const value = recipe.nutrition[key];
                const pct = meta.rda ? Math.min(100, Math.round((value / meta.rda) * 100)) : null;
                return (
                  <div key={key} className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center">
                    <dt className="text-[0.78rem] truncate" style={{ color: "var(--ink-soft)" }}>
                      {T(meta.label)}
                    </dt>
                    <dd
                      className="text-[0.78rem] tabular-nums text-right m-0"
                      style={{ fontFamily: "var(--font-data)" }}
                    >
                      {value}
                      <span className="text-[0.66rem] ml-0.5" style={{ color: "var(--ink-soft)" }}>
                        {meta.unit}
                      </span>
                    </dd>
                    {/* Reference bar: proportion of a day's intake, so the
                        number means something without a nutrition degree. */}
                    <dd className="m-0 w-14">
                      {pct !== null && (
                        <span
                          className="block h-1.5 rounded-full overflow-hidden"
                          style={{ background: "var(--roti-2)" }}
                          title={`${pct}% ${T({ en: "of daily reference", hi: "दैनिक संदर्भ का" })}`}
                        >
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              background: pct >= 100 ? "var(--kesar)" : "var(--elaichi)",
                            }}
                          />
                        </span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="text-[0.72rem] mt-2.5" style={{ color: "var(--ink-soft)" }}>
              {T({
                en: "Bars show the share of an adult daily reference. Values follow IFCT 2017 conventions for home portions — good for planning, not a lab assay.",
                hi: "पट्टियाँ वयस्क दैनिक संदर्भ का हिस्सा दिखाती हैं। मान घरेलू मात्रा के लिए IFCT 2017 के अनुसार — योजना के लिए ठीक, प्रयोगशाला जाँच नहीं।",
              })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
