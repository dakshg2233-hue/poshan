"use client";

import { useState, useMemo } from "react";
import { useLang, useReveal } from "./lang-provider";
import { RecipePanel } from "./recipe-panel";
import {
  MEAL_LIBRARY,
  CATEGORY_LABEL,
  TAG_LABEL,
  MEAL_TIME_LABEL,
  NUTRIENT,
  REGIONS,
  GOALS,
  GOAL_TAGS,
  filterMeals,
  countByCategory,
  type FoodCategory,
  type MealTime,
  type RegionKey,
  type GoalKey,
} from "@/lib/poshan-data";

/**
 * The FSSAI food mark, as printed on every packaged food sold in India:
 * a filled green circle for vegetarian, a filled brown triangle for
 * non-vegetarian, each inside a matching square.
 *
 * Category is carried by SHAPE as well as colour, so it survives colour
 * blindness, greyscale printing and low-contrast screens.
 */
export function FoodMark({
  category,
  size = 18,
}: {
  category: FoodCategory;
  size?: number;
}) {
  const veg = category === "veg";
  const c = veg ? "#0A7C2F" : "#8B2E12";
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className="shrink-0">
      <rect x={1.5} y={1.5} width={21} height={21} rx={3} fill="none" stroke={c} strokeWidth={2.2} />
      {veg ? (
        <circle cx={12} cy={12} r={5.6} fill={c} />
      ) : (
        <path d="M12 5.6 18.6 17.4 5.4 17.4 Z" fill={c} />
      )}
    </svg>
  );
}

const TIMES: MealTime[] = ["breakfast", "lunch", "dinner", "snack"];

