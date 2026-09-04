/**
 * Care-plan drafting for the clinician platform.
 *
 * Deliberately NOT built on buildPlan() (the consumer BMI-tool's "Your
 * Plate" tab): buildPlan() returns free-text breakfast/lunch/dinner strings
 * from KITCHEN, which carry no dish id — there is nothing for
 * checkMealAll() to check them against. A clinician-facing plan has to be
 * built from real MEAL_LIBRARY entries specifically because the promised
 * "11-condition safety checker on every plan you send" (CLINIC_TIERS,
 * poshan-data.ts) only exists at the dish-id level, in conditions.ts.
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
import { checkMealAll, type ConditionKey, type Verdict } from "./conditions";

export interface DraftedDish {
  id: string;
  name: Bi;
  time: MealTime;
  kcal: number;
}

export interface SafetyFlag {
  mealId: string;
  mealName: Bi;
  condition: ConditionKey;
  verdict: Verdict;
  why: Bi;
}

export interface CarePlanDraft {
  dishes: DraftedDish[];
  targetKcal: number;
  totalKcal: number;
  /** Every non-"good" verdict on a chosen dish, kept even though nothing
   *  marked "avoid" was ever eligible to be picked — a "caution" dish can
   *  still be the best available option, and the clinician should see why
   *  before approving, not just that it wasn't outright excluded. */
  safetyFlags: SafetyFlag[];
}

const MEAL_TIMES: MealTime[] = ["breakfast", "lunch", "dinner"];

function dietMatches(meal: MealPlanItem, diet: DietKey): boolean {
  switch (diet) {
    case "veg":
      return meal.category === "veg";
    case "vegan":
      return meal.category === "veg" && meal.tags.includes("vegan");
    case "jain":
      return meal.category === "veg" && meal.tags.includes("jain");
    case "nonveg":
      return true; // a non-veg diet still includes veg dishes
  }
}

function regionMatches(meal: MealPlanItem, region: RegionKey | null): boolean {
  if (!meal.region) return true; // pan-Indian (genz shelf) fits any region
  if (!region) return true; // patient's region not on file — don't over-filter
  return meal.region === region;
}

/**
 * Drafts one day's plan (breakfast/lunch/dinner) from real MEAL_LIBRARY
 * dishes: filtered to the patient's diet and region, cross-checked against
 * every one of their recorded conditions, dishes that come back "avoid" for
 * ANY condition excluded entirely, the rest ranked by how many of the
 * goal's target tags (GOAL_TAGS) they carry, then the one that lands
 * closest to the remaining calorie budget for that meal-time is picked.
 *
 * Simple and greedy on purpose for Phase 1 — not a macro-optimising solver.
 * The clinician reviews and can re-draft; nothing here is sent to the
 * patient until they explicitly approve (care_plans.status starts 'draft').
 */
export function draftCarePlan(input: {
  region: RegionKey | null;
  diet: DietKey;
  goal: GoalKey;
  maintenanceKcal: number | null;
  conditions: ConditionKey[];
  /** "Plan templates your practice can reuse" (CLINIC_TIERS). A template
   *  only ever supplies a starting *preference* per meal-time — every
   *  templated dish still goes through the same checkMealAll() gate below,
   *  and one dish coming back "avoid" for THIS patient falls straight back
   *  to the normal search rather than being served anyway. A template
   *  never bypasses the safety checker for a patient it wasn't written
   *  for. */
  template?: { id: string; time: MealTime }[];
}): CarePlanDraft {
  const goalDef = GOALS.find((g) => g.key === input.goal);
  const targetKcal = Math.max(1200, (input.maintenanceKcal ?? 2000) + (goalDef?.kcal ?? 0));
  const goalTags = GOAL_TAGS[input.goal] ?? [];
  const perMealBudget = targetKcal / MEAL_TIMES.length;

  const dishes: DraftedDish[] = [];
  const safetyFlags: SafetyFlag[] = [];

  for (const time of MEAL_TIMES) {
    const templated = input.template?.find((t) => t.time === time);
    const templatedMeal = templated ? MEAL_LIBRARY.find((m) => m.id === templated.id) : undefined;
    const templatedCheck = templatedMeal ? checkMealAll(templatedMeal.id, input.conditions) : null;

    let meal: MealPlanItem;
    let check: ReturnType<typeof checkMealAll>;

    if (templatedMeal && templatedCheck && templatedCheck.worst !== "avoid") {
      meal = templatedMeal;
      check = templatedCheck;
    } else {
      const candidates = MEAL_LIBRARY.filter(
        (m) => m.time === time && dietMatches(m, input.diet) && regionMatches(m, input.region)
      );

      const scored = candidates
        .map((m) => ({ meal: m, check: checkMealAll(m.id, input.conditions) }))
        .filter(({ check: c }) => c.worst !== "avoid");

      if (scored.length === 0) continue; // nothing safe for this meal-time; clinician sees the gap in totalKcal falling short

      scored.sort((a, b) => {
        const aTags = a.meal.tags.filter((t) => goalTags.includes(t)).length;
        const bTags = b.meal.tags.filter((t) => goalTags.includes(t)).length;
        if (aTags !== bTags) return bTags - aTags;
        return Math.abs(a.meal.kcal - perMealBudget) - Math.abs(b.meal.kcal - perMealBudget);
      });

      meal = scored[0].meal;
      check = scored[0].check;
    }

    dishes.push({ id: meal.id, name: meal.name, time, kcal: meal.kcal });

    for (const result of check.results) {
      if (result.verdict !== "good") {
        safetyFlags.push({
          mealId: meal.id,
          mealName: meal.name,
          condition: result.condition,
          verdict: result.verdict,
          why: result.reasons[0]?.why ?? { en: "", hi: "" },
        });
      }
    }
  }

  return {
    dishes,
    targetKcal: Math.round(targetKcal),
    totalKcal: dishes.reduce((sum, d) => sum + d.kcal, 0),
    safetyFlags,
  };
}
