import type { Bi, MealPlanItem } from "./poshan-data";

/**
 * Portions in the units Indians actually serve food in.
 *
 * Every nutrition app in the market answers "how much?" in grams. Nobody
 * owns a kitchen scale and nobody wants to; the unit an Indian kitchen
 * measures in is the katori, the roti, the ladle and the piece. "180g dal"
 * is a number you have to translate before you can act on it. "1 katori
 * dal" is an instruction.
 *
 * This module is the translation layer: it takes a dish and a share of the
 * day's energy, and returns the household measure that gets you there —
 * scaled by the user's *own* katori, which portion-calibration.tsx has
 * already measured against a ₹10 coin and stored in profiles.portion_scale.
 * That calibration is what makes this honest rather than a nicer-sounding
 * guess: a Delhi katori and a Chennai katori differ by roughly a third.
 */

/** The household units, with the reference weight one of them holds. */
export type PortionUnit = "katori" | "roti" | "piece" | "glass" | "plate" | "bowl";

export const UNIT_LABEL: Record<PortionUnit, { one: Bi; many: Bi }> = {
  katori: { one: { en: "katori", hi: "कटोरी" }, many: { en: "katoris", hi: "कटोरी" } },
  roti: { one: { en: "roti", hi: "रोटी" }, many: { en: "rotis", hi: "रोटी" } },
  piece: { one: { en: "piece", hi: "टुकड़ा" }, many: { en: "pieces", hi: "टुकड़े" } },
  glass: { one: { en: "glass", hi: "गिलास" }, many: { en: "glasses", hi: "गिलास" } },
  plate: { one: { en: "plate", hi: "प्लेट" }, many: { en: "plates", hi: "प्लेट" } },
  bowl: { one: { en: "bowl", hi: "बाउल" }, many: { en: "bowls", hi: "बाउल" } },
};

/**
 * Approximate kcal in one standard unit of each kind, at portion_scale 1.0.
 *
 * These are reference figures for the *vessel*, not for any specific dish —
 * a standard katori holds 150–200ml, and a katori of dal and a katori of
 * kheer are wildly different energies. So the vessel figure is only ever
 * used to pick a sensible unit and round to a servable fraction; the actual
 * energy always comes from the dish's own recorded kcal. Mixing those two
 * up is how you end up confidently reporting a wrong number.
 */
const UNIT_REFERENCE_KCAL: Record<PortionUnit, number> = {
  katori: 120,
  roti: 80,
  piece: 90,
  glass: 110,
  plate: 350,
  bowl: 200,
};

/** Which unit a dish is served in, inferred from its own name and note. */
export function unitForDish(meal: Pick<MealPlanItem, "name" | "note">): PortionUnit {
  const text = `${meal.name.en} ${meal.note.en}`.toLowerCase();

  /* The trailing `s?` matters more than it looks. Notes in the meal
     library are written the way a person would say them — "180 g paneer
     with spinach & 2 rotis" — and without it every plural fell through
     to the "bowl" fallback, so a dish whose only bread signal lives in
     its note was portioned in bowls. 11 notes in poshan-data.ts are
     written that way. Hindi nouns here don't inflect, so this is an
     English-side fix only. */
  if (/\b(roti|chapati|phulka|paratha|naan|kulcha|bhakri|thepla)s?\b/.test(text)) return "roti";
  if (/\b(idli|vada|dosa|samosa|tikki|cutlet|kebab|paneer tikka|egg)s?\b/.test(text)) return "piece";
  if (/\b(lassi|chaas|buttermilk|smoothie|milk|juice|shake)s?\b/.test(text)) return "glass";
  if (/\b(thali|platter|plate|biryani|pulao|khichdi|fried rice)s?\b/.test(text)) return "plate";
  if (/\b(dal|sabzi|curry|curries|rajma|chana|sambar|rasam|curd|dahi|kheer|raita)s?\b/.test(text)) return "katori";
  return "bowl";
}

/**
 * Round to something a person can actually serve.
 *
 * Halves and quarters only, and never below a quarter — "0.3 katori" is not
 * an instruction anyone can follow, and rounding it to something servable
 * is more useful than the precision it gives up. Above three units we drop
 * the fraction entirely: nobody measures 3¼ rotis.
 */