export function MealLibrary({ goal }: { goal: GoalKey }) {
  const { T, lang } = useLang();
  const reveal = useReveal<HTMLDivElement>();

  const [category, setCategory] = useState<FoodCategory | null>(null);
  const [region, setRegion] = useState<RegionKey | null>(null);
  const [time, setTime] = useState<MealTime | null>(null);
  const [byGoal, setByGoal] = useState(false);

  const goalLabel = GOALS.find((g) => g.key === goal)!.label;

  const meals = useMemo(() => {
    const base = filterMeals({ category, region, time, goal: byGoal ? goal : null });
    if (!byGoal) return base;
    /* Richest match first, then most protein — so "high protein" is an
       ordering, not just a label. */
    const wanted = GOAL_TAGS[goal];
    return [...base].sort(
      (a, b) =>
        b.tags.filter((t) => wanted.includes(t)).length -
          a.tags.filter((t) => wanted.includes(t)).length ||
        b.macros.protein - a.macros.protein
    );
  }, [category, region, time, byGoal, goal]);

  const counts = countByCategory();

  return (
    <section id="meals" className="py-14 md:py-24">
      <div className="w-[min(1180px,100%-2.5rem)] mx-auto">
        <div ref={reveal} className="rise">
          <div className="max-w-[56ch] mb-9">
            <div className="shiro w-[72px] mb-5" />
            <h2
              className="text-[clamp(1.9rem,4.4vw,2.85rem)] leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {T({ en: "Every plan, sorted the way you already sort food", hi: "हर प्लान, उसी तरह छँटा जैसे आप पहले से छाँटते हैं" })}
            </h2>
            <p className="mt-4 text-[1.02rem]" style={{ color: "var(--ink-soft)" }}>
              {T({
                en: `${MEAL_LIBRARY.length} plans — ${counts.veg} vegetarian, ${counts.nonveg} non-vegetarian. Marked with the same green circle and brown triangle you read on every packet in an Indian shop.`,
                hi: `${MEAL_LIBRARY.length} प्लान — ${counts.veg} शाकाहारी, ${counts.nonveg} मांसाहारी। वही हरा गोला और भूरा त्रिकोण जो आप भारतीय दुकान के हर पैकेट पर पढ़ते हैं।`,
              })}
            </p>
          </div>

          {/* ---------- primary axis: veg / non-veg ---------- */}
          <div
            className="flex flex-wrap gap-2 p-2 rounded-2xl mb-4"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
            role="group"
            aria-label={T({ en: "Filter by food category", hi: "खाद्य श्रेणी से छाँटें" })}
          >
            <CategoryTab
              active={category === null}
              onClick={() => setCategory(null)}
              label={T({ en: "All plans", hi: "सभी प्लान" })}
              count={MEAL_LIBRARY.length}
            />
            <CategoryTab
              active={category === "veg"}
              onClick={() => setCategory("veg")}
              label={T(CATEGORY_LABEL.veg)}
              count={counts.veg}
              mark="veg"
            />
            <CategoryTab
              active={category === "nonveg"}
              onClick={() => setCategory("nonveg")}
              label={T(CATEGORY_LABEL.nonveg)}
              count={counts.nonveg}
              mark="nonveg"
            />
          </div>

          {/* ---------- the goal-driven category ---------- */}
          <button
            type="button"
            aria-pressed={byGoal}
            onClick={() => setByGoal((v) => !v)}
            className="flex items-center gap-2.5 px-4 min-h-11 rounded-xl mb-6 text-[0.88rem] font-extrabold cursor-pointer transition-colors"
            style={
              byGoal
                ? { background: "var(--kesar-fill)", color: "#fff" }
                : { border: "1px solid var(--line)", color: "var(--ink)", background: "var(--surface)" }
            }
          >
            <svg viewBox="0 0 16 16" aria-hidden className="w-4 h-4 shrink-0">
              <path
                d="M8 1.5 9.9 5.6l4.4.5-3.3 3 .9 4.4L8 11.4 4.1 13.5l.9-4.4-3.3-3 4.4-.5Z"
                fill={byGoal ? "#fff" : "var(--haldi)"}
              />
            </svg>
            {T({
              en: `For your goal — ${goalLabel.en.toLowerCase()}`,
              hi: `आपके लक्ष्य के लिए — ${goalLabel.hi}`,
            })}
            <span className="text-[0.74rem] font-medium tabular-nums" style={{ fontFamily: "var(--font-data)", opacity: 0.75 }}>
              {filterMeals({ goal }).length}
            </span>
          </button>

          {/* ---------- secondary filters ---------- */}
          <div className="flex flex-wrap gap-x-6 gap-y-3 mb-8">
            <FilterRow
              label={T({ en: "Region", hi: "क्षेत्र" })}
              options={[
                { key: null, label: T({ en: "All", hi: "सभी" }) },
                ...REGIONS.map((r) => ({ key: r.key as string | null, label: T(r.label) })),
              ]}
              value={region}
              onChange={(k) => setRegion(k as RegionKey | null)}
            />
            <FilterRow
              label={T({ en: "Meal", hi: "समय" })}
              options={[
                { key: null, label: T({ en: "All", hi: "सभी" }) },
                ...TIMES.map((t) => ({ key: t as string | null, label: T(MEAL_TIME_LABEL[t]) })),
              ]}
              value={time}
              onChange={(k) => setTime(k as MealTime | null)}
            />
          </div>

          {/* ---------- results ---------- */}
          <p className="text-[0.82rem] mb-4" style={{ color: "var(--ink-soft)" }} aria-live="polite">
            {meals.length === 1
              ? T({ en: "1 plan", hi: "1 प्लान" })
              : T({ en: `${meals.length} plans`, hi: `${meals.length} प्लान` })}
          </p>

          {meals.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: "var(--surface)", border: "1px dashed var(--line)" }}
            >
              <p style={{ color: "var(--ink-soft)" }}>
                {T({
                  en: "No plan matches that combination yet. Clear a filter to widen the search.",
                  hi: "इस संयोजन का कोई प्लान अभी नहीं है। खोज बढ़ाने के लिए कोई छँटनी हटाएँ।",
                })}
              </p>
            </div>
          ) : (
            <ul className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(268px,1fr))] list-none p-0 m-0">
              {meals.map((m) => (
                <li
                  key={m.id}
                  className="lift rounded-2xl p-5 flex flex-col"
                  style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="mt-1">
                        <FoodMark category={m.category} />
                      </span>
                      <div className="min-w-0">
                        <h3
                          className="text-[1.24rem] leading-tight"
                          style={{ fontFamily: "var(--font-display)" }}
                          lang={lang === "hi" ? "hi" : undefined}
                        >
                          {T(m.name)}
                        </h3>
                        <p
                          className="text-[0.7rem] font-semibold uppercase mt-1"
                          style={{ letterSpacing: "0.1em", color: "var(--ink-soft)" }}
                        >
                          {T(CATEGORY_LABEL[m.category])} · {T(MEAL_TIME_LABEL[m.time])}
                        </p>
                      </div>
                    </div>
                    <span
                      className="text-[1.05rem] tabular-nums whitespace-nowrap"
                      style={{ fontFamily: "var(--font-data)", color: "var(--ink-soft)" }}
                    >
                      {m.kcal}
                      <span className="text-[0.68rem]"> kcal</span>
                    </span>
                  </div>

                  <p className="text-[0.85rem] mt-3 flex-1" style={{ color: "var(--ink-soft)" }}>
                    {T(m.note)}
                  </p>

                  {m.tags.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5 mt-3 list-none p-0">
                      {m.tags.map((tg) => (
                        <li
                          key={tg}
                          className="text-[0.68rem] font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            border: "1px solid var(--line)",
                            color: "var(--ink-soft)",
                            background: "var(--roti-2)",
                          }}
                        >
                          {T(TAG_LABEL[tg])}
                        </li>
                      ))}
                    </ul>
                  )}

                  <dl
                    className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3 pt-3 text-[0.72rem]"
                    style={{ borderTop: "1px solid var(--line)", color: "var(--ink-soft)" }}
                  >
                    {(["protein", "carbohydrate", "fat", "fibre"] as const).map((n) => (
                      <div key={n} className="flex justify-between gap-1">
                        <dt>{T(NUTRIENT[n])}</dt>
                        <dd style={{ fontFamily: "var(--font-data)" }}>{m.macros[n]} g</dd>
                      </div>
                    ))}
                  </dl>

                  <RecipePanel mealId={m.id} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function CategoryTab({
  active,
  onClick,
  label,
  count,
  mark,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  mark?: FoodCategory;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="flex items-center gap-2 px-4 min-h-11 rounded-xl text-[0.92rem] font-extrabold cursor-pointer transition-colors"
      style={
        active
          ? { background: "var(--ink)", color: "var(--roti)" }
          : { color: "var(--ink)" }
      }
    >
      {mark && <FoodMark category={mark} size={16} />}
      <span>{label}</span>
      <span
        className="text-[0.74rem] tabular-nums font-medium"
        style={{
          fontFamily: "var(--font-data)",
          opacity: 0.7,
        }}
      >
        {count}
      </span>
    </button>
  );
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: string | null; label: string }[];
  value: string | null;
  onChange: (k: string | null) => void;
}) {
  return (
    <div>
      <p
        className="text-[0.68rem] font-extrabold uppercase mb-2"
        style={{ letterSpacing: "0.13em", color: "var(--ink-soft)" }}
      >
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {options.map((o) => {
          const on = o.key === value;
          return (
            <button
              key={o.key ?? "all"}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.key)}
              className="px-3 min-h-11 rounded-full text-[0.83rem] font-semibold cursor-pointer transition-colors"
              style={
                on
                  ? { background: "var(--kesar-fill)", color: "#fff" }
                  : { border: "1px solid var(--line)", color: "var(--ink-soft)" }
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
