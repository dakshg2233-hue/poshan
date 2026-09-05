/**
 * The Poshan Daily Decision Engine — the "what should I eat today" logic
 * behind /api/daily and the dashboard's Today card.
 *
 * Deliberately rule-based, not machine-learned: a genuinely "continuously
 * learning" recommender needs a volume of real usage data this app doesn't
 * have yet. What this collects instead — logged meals, pantry state, a
 * busy/budget context per day — is exactly the structured data a future
 * learned model would need, so shipping the honest rules-based version
 * first is what makes the ML version possible later, not a stand-in for it.
 *
 * Reuses the same shape as clinician-plan.ts#draftCarePlan (diet/region
 * match, checkMealAll() safety gate, goal-tag ranking) but adds the signals
 * only a consumer's own daily use produces: what they logged yesterday (so
 * today doesn't just repeat it), what's sitting in their kitchen, and
 * whether today is a busy day.
 */

import {
  MEAL_LIBRARY,
  GOALS,
  GOAL_TAGS,
  type MealPlanItem,
  type MealTime,
  type RegionKey,
  type DietKey,
  type GoalKey,
  type Bi,
} from "./poshan-data";
import { checkMealAll, type ConditionKey } from "./conditions";

const MEAL_TIMES: MealTime[] = ["breakfast", "lunch", "dinner"];

// ---------------------------------------------------------------- pantry
/**
 * A fixed catalog of Indian-kitchen staples, matched against each dish's
 * own recorded `note` text (e.g. "Aloo + onion/tomato + oil; ...") rather
 * than an invented ingredients database — MEAL_LIBRARY carries no
 * structured ingredient list per dish, so keyword-matching the text that's
 * already there is the most honest signal available. It's a coarse match,
 * not a precise one: a user marking "paneer" in stock boosts every dish
 * whose note mentions paneer, nothing more granular than that.
 */
export const PANTRY_STAPLES = [
  { key: "rice", label: { en: "Rice", hi: "चावल" }, keywords: ["rice", "chawal", "pulao", "biryani"] },
  { key: "atta", label: { en: "Wheat flour / roti", hi: "आटा / रोटी" }, keywords: ["roti", "chapati", "atta", "paratha", "naan"] },
  { key: "dal", label: { en: "Dal / lentils", hi: "दाल" }, keywords: ["dal", "lentil", "moong", "toor", "masoor", "chana", "rajma", "sambar"] },
  { key: "potato", label: { en: "Potato", hi: "आलू" }, keywords: ["aloo", "potato"] },
  { key: "onion_tomato", label: { en: "Onion & tomato", hi: "प्याज़-टमाटर" }, keywords: ["onion", "tomato"] },
  { key: "paneer", label: { en: "Paneer", hi: "पनीर" }, keywords: ["paneer", "cottage cheese", "cheese"] },
  { key: "egg", label: { en: "Eggs", hi: "अंडे" }, keywords: ["egg"] },
  { key: "chicken", label: { en: "Chicken", hi: "चिकन" }, keywords: ["chicken", "murgh"] },
  { key: "fish_seafood", label: { en: "Fish / seafood", hi: "मछली" }, keywords: ["fish", "prawn", "mackerel", "salmon", "shrimp"] },
  { key: "mutton", label: { en: "Mutton", hi: "मटन" }, keywords: ["mutton", "lamb", "goat"] },
  { key: "milk_curd", label: { en: "Milk & curd", hi: "दूध-दही" }, keywords: ["milk", "curd", "dahi", "yogurt", "yoghurt", "paneer"] },
  { key: "vegetables", label: { en: "Mixed vegetables", hi: "सब्ज़ियाँ" }, keywords: ["spinach", "palak", "gobi", "cauliflower", "peas", "matar", "beans", "vegetable", "bhindi", "okra", "capsicum"] },
  { key: "nuts", label: { en: "Nuts & seeds", hi: "मेवे" }, keywords: ["almond", "cashew", "peanut", "walnut", "seeds", "nuts"] },
  { key: "oats_quinoa", label: { en: "Oats / quinoa / millets", hi: "ओट्स / क्विनोआ / मिलेट" }, keywords: ["oats", "quinoa", "millet", "poha", "daliya", "ragi"] },
] as const;

export type PantryStapleKey = (typeof PANTRY_STAPLES)[number]["key"];

function dishText(meal: MealPlanItem): string {
  return `${meal.name.en} ${meal.note.en}`.toLowerCase();
}

