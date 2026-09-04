import { MEAL_LIBRARY, BIOMARKERS, type MealPlanItem } from "./poshan-data";
import { CONDITIONS, type Condition } from "./conditions";

/**
 * Grounds the two chatbots in data Poshan already has and already cites,
 * rather than the model's own training recall — the only way "name the
 * source" can be a true statement instead of a guess.
 *
 * Retrieval is plain keyword overlap, not embeddings: proportionate for a
 * first version, and the corpus (1,101 dishes, 11 conditions) is small
 * enough that it works. Swap for real vector search if this ever needs to
 * scale past exact/near-exact name matches.
 *
 * Source note by corpus:
 *  - CONDITIONS: cites its sources inline in the data itself — ICMR-NIN
 *    Dietary Guidelines for Indians (2024), WHO, KDIGO, ICMR-INDIAB (2023),
 *    NFHS-5 — see the header comment in conditions.ts.
 *  - MEAL_LIBRARY: Poshan's own meal library. Its macro/calorie figures have
 *    no documented external citation in this codebase, so the honest
 *    attribution is "Poshan's meal library," not a specific outside
 *    authority — never claim IFCT/ICMR-NIN for these numbers unless that
 *    lineage gets verified and documented.
 *  - BIOMARKERS: general India-context notes (not a specific user's
 *    readings), used only for background framing.
 */

function keywordScore(haystack: string, terms: string[]): number {
  const lower = haystack.toLowerCase();
  return terms.reduce((n, t) => (lower.includes(t) ? n + 1 : n), 0);
}

function queryTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9ऀ-ॿ]+/)
    .filter((t) => t.length >= 3);
}

export function buildNutritionContext(query: string, maxItems = 6): string {
  const terms = queryTerms(query);
  if (terms.length === 0) return "";

  const scored = MEAL_LIBRARY.map((m: MealPlanItem) => ({
    meal: m,
    score: keywordScore(`${m.name.en} ${m.name.hi} ${m.tags?.join(" ") ?? ""}`, terms),
  }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems);

  if (scored.length === 0) return "";

  const lines = scored.map(({ meal }) => {
    const m = meal.macros;
    return `- ${meal.name.en} (${meal.region ?? "pan-Indian"}, ${meal.time}): ${meal.kcal} kcal, protein ${m.protein}g, carbs ${m.carbohydrate}g, fat ${m.fat}g, fibre ${m.fibre}g. Tags: ${meal.tags?.join(", ") ?? "none"}.`;
  });

  return [
    "Matching dishes from Poshan's own meal library (source: Poshan's meal library, not an external database):",
    ...lines,
  ].join("\n");
}

export function buildHealthContext(query: string, selectedConditionKeys: string[] = []): string {
  const terms = queryTerms(query);

  const selected = CONDITIONS.filter((c) => selectedConditionKeys.includes(c.key));
  const scored = CONDITIONS.filter((c) => !selectedConditionKeys.includes(c.key))
    .map((c) => ({
      condition: c,
      score: keywordScore(`${c.name.en} ${c.key} ${c.principle.en}`, terms),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.condition);

  const conditions = [...selected, ...scored];
  if (conditions.length === 0 && terms.length === 0) return "";

  const conditionText = conditions.map((c: Condition) =>
    [
      `${c.name.en}: ${c.principle.en}`,
      `Prevalence: ${c.prevalence.en}`,
      `Favour: ${c.favour.map((f) => f.en).join("; ")}`,
      `Limit: ${c.limit.map((f) => f.en).join("; ")}`,
      `Common mistake: ${c.watchOut.en}`,
    ].join("\n")
  );

  const biomarkerHits = BIOMARKERS.filter((b) => keywordScore(`${b.short} ${b.full.en}`, terms) > 0).map(
    (b) => `${b.short} (${b.full.en}): ${b.why.en}`
  );

  const parts: string[] = [];
  if (conditionText.length) {
    parts.push(
      "Relevant condition guidance (source: ICMR-NIN Dietary Guidelines for Indians (2024), WHO, KDIGO, ICMR-INDIAB (2023), NFHS-5 — see each line for the specific citation):\n" +
        conditionText.join("\n\n")
    );
  }
  if (biomarkerHits.length) {
    parts.push("Relevant biomarker background (Poshan's own India-context notes):\n" + biomarkerHits.join("\n"));
  }
  return parts.join("\n\n");
}
