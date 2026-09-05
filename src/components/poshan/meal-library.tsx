"use client";

import { useState, useMemo, useEffect } from "react";
import { useLang, useReveal } from "./lang-provider";
import { RecipePanel } from "./recipe-panel";
import { usePickedConditions } from "@/lib/use-conditions";
import { checkMealAll, VERDICT_COLOUR, VERDICT_LABEL, type Verdict } from "@/lib/conditions";
import {
  MEAL_LIBRARY,
  CATEGORY_LABEL,
  TAG_LABEL,
  COLLECTION_LABEL,
  MEAL_TIME_LABEL,
  NUTRIENT,
  REGIONS,
  GOALS,
  GOAL_TAGS,
  filterMeals,
  countByCategory,
  countByTag,
  type FoodCategory,
  type DietTag,
  type MealTime,
  type RegionKey,
  type GoalKey,
  type CollectionKey,
  type Plan,
  type Bi,
  type MealPlanItem,
} from "@/lib/poshan-data";

/**
 * Each meal of the day gets its own budget, not one pooled daily total —
 * general clinical guidance splits calories unevenly across the day rather
 * than in even thirds (a heavier lunch, a lighter dinner), so breakfast and
 * dinner shouldn't share a limit. Brunch stands in for breakfast+lunch when
 * used, so it carries a similar share to lunch. Shares are approximate by
 * design — the four main slots sum to 1.0; brunch is an alternate, not an
 * addition to them.
 */
const MEAL_TIME_SHARE: Record<MealTime, number> = {
  breakfast: 0.25,
  brunch: 0.3,
  lunch: 0.35,
  dinner: 0.3,
  snack: 0.1,
};

type Totals = { kcal: number; protein: number; carbohydrate: number; fat: number; fibre: number };

/**
 * Per-meal-time nutrient budget derived from the BMI-band calorie target the
 * "Check your BMI" tool already computes (plan.kcal), split by that meal's
 * share of the day. Not yet personalised against a signed-in user's own lab
 * values or logged conditions — that needs a server round trip this
 * client-only cart doesn't make yet. Macro split within each slot follows
 * the same general range used for the daily figure: protein ~20% of kcal,
 * carbohydrate ~50%, fat ~25%, fibre scaled with the same share off a flat
 * 30 g/day.
 */
function budgetForTime(plan: Plan, time: MealTime): Totals {
  const share = MEAL_TIME_SHARE[time] ?? 0.25;
  const kcal = Math.round(plan.kcal * share);
  return {
    kcal,
    protein: Math.round((kcal * 0.2) / 4),
    carbohydrate: Math.round((kcal * 0.5) / 4),
    fat: Math.round((kcal * 0.25) / 9),
    fibre: Math.round(30 * share),
  };
}

/** Cards shown before "show more" — 18 fits a comfortable scroll on first
 * load; the rest of the library (1,600+) comes in per-press batches. */
const PAGE = 18;

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

/**
 * A bolt for the Gen-Z high-protein shelf — the one shelf here that isn't
 * a diet at all, so it gets its own mark instead of borrowing the FSSAI
 * veg/non-veg shapes.
 */
function GenZMark({ active }: { active?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="w-4 h-4 shrink-0">
      <path
        d="M9.1 1 3.6 9.2h3.1L6 15l6.4-8.6H9.3Z"
        fill={active ? "#fff" : "var(--kesar)"}
      />
    </svg>
  );
}

const TIMES: MealTime[] = ["breakfast", "brunch", "lunch", "dinner", "snack"];

/** All plans, veg, non-veg, plus the two Jain/vegan sub-diets and the
 * Gen-Z high-protein shelf — one single-select row instead of a primary
 * axis plus a buried "Shelf" filter. */
type PrimaryFilter = "all" | "veg" | "nonveg" | "vegan" | "jain" | "genz";