/** Which pantry staples a dish draws on, inferred from its own note text. */
export function dishStaples(meal: MealPlanItem): PantryStapleKey[] {
  const text = dishText(meal);
  return PANTRY_STAPLES.filter((s) => s.keywords.some((k) => text.includes(k))).map((s) => s.key);
}

// ------------------------------------------------------------ cost tier
export type CostTier = "budget" | "moderate" | "premium";

const PREMIUM_MARKERS = ["mutton", "lamb", "prawn", "shrimp", "salmon", "cashew", "almond", "quinoa", "cheese"];
const MODERATE_MARKERS = ["chicken", "paneer", "fish", "mackerel", "egg", "oats", "nuts", "walnut"];

/**
 * A *relative* cost estimate derived from each dish's own recorded
 * ingredients — not real market pricing. Poshan has no ingredient-price
 * data source wired in; read this as "roughly cheaper/pricier than
 * average for an Indian kitchen", never as a rupee figure.
 */
export function estimateCostTier(meal: MealPlanItem): CostTier {
  const text = dishText(meal);
  if (PREMIUM_MARKERS.some((m) => text.includes(m))) return "premium";
  if (MODERATE_MARKERS.some((m) => text.includes(m))) return "moderate";
  return "budget";
}

// ---------------------------------------------------------- quick prep
const QUICK_MARKERS = ["salad", "bowl", "wrap", "smoothie", "overnight", "sandwich", "toast", "chaat"];

/**
 * Whether a dish is a reasonable "short on time" pick. Approximated from
 * the Gen-Z assembly shelf (bowls/wraps/salads — COLLECTIONS' own
 * description of that shelf) plus a few prep-style keywords.
 * MEAL_LIBRARY has no recorded prep time, so this is a heuristic, not a
 * measured one.
 */
export function isQuickPrep(meal: MealPlanItem): boolean {
  if ((meal.collection ?? "classic") === "genz") return true;
  const text = dishText(meal);
  return QUICK_MARKERS.some((m) => text.includes(m));
}

// -------------------------------------------------------------- vrat mode
const VRAT_MARKERS = [
  "sabudana", "sabu dana", "sago", "kuttu", "buckwheat", "singhara", "singhare",
  "rajgira", "amaranth", "samak", "sama rice", "vrat", "farali", "makhana",
  "fox nut", "sendha namak",
];

/**
 * Whether a dish is recognisably fasting-friendly (Navratri, Ekadashi,
 * Karva Chauth and similar vrat days) — detected the same way as pantry
 * staples, by keyword match against the dish's own note text. Coverage is
 * genuinely thin: MEAL_LIBRARY was built for everyday eating, not vrat
 * days, so most dishes simply won't match. recommendToday() below falls
 * back to the normal candidate set when nothing vrat-specific is safe and
 * eligible, rather than returning nothing.
 */
export function isVratFriendly(meal: MealPlanItem): boolean {
  const text = dishText(meal);
  return VRAT_MARKERS.some((m) => text.includes(m));
}

export type DayType = "normal" | "vrat" | "festival";

// --------------------------------------------------------- the engine
export interface DailyPick {
  id: string;
  name: Bi;
  time: MealTime;
  kcal: number;
  costTier: CostTier;
  quickPrep: boolean;
  /** Short, human-readable reasons this dish was picked, most relevant first. */
  reasons: Bi[];
}

export interface DailyRecommendation {
  targetKcal: number;
  totalKcal: number;
  picks: DailyPick[];
}

function dietMatches(meal: MealPlanItem, diet: DietKey): boolean {
  switch (diet) {
    case "veg":
      return meal.category === "veg";
    case "vegan":
      return meal.category === "veg" && meal.tags.includes("vegan");
    case "jain":
      return meal.category === "veg" && meal.tags.includes("jain");
    case "nonveg":
      return true;
  }
}

function regionMatches(meal: MealPlanItem, region: RegionKey | null): boolean {
  if (!meal.region) return true;
  if (!region) return true;
  return meal.region === region;
}

const REASON = {
  goal: (goal: GoalKey): Bi => {
    const def = GOALS.find((g) => g.key === goal);
    return { en: `Matches your ${def?.label.en.toLowerCase() ?? "goal"} focus`, hi: `आपके लक्ष्य के अनुसार` };
  },
  pantry: { en: "Uses what's already in your kitchen", hi: "आपकी रसोई में मौजूद सामग्री से" } as Bi,
  quick: { en: "Quick to make on a busy day", hi: "व्यस्त दिन के लिए जल्दी बनने वाला" } as Bi,
  budget: { en: "Fits today's budget", hi: "आज के बजट में" } as Bi,
  variety: { en: "Something different from the last two days", hi: "पिछले दो दिनों से अलग" } as Bi,
  vrat: { en: "Fasting-friendly for today", hi: "आज के व्रत के लिए उपयुक्त" } as Bi,
} as const;