function toServable(qty: number): number {
  if (qty <= 0) return 0;
  if (qty < 0.375) return 0.25;
  if (qty >= 3) return Math.round(qty);
  return Math.round(qty * 2) / 2;
}

/** "1½ katoris", "2 rotis", "¾ katori" — the string a user reads. */
export function formatQty(qty: number, unit: PortionUnit, lang: "en" | "hi"): string {
  const whole = Math.floor(qty);
  const frac = qty - whole;

  const fracGlyph = frac === 0.25 ? "¼" : frac === 0.5 ? "½" : frac === 0.75 ? "¾" : "";
  const number = whole === 0 ? fracGlyph : `${whole}${fracGlyph}`;

  const label = UNIT_LABEL[unit];
  /* Hindi doesn't pluralise these nouns the way English does — रोटी is both
     "roti" and "rotis" — so the `many` entries are intentionally identical
     to `one` on the Hindi side rather than being a missing translation. */
  const word = qty > 1 ? label.many[lang] : label.one[lang];
  return `${number} ${word}`;
}

export type Portion = {
  unit: PortionUnit;
  /** Servable quantity, already scaled to this user's own katori. */
  qty: number;
  /** The energy this portion actually delivers, from the dish's own data. */
  kcal: number;
  /** Pre-formatted for both languages, so renderers don't repeat the maths. */
  text: Bi;
};

/**
 * How much of this dish to eat to hit `targetKcal`.
 *
 * `portionScale` is the user's calibrated katori from profiles.portion_scale
 * (0.75 / 1.0 / 1.25 / 1.5) — a larger katori means fewer katoris for the
 * same energy, which is why it divides rather than multiplies.
 */
export function prescribePortion(
  meal: Pick<MealPlanItem, "name" | "note" | "kcal">,
  targetKcal: number,
  portionScale = 1
): Portion {
  const unit = unitForDish(meal);

  /* One serving of the dish as recorded is the baseline. How many of those
     servings the target implies is a straight ratio — the dish's own kcal
     is the only energy figure used anywhere in this calculation. */
  const servings = meal.kcal > 0 ? targetKcal / meal.kcal : 1;

  /* A bigger vessel carries more per unit, so the same energy needs fewer
     of them. Guard against a nonsense scale so a corrupt profile row can't
     produce Infinity. */
  const safeScale = portionScale > 0.1 && portionScale < 4 ? portionScale : 1;
  const qty = toServable(servings / safeScale);

  /* Report the energy of what we actually prescribed, not of what we
     wanted — after rounding to a servable fraction those differ, and
     showing the target would be reporting a number the user isn't eating. */
  const kcal = Math.round(qty * safeScale * meal.kcal);

  return {
    unit,
    qty,
    kcal,
    text: {
      en: formatQty(qty, unit, "en"),
      hi: formatQty(qty, unit, "hi"),
    },
  };
}

/**
 * A whole meal's worth of portions, sharing out `targetKcal` across dishes.
 *
 * Split is by each dish's own recorded energy rather than evenly: a thali
 * of dal, sabzi and rice should not prescribe equal katoris of all three,
 * and weighting by recorded kcal keeps the proportions close to how the
 * meal is actually eaten.
 */
export function prescribeMeal(
  meals: Pick<MealPlanItem, "name" | "note" | "kcal">[],
  targetKcal: number,
  portionScale = 1
): Portion[] {
  const total = meals.reduce((sum, m) => sum + m.kcal, 0);
  if (total <= 0) return meals.map((m) => prescribePortion(m, targetKcal, portionScale));

  return meals.map((m) =>
    prescribePortion(m, targetKcal * (m.kcal / total), portionScale)
  );
}

/** Reference weight of one unit, for the rare place a gram figure is
 *  genuinely wanted (a clinician's printed sheet, a nutrition label). Kept
 *  separate from the user-facing path so grams never leak into the app. */
export function approxGrams(portion: Portion, portionScale = 1): number {
  const perUnit = UNIT_REFERENCE_KCAL[portion.unit];
  return Math.round((portion.kcal / perUnit) * 150 * portionScale);
}