export function MealLibrary({ goal, plan, bandName }: { goal: GoalKey; plan: Plan; bandName: Bi }) {
  const { T, lang } = useLang();
  const reveal = useReveal<HTMLDivElement>();

  const [primary, setPrimary] = useState<PrimaryFilter>("all");
  const [region, setRegion] = useState<RegionKey | null>(null);
  const [time, setTime] = useState<MealTime | null>(null);
  const [byGoal, setByGoal] = useState(false);
  const [query, setQuery] = useState("");
  /* The library runs to four figures. Mounting every card at once costs a
     visible pause on a mid-range phone, so the grid grows on request. */
  const [shown, setShown] = useState(PAGE);
  /* The cart: how many of each meal the visitor has added, and — separately
     from the dish's own tag — which meal-of-the-day slot it counts toward.
     Defaults to the dish's own `time`, but a breakfast dish eaten at dinner
     is a real thing, so it's reassignable per cart entry, not locked to the
     library's own classification. Client-only, like the rest of this tab's
     state — nothing here persists to an account yet. */
  const [cart, setCart] = useState<Record<string, { qty: number; time: MealTime }>>({});
  const addToCart = (m: MealPlanItem, delta: number) =>
    setCart((c) => {
      const prev = c[m.id];
      const qty = Math.max(0, (prev?.qty ?? 0) + delta);
      if (qty === 0) {
        const rest = { ...c };
        delete rest[m.id];
        return rest;
      }
      return { ...c, [m.id]: { qty, time: prev?.time ?? m.time } };
    });
  const reassignTime = (id: string, time: MealTime) =>
    setCart((c) => (c[id] ? { ...c, [id]: { ...c[id], time } } : c));

  /* One thali per meal-time that actually has something in it — totals and
     budget both scoped to that slot (the ASSIGNED one, not the dish's own
     tag), not pooled into one daily number. */
  const totalsByTime = useMemo(() => {
    const acc = {} as Partial<Record<MealTime, Totals>>;
    for (const [id, entry] of Object.entries(cart)) {
      if (entry.qty <= 0) continue;
      const m = MEAL_LIBRARY.find((x) => x.id === id);
      if (!m) continue;
      const t = acc[entry.time] ?? { kcal: 0, protein: 0, carbohydrate: 0, fat: 0, fibre: 0 };
      t.kcal += m.kcal * entry.qty;
      t.protein += m.macros.protein * entry.qty;
      t.carbohydrate += m.macros.carbohydrate * entry.qty;
      t.fat += m.macros.fat * entry.qty;
      t.fibre += m.macros.fibre * entry.qty;
      acc[entry.time] = t;
    }
    return acc;
  }, [cart]);
  const activeTimes = TIMES.filter((t) => totalsByTime[t]);
  const cartCount = Object.values(cart).reduce((a, b) => a + (b.qty > 0 ? b.qty : 0), 0);

  /* Conditions picked in the Biomarkers tab — shared via localStorage, see
     use-conditions.ts. Drives both the per-card verdict dot and the toast
     that fires when adding something flagged for one of them. */
  const { picked } = usePickedConditions();
  const [toast, setToast] = useState<{ mealName: string; verdict: Verdict; why?: Bi } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  function verdictFor(mealId: string) {
    if (!picked.length) return null;
    const { worst, results } = checkMealAll(mealId, picked);
    const withReasons = results.flatMap((r) => r.reasons.map((rs) => ({ ...rs, condition: r.condition })));
    /* MEAL_ATTRS only covers the original library, not every dish added
       since — an unflagged dish with zero matching rules still falls back
       to "caution" inside checkMeal, which would paint most of the library
       amber for no real reason. Only surface a verdict backed by an actual
       matched rule. */
    if (withReasons.length === 0) return null;
    return { worst, why: withReasons.find((r) => r.verdict === worst)?.why };
  }

  function handleAdd(m: MealPlanItem) {
    addToCart(m, 1);
    if (!picked.length) return;
    const v = verdictFor(m.id);
    if (v && v.worst !== "good") {
      setToast({ mealName: T(m.name), verdict: v.worst, why: v.why });
    }
  }

  const goalLabel = GOALS.find((g) => g.key === goal)!.label;

  const category: FoodCategory | null =
    primary === "veg" ? "veg" : primary === "nonveg" ? "nonveg" : null;
  const tag: DietTag | null =
    primary === "vegan" ? "vegan" : primary === "jain" ? "jain" : null;
  const collection: CollectionKey | null = primary === "genz" ? "genz" : null;

  const meals = useMemo(() => {
    const filtered = filterMeals({ category, region, time, tag, collection, goal: byGoal ? goal : null });
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
  }, [category, region, time, tag, collection, byGoal, goal, query]);

  /* Any change to the filters puts the grid back to the first page, so the
     count above the grid and the cards below it never disagree. Adjusted
     during render rather than in an effect: React re-runs this pass before
     anything paints, so the short grid never flashes at the old length. */
  const filterSig = `${primary}|${region}|${time}|${byGoal}|${goal}|${query}`;
  const [prevSig, setPrevSig] = useState(filterSig);
  if (filterSig !== prevSig) {
    setPrevSig(filterSig);
    setShown(PAGE);
  }

  const counts = countByCategory();
  const veganCount = useMemo(() => countByTag("vegan"), []);
  const jainCount = useMemo(() => countByTag("jain"), []);
  const genzCount = useMemo(() => filterMeals({ collection: "genz" }).length, []);
  const visible = meals.slice(0, shown);
  /* Browsing "All plans" is a wall of 1,600+ dishes with nothing narrowing
     what they'd actually be eating — adding only switches on once a real
     choice (veg/non-veg/vegan/Jain/Gen-Z) has been made. */
  const canAdd = primary !== "all";

  return (
    <section id="meals" className="py-14 md:py-24">
      <div className="w-[min(1180px,100%-2.5rem)] mx-auto">
        <div ref={reveal} className="rise">
          <div className="max-w-[56ch] mb-6">
            <div className="shiro w-[72px] mb-4" />
            <h2
              className="text-[clamp(1.7rem,3.8vw,2.5rem)] leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {T({ en: "Your Meals", hi: "आपके भोजन" })}
            </h2>
            <p className="mt-3 text-[0.95rem]" style={{ color: "var(--ink-soft)" }}>
              {T({
                en: `Search or filter ${MEAL_LIBRARY.length} plans, then add what you're eating — Poshan tracks it against today's budget as you go.`,
                hi: `${MEAL_LIBRARY.length} प्लान खोजें या छाँटें, फिर जो खा रहे हैं उसे जोड़ें — पोषण उसे आज के बजट के सामने ट्रैक करता है।`,
              })}
            </p>
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

          {/* ---------- primary axis: diet + shelf, one row ---------- */}
          <div
            className="flex flex-nowrap items-center gap-2 p-2 rounded-2xl mb-6 overflow-x-auto no-scrollbar"
            style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
            role="group"
            aria-label={T({ en: "Filter by diet and food category", hi: "आहार और खाद्य श्रेणी से छाँटें" })}
          >
            <CategoryTab
              active={primary === "all"}
              onClick={() => setPrimary("all")}
              label={T({ en: "All plans", hi: "सभी प्लान" })}
              count={MEAL_LIBRARY.length}
            />
            <CategoryTab
              active={primary === "veg"}
              onClick={() => setPrimary("veg")}
              label={T(CATEGORY_LABEL.veg)}
              count={counts.veg}
              mark="veg"
            />
            <CategoryTab
              active={primary === "nonveg"}
              onClick={() => setPrimary("nonveg")}
              label={T(CATEGORY_LABEL.nonveg)}
              count={counts.nonveg}
              mark="nonveg"
            />
            <CategoryTab
              active={primary === "vegan"}
              onClick={() => setPrimary("vegan")}
              label={T(TAG_LABEL.vegan)}
              count={veganCount}
              mark="veg"
            />
            <CategoryTab
              active={primary === "jain"}
              onClick={() => setPrimary("jain")}
              label={T(TAG_LABEL.jain)}
              count={jainCount}
              mark="veg"
            />
            <CategoryTab
              active={primary === "genz"}
              onClick={() => setPrimary("genz")}
              label={T(COLLECTION_LABEL.genz)}
              count={genzCount}
              icon={<GenZMark active={primary === "genz"} />}
            />

            <span
              className="shrink-0 w-px self-stretch my-1 mx-0.5"
              style={{ background: "var(--line)" }}
              aria-hidden
            />

            {/* ---------- the goal-driven category, same row ---------- */}
            <button
              type="button"
              aria-pressed={byGoal}
              onClick={() => setByGoal((v) => !v)}
              className="flex items-center gap-2.5 px-4 min-h-11 rounded-xl text-[0.88rem] font-extrabold cursor-pointer transition-colors shrink-0 whitespace-nowrap"
              style={
                byGoal
                  ? { background: "var(--kesar-fill)", color: "#fff" }
                  : { border: "1px solid var(--line)", color: "var(--ink)", background: "transparent" }
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
          </div>

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

          {primary === "genz" && (
            <p className="text-[0.85rem] mb-6 max-w-[52ch]" style={{ color: "var(--ink-soft)" }}>
              {T({
                en: "Bowls, wraps and salads built to hit a protein target.",
                hi: "प्रोटीन लक्ष्य के लिए बने बाउल, रैप और सलाद।",
              })}
            </p>
          )}

          {cartCount > 0 && (
            <div className="mb-6">
              <p
                className="flex items-center gap-1.5 text-[0.72rem] font-semibold mb-3"
                style={{ color: "var(--ink-soft)" }}
              >
                <svg viewBox="0 0 16 16" aria-hidden className="w-3.5 h-3.5 shrink-0">
                  <path
                    d="M8 1.3 13.5 3.6v4c0 3.6-2.3 6.4-5.5 7.1-3.2-.7-5.5-3.5-5.5-7.1v-4Z"
                    fill="none"
                    stroke="var(--elaichi)"
                    strokeWidth={1.4}
                  />
                  <path d="M5.6 8.1 7.3 9.8l3.1-3.6" fill="none" stroke="var(--elaichi)" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {T({
                  en: `These limits follow your BMI band (${T(bandName)}). Sign in and log biomarkers or conditions to sharpen them further.`,
                  hi: `ये सीमाएँ आपके BMI बैंड (${T(bandName)}) के अनुसार हैं। और सटीक बनाने के लिए साइन इन कर बायोमार्कर या स्थितियाँ दर्ज करें।`,
                })}
              </p>
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
                {activeTimes.map((t) => (
                  <MealTimeThali key={t} time={t} totals={totalsByTime[t]!} budget={budgetForTime(plan, t)} T={T} />
                ))}
              </div>
            </div>
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
                    <span className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className="text-[1.05rem] tabular-nums whitespace-nowrap"
                        style={{ fontFamily: "var(--font-data)", color: "var(--ink-soft)" }}
                      >
                        {m.kcal}
                        <span className="text-[0.68rem]"> kcal</span>
                      </span>
                      {/* Only rendered when a rule actually matched one of
                          the visitor's picked conditions — see verdictFor,
                          which treats "no data" as no badge rather than a
                          false amber. */}
                      {(() => {
                        const v = verdictFor(m.id);
                        if (!v || v.worst === "good") return null;
                        return (
                          <span
                            className="text-[0.64rem] font-extrabold uppercase px-1.5 py-0.5 rounded-full whitespace-nowrap"
                            style={{ background: VERDICT_COLOUR[v.worst], color: "#fff" }}
                          >
                            {T(VERDICT_LABEL[v.worst])}
                          </span>
                        );
                      })()}
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

                  <div className="flex items-center justify-between gap-2 mt-3 pt-3 flex-wrap" style={{ borderTop: "1px solid var(--line)" }}>
                    <RecipePanel mealId={m.id} />
                    {canAdd ? (
                      <div className="flex items-center gap-2">
                        {/* A breakfast dish eaten at dinner is a real thing:
                            once it's in the cart, which thali it counts
                            toward is editable, not locked to the library's
                            own tag. */}
                        {(cart[m.id]?.qty ?? 0) > 0 && (
                          <select
                            value={cart[m.id]!.time}
                            onChange={(e) => reassignTime(m.id, e.target.value as MealTime)}
                            aria-label={T({ en: "Count toward which meal", hi: "किस भोजन में गिनें" })}
                            className="text-[0.74rem] font-semibold rounded-full px-2.5 py-1.5 cursor-pointer"
                            style={{ border: "1px solid var(--line)", color: "var(--ink-soft)", background: "var(--surface)" }}
                          >
                            {TIMES.map((t) => (
                              <option key={t} value={t}>
                                {T(MEAL_TIME_LABEL[t])}
                              </option>
                            ))}
                          </select>
                        )}
                        <AddStepper
                          qty={cart[m.id]?.qty ?? 0}
                          onChange={(d) => (d > 0 ? handleAdd(m) : addToCart(m, d))}
                          T={T}
                        />
                      </div>
                    ) : (
                      <span className="text-[0.72rem]" style={{ color: "var(--ink-soft)" }}>
                        {T({ en: "Pick veg, non-veg or a diet to add", hi: "जोड़ने के लिए शाकाहारी/मांसाहारी/आहार चुनें" })}
                      </span>
                    )}
                  </div>
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

      {/* ---------- condition warning toast ---------- */}
      {toast && (
        <div
          role="status"
          className="card-in fixed z-[115] left-1/2 -translate-x-1/2 w-[min(28rem,calc(100vw-2rem))] rounded-2xl p-4 shadow-2xl flex gap-3 items-start"
          style={{
            bottom: "calc(var(--bottom-bar-h, 64px) + 1rem)",
            background: "var(--surface)",
            border: `1px solid ${VERDICT_COLOUR[toast.verdict]}`,
          }}
        >
          <span
            className="shrink-0 mt-0.5 w-2.5 h-2.5 rounded-full"
            style={{ background: VERDICT_COLOUR[toast.verdict] }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-[0.84rem] font-extrabold" style={{ color: "var(--ink)" }}>
              {T(VERDICT_LABEL[toast.verdict])}: {toast.mealName}
            </p>
            {toast.why && (
              <p className="text-[0.8rem] mt-1" style={{ color: "var(--ink-soft)" }}>
                {T(toast.why)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label={T({ en: "Dismiss", hi: "बंद करें" })}
            className="shrink-0 rounded-full p-1 transition-colors hover:opacity-70"
            style={{ color: "var(--ink-soft)" }}
          >
            <svg viewBox="0 0 16 16" aria-hidden className="w-3.5 h-3.5">
              <path d="M3 3 13 13M13 3 3 13" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}

/** Add/remove one meal from today's plate, right on its card. */
function AddStepper({
  qty,
  onChange,
  T,
}: {
  qty: number;
  onChange: (delta: number) => void;
  T: (b: { en: string; hi: string }) => string;
}) {
  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={() => onChange(1)}
        className="px-3.5 min-h-9 rounded-full text-[0.78rem] font-extrabold cursor-pointer shrink-0"
        style={{ background: "var(--kesar-fill)", color: "#fff" }}
      >
        {T({ en: "+ Add", hi: "+ जोड़ें" })}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1 shrink-0" role="group" aria-label={T({ en: "Quantity", hi: "मात्रा" })}>
      <button
        type="button"
        onClick={() => onChange(-1)}
        aria-label={T({ en: "Remove one", hi: "एक हटाएँ" })}
        className="flex items-center justify-center w-8 h-8 rounded-full cursor-pointer font-extrabold"
        style={{ border: "1px solid var(--line)", color: "var(--ink)" }}
      >
        −
      </button>
      <span className="w-5 text-center text-[0.85rem] font-extrabold tabular-nums" style={{ fontFamily: "var(--font-data)" }}>
        {qty}
      </span>
      <button
        type="button"
        onClick={() => onChange(1)}
        aria-label={T({ en: "Add one more", hi: "एक और जोड़ें" })}
        className="flex items-center justify-center w-8 h-8 rounded-full cursor-pointer font-extrabold"
        style={{ background: "var(--kesar-fill)", color: "#fff" }}
      >
        +
      </button>
    </div>
  );
}

/**
 * One meal-time's thali, running: the same steel-katori language as the 3D
 * thali (var(--steel) rims) collapsed into a card. Calories get the one big
 * bar at the top — the number that actually gates a meal — with the four
 * macros as smaller katoris underneath, 2×2. Green while a nutrient sits
 * under its budget, red the moment it clears it — the same colour the app
 * already uses for "past the healthy cutoff" everywhere else (BANDS, the
 * biomarker cards).
 */
function MealTimeThali({
  time,
  totals,
  budget,
  T,
}: {
  time: MealTime;
  totals: Totals;
  budget: Totals;
  T: (b: { en: string; hi: string }) => string;
}) {
  const calOver = totals.kcal > budget.kcal;
  const calColor = calOver ? "var(--mirch)" : "var(--elaichi)";
  const calPct = budget.kcal > 0 ? Math.min(1, totals.kcal / budget.kcal) : 0;

  const macroRows: { key: keyof Totals; label: { en: string; hi: string }; unit: string }[] = [
    { key: "protein", label: { en: "Protein", hi: "प्रोटीन" }, unit: "g" },
    { key: "carbohydrate", label: { en: "Carbs", hi: "कार्ब्स" }, unit: "g" },
    { key: "fat", label: { en: "Fat", hi: "वसा" }, unit: "g" },
    { key: "fibre", label: { en: "Fibre", hi: "रेशा" }, unit: "g" },
  ];

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "var(--surface)", border: "1px solid var(--steel-lo, var(--line))" }}
    >
      <p className="text-[0.68rem] font-extrabold uppercase mb-3.5" style={{ letterSpacing: "0.12em", color: "var(--ink-soft)" }}>
        {T(MEAL_TIME_LABEL[time])}
      </p>

      {/* ---------- the big bar: calories ---------- */}
      <div className="mb-4">
        <div className="flex justify-between items-baseline text-[0.8rem] mb-1.5">
          <span style={{ color: "var(--ink-soft)" }}>{T({ en: "Calories", hi: "कैलोरी" })}</span>
          <span className="font-extrabold tabular-nums" style={{ fontFamily: "var(--font-data)", color: calColor }}>
            {Math.round(totals.kcal)}
            <span style={{ color: "var(--ink-soft)", fontWeight: 500 }}> / {budget.kcal} kcal</span>
          </span>
        </div>
        <div
          className="h-3.5 rounded-full overflow-hidden"
          style={{ background: "color-mix(in srgb, var(--steel, var(--line)) 22%, transparent)" }}
        >
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${Math.min(100, calPct * 100)}%`, background: calColor }}
          />
        </div>
      </div>

      {/* ---------- four smaller katoris, 2×2 ---------- */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {macroRows.map((r) => {
          const value = totals[r.key];
          const target = budget[r.key];
          const over = value > target;
          const color = over ? "var(--mirch)" : "var(--elaichi)";
          const pct = target > 0 ? Math.min(1, value / target) : 0;
          return (
            <div key={r.key}>
              <div className="flex justify-between items-baseline text-[0.7rem] mb-1">
                <span style={{ color: "var(--ink-soft)" }}>{T(r.label)}</span>
                <span className="font-extrabold tabular-nums" style={{ fontFamily: "var(--font-data)", color }}>
                  {Math.round(value)}
                  <span style={{ color: "var(--ink-soft)", fontWeight: 500 }}> /{target}{r.unit}</span>
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "color-mix(in srgb, var(--steel, var(--line)) 22%, transparent)" }}
              >
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{ width: `${Math.min(100, pct * 100)}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryTab({
  active,
  onClick,
  label,
  count,
  mark,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  mark?: FoodCategory;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="flex items-center gap-2 px-4 min-h-11 rounded-xl text-[0.92rem] font-extrabold cursor-pointer transition-colors shrink-0 whitespace-nowrap"
      style={
        active
          ? { background: "var(--ink)", color: "var(--roti)" }
          : { color: "var(--ink)" }
      }
    >
      {mark && <FoodMark category={mark} size={16} />}
      {icon}
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