/**
 * Drafts one day's recommendation (breakfast/lunch/dinner) from real
 * MEAL_LIBRARY dishes. Simple and greedy on purpose, same as
 * draftCarePlan: not a macro-optimising solver, a transparent ranked pick
 * the user can see the reasoning for and swap freely.
 */
export function recommendToday(input: {
  region: RegionKey | null;
  diet: DietKey;
  goal: GoalKey;
  maintenanceKcal: number | null;
  conditions: ConditionKey[];
  /** Dish ids logged in the last two days — deprioritised so today doesn't just repeat them. */
  recentDishIds: string[];
  /** Pantry staples currently marked in stock. Empty = no pantry signal, nothing penalised. */
  pantryStaples: PantryStapleKey[];
  isBusy: boolean;
  budgetPref: CostTier | null;
  /** "vrat" tries fasting-friendly dishes first, falling back to the normal
   *  candidate set when none are safe and eligible for a given meal-time. */
  dayType?: DayType;
}): DailyRecommendation {
  const goalDef = GOALS.find((g) => g.key === input.goal);
  const targetKcal = Math.max(1200, (input.maintenanceKcal ?? 2000) + (goalDef?.kcal ?? 0));
  const goalTags = GOAL_TAGS[input.goal] ?? [];
  const perMealBudget = targetKcal / MEAL_TIMES.length;
  const recent = new Set(input.recentDishIds);
  const dayType = input.dayType ?? "normal";

  const picks: DailyPick[] = [];

  for (const time of MEAL_TIMES) {
    const baseCandidates = MEAL_LIBRARY.filter(
      (m) => m.time === time && dietMatches(m, input.diet) && regionMatches(m, input.region)
    );

    /* On a vrat day, prefer dishes recognisably fasting-friendly; only fall
       back to the everyday set if nothing vrat-specific is safe. */
    const vratCandidates = dayType === "vrat" ? baseCandidates.filter(isVratFriendly) : [];
    const usingVratSet = vratCandidates.length > 0;
    const candidates = usingVratSet ? vratCandidates : baseCandidates;

    const scored = candidates
      .map((meal) => ({ meal, check: checkMealAll(meal.id, input.conditions) }))
      .filter(({ check }) => check.worst !== "avoid");

    if (scored.length === 0) continue; // nothing safe for this meal-time

    const ranked = scored.map(({ meal }) => {
      const reasons: Bi[] = [];
      let score = 0;

      if (usingVratSet) {
        score += 4;
        reasons.push(REASON.vrat);
      }

      const goalTagCount = meal.tags.filter((t) => goalTags.includes(t)).length;
      score += goalTagCount * 3;
      if (goalTagCount > 0) reasons.push(REASON.goal(input.goal));

      if (input.pantryStaples.length > 0) {
        const overlap = dishStaples(meal).filter((s) => input.pantryStaples.includes(s)).length;
        score += overlap * 2;
        if (overlap > 0) reasons.push(REASON.pantry);
      }

      const quick = isQuickPrep(meal);
      if (input.isBusy && quick) {
        score += 2;
        reasons.push(REASON.quick);
      }

      const costTier = estimateCostTier(meal);
      if (input.budgetPref) {
        if (costTier === input.budgetPref) {
          score += 2;
          reasons.push(REASON.budget);
        } else if (input.budgetPref === "budget" && costTier === "premium") {
          score -= 2;
        }
      }

      if (recent.has(meal.id)) {
        score -= 6; // strongly deprioritised, not hard-excluded — still the fallback if nothing else is safe/eligible
      } else if (recent.size > 0) {
        reasons.push(REASON.variety);
      }

      score -= Math.abs(meal.kcal - perMealBudget) / 50; // tie-break toward the calorie budget

      return { meal, score, reasons, costTier, quick };
    });

    ranked.sort((a, b) => b.score - a.score);
    const best = ranked[0];

    picks.push({
      id: best.meal.id,
      name: best.meal.name,
      time,
      kcal: best.meal.kcal,
      costTier: best.costTier,
      quickPrep: best.quick,
      reasons: best.reasons.slice(0, 3),
    });
  }

  return {
    targetKcal: Math.round(targetKcal),
    totalKcal: picks.reduce((sum, p) => sum + p.kcal, 0),
    picks,
  };
}
