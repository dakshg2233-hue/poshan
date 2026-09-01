"use client";

import { useState, useMemo } from "react";
import { useLang, useReveal } from "./lang-provider";
import { FoodScanner } from "./food-scanner";
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
  COLLECTIONS,
  filterMeals,
  countByCategory,
  countByCollection,
  type FoodCategory,
  type MealTime,
  type RegionKey,
  type GoalKey,
  type CollectionKey,
} from "@/lib/poshan-data";

/** Cards added per "show more" press. */
const PAGE = 60;

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
  const [collection, setCollection] = useState<CollectionKey | null>(null);
  const [byGoal, setByGoal] = useState(false);
  const [query, setQuery] = useState("");
  /* The library runs to four figures. Mounting every card at once costs a
     visible pause on a mid-range phone, so the grid grows on request. */
  const [shown, setShown] = useState(PAGE);

  const goalLabel = GOALS.find((g) => g.key === goal)!.label;

  const meals = useMemo(() => {
    const filtered = filterMeals({ category, region, time, collection, goal: byGoal ? goal : null });
    /* Name and note, both languages regardless of which is on screen: Indian
       dish names get typed in either script, and someone reading the English
       copy still searches "पनीर". Applied after the filters so the count the
       filters report stays truthful. */
    const term = query.trim().toLowerCase();
    const base = term
      ? filtered.filter((m) =>
          `${m.name.en} ${m.name.hi} ${m.note.en} ${m.note.hi}`
            .toLowerCase()
            .includes(term)
        )
      : filtered;
    if (!byGoal) return base;
    /* Richest match first, then most protein, so "high protein" is an
       ordering, not just a label. */
    const wanted = GOAL_TAGS[goal];
    return [...base].sort(
      (a, b) =>
        b.tags.filter((t) => wanted.includes(t)).length -
          a.tags.filter((t) => wanted.includes(t)).length ||
        b.macros.protein - a.macros.protein
    );
  }, [category, region, time, collection, byGoal, goal, query]);

  /* Any change to the filters puts the grid back to the first page, so the
     count above the grid and the cards below it never disagree. Adjusted
     during render rather than in an effect: React re-runs this pass before
     anything paints, so the short grid never flashes at the old length. */
  const filterSig = `${category}|${region}|${time}|${collection}|${byGoal}|${goal}|${query}`;
  const [prevSig, setPrevSig] = useState(filterSig);
  if (filterSig !== prevSig) {
    setPrevSig(filterSig);
    setShown(PAGE);
  }

  const counts = countByCategory();
  const collectionCounts = useMemo(() => countByCollection(), []);
  const visible = meals.slice(0, shown);

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
                en: `${MEAL_LIBRARY.length} plans: ${counts.veg} vegetarian, ${counts.nonveg} non-vegetarian. Marked with the same green circle and brown triangle you read on every packet in an Indian shop.`,
                hi: `${MEAL_LIBRARY.length} प्लान: ${counts.veg} शाकाहारी, ${counts.nonveg} मांसाहारी। वही हरा गोला और भूरा त्रिकोण जो आप भारतीय दुकान के हर पैकेट पर पढ़ते हैं।`,
              })}
            </p>
          </div>

          {/* ---------- food scanner (free feature) ---------- */}
          <div className="mb-8">
            <FoodScanner isPremium={false} />
          </div>

          {/* ---------- search ---------- */}
          {/* Above the filters, because it cuts across all of them: typing a
              dish name should find it whatever the region and meal chips are
              set to. Clearing is a real button rather than the browser's own
              search affordance, which Safari draws and Firefox does not. */}
          <div className="relative mb-4">
            <svg
              viewBox="0 0 20 20"
              aria-hidden
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[17px] h-[17px] pointer-events-none"
              style={{ color: "var(--ink-soft)" }}
            >
              <circle cx={9} cy={9} r={6} fill="none" stroke="currentColor" strokeWidth={2} />
              <path d="M13.5 13.5 17.5 17.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={T({
                en: "Search plans by name",
                hi: "नाम से प्लान खोजें",
              })}
              aria-label={T({ en: "Search meal plans", hi: "भोजन प्लान खोजें" })}
              className="w-full pl-11 pr-11 min-h-12 rounded-2xl text-[0.95rem] outline-none transition-colors"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                color: "var(--ink)",
              }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={T({ en: "Clear search", hi: "खोज साफ़ करें" })}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full cursor-pointer transition-colors"
                style={{ color: "var(--ink-soft)" }}
              >
                <svg viewBox="0 0 16 16" aria-hidden className="w-3.5 h-3.5">
                  <path
                    d="M3 3 13 13M13 3 3 13"
                    stroke="currentColor"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
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
              en: `For your goal, ${goalLabel.en.toLowerCase()}`,
              hi: `आपके लक्ष्य के लिए, ${goalLabel.hi}`,
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
            <FilterRow
              label={T({ en: "Shelf", hi: "श्रेणी" })}
              options={[
                { key: null, label: T({ en: "All", hi: "सभी" }) },
                ...COLLECTIONS.map((c) => ({
                  key: c.key as string | null,
                  label: `${T(c.label)} (${collectionCounts[c.key]})`,
                })),
              ]}
              value={collection}
              onChange={(k) => setCollection(k as CollectionKey | null)}
            />
          </div>

          {collection && (
            <p className="text-[0.85rem] mb-6 max-w-[52ch]" style={{ color: "var(--ink-soft)" }}>
              {T(COLLECTIONS.find((c) => c.key === collection)!.blurb)}
            </p>
          )}

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
              {visible.map((m, i) => (
                <li
                  key={m.id}
                  /* Fill, border and depth all come from .surface-card. No
                     inline background here: an inline style beats the
                     stylesheet and would flatten the card back out. */
                  className="surface-card lift card-in rounded-2xl p-5 flex flex-col"
                  /* Stagger index, capped at 11 and reset once per page so
                     each "show more" batch waves in the same way the first
                     one did. Uncapped, the sixtieth card would wait a second
                     and a half; unmodulated, every appended card would carry
                     the cap and land in one flat block. */
                  style={{ "--i": Math.min(i % PAGE, 11) } as React.CSSProperties}
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

          {meals.length > visible.length && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className="px-6 py-3 rounded-full text-[0.9rem]"
                style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink)" }}
              >
                {T({
                  en: `Show ${Math.min(PAGE, meals.length - visible.length)} more of ${meals.length}`,
                  hi: `${meals.length} में से ${Math.min(PAGE, meals.length - visible.length)} और दिखाएँ`,
                })}
              </button>
            </div>
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
