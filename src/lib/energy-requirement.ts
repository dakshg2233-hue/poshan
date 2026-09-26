/**
 * Maintenance calories (TDEE), estimated the way ICMR-NIN actually
 * recommends doing it for individuals — not a Western BMR formula with an
 * activity multiplier bolted on.
 *
 * Source: "A Brief Note on Nutrient Requirements for Indians, the RDA and
 * EAR" — ICMR-NIN, 2020, Table 1b. The 2020 report is the direct basis for
 * the energy figures carried into the 2024 Dietary Guidelines for Indians,
 * the same document conditions.ts already cites.
 *
 * Table 1b gives energy requirement in kcal/kg body weight/day, separately
 * for men and women at three physical activity levels, and its own footnote
 * says explicitly: "the actual requirement... should be adjusted for the
 * actual weight and physical activity of that population" — i.e. this
 * kcal/kg figure times a person's real weight, not the reference body
 * weight in the table (65kg men, 55kg women), is the intended way to
 * individualise it. That holds across the healthy range. At the extremes
 * of BMI it does not, and effectiveWeightKg below corrects for that.
 *
 * Scoped to adults: the report's kcal/kg approach is for adults specifically
 * — children and adolescents get fixed age-and-sex energy totals in the same
 * table, not a per-kg figure meant for individual scaling, and Asian-Indian
 * BMI cutoffs (which the rest of this app is built on) are themselves an
 * adult clinical standard. Below 19, this returns null rather than a number
 * calculated for the wrong population.
 */

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "moderate" | "heavy";

export const ACTIVITY_LEVELS: { key: ActivityLevel; label: { en: string; hi: string }; hint: { en: string; hi: string } }[] = [
  {
    key: "sedentary",
    label: { en: "Sedentary", hi: "गतिहीन" },
    hint: {
      en: "Desk job, driving, or mostly sitting all day.\nLittle walking beyond daily errands.\nAn evening gym session doesn't change this — it's about your whole day.\nMost IT, office and desk jobs fall here.",
      hi: "डेस्क जॉब, ड्राइविंग या ज़्यादातर बैठे रहना।\nरोज़मर्रा के काम के अलावा बहुत कम चलना-फिरना।\nशाम की जिम से यह वर्ग नहीं बदलता — यह पूरे दिन की बात है।\nज़्यादातर आईटी, ऑफिस और डेस्क जॉब यहीं आती हैं।",
    },
  },
  {
    key: "moderate",
    label: { en: "Moderate", hi: "मध्यम" },
    hint: {
      en: "On your feet part of the day — teaching, retail, nursing, fieldwork.\nRegular walking or light activity built into the job itself.\nAlso fits a desk job plus daily exercise on top of it.\nMost service and hands-on jobs fall here.",
      hi: "दिन का हिस्सा खड़े रहना — पढ़ाना, दुकानदारी, नर्सिंग, फील्ड वर्क।\nकाम के दौरान नियमित चलना या हल्की शारीरिक गतिविधि।\nडेस्क जॉब के साथ रोज़ एक्सरसाइज़ करने वाले भी यहीं आते हैं।\nज़्यादातर सर्विस और हाथों से काम करने वाली नौकरियाँ यहीं आती हैं।",
    },
  },
  {
    key: "heavy",
    label: { en: "Heavy", hi: "भारी" },
    hint: {
      en: "Manual labour — construction, farming, loading, active trades.\nContinuous physical effort for most of the working day.\nNot the same as a hard workout on top of a sitting job — that's still Moderate.\nRare outside physically demanding occupations.",
      hi: "शारीरिक श्रम — निर्माण कार्य, खेती, लोडिंग, सक्रिय व्यापार।\nदिन के ज़्यादातर हिस्से में लगातार शारीरिक मेहनत।\nडेस्क जॉब के साथ कड़ी एक्सरसाइज़ करना इसके बराबर नहीं — वह अब भी मध्यम ही है।\nसिर्फ़ शारीरिक रूप से मेहनत वाले कामों में ही यह लागू होता है।",
    },
  },
];

/* ICMR-NIN 2020, Table 1b — kcal per kg body weight per day. */
const KCAL_PER_KG: Record<Sex, Record<ActivityLevel, number>> = {
  male: { sedentary: 32, moderate: 42, heavy: 53 },
  female: { sedentary: 30, moderate: 39, heavy: 49 },
};

const ADULT_MIN_AGE = 19;

/* Asian-Indian adult BMI cutoffs (WHO expert consultation 2004, adopted
   by ICMR): under 18.5 is underweight, 23 and over is overweight. */
export const BMI_UNDERWEIGHT = 18.5;
export const BMI_OVERWEIGHT = 23;

/** Floor under any goal-adjusted target, unless maintenance is lower. */
export const MIN_TARGET_KCAL = 1200;

/* How much of the weight above the overweight cutoff counts. The standard
   clinical "adjusted body weight" uses a quarter: fat tissue burns far
   less energy per kilogram than lean tissue does. */
const EXCESS_WEIGHT_FACTOR = 0.25;

export function bmiOf(weightKg: number, heightCm: number | null | undefined): number | null {
  if (!heightCm || heightCm <= 0 || !weightKg || weightKg <= 0) return null;
  return weightKg / (heightCm / 100) ** 2;
}

/**
 * The weight to multiply the ICMR kcal/kg figure by.
 *
 * Actual weight within the healthy range. Outside it, actual weight gives
 * nonsense at both ends, which the audit on 26 September 2026 measured:
 *
 * - Obese: a sedentary man of 170kg at 175cm (BMI 55.5) came out at 5,440
 *   kcal maintenance and 5,040 kcal on "weight loss", which is a surplus
 *   for him and the opposite of what he asked for. The per-kg figure
 *   assumes energy-hungry lean tissue, and most of the extra weight is
 *   not. Above BMI 23 only a quarter of the excess counts, measured from
 *   the weight at BMI 23 so the result is continuous at the cutoff.
 * - Underweight: a woman of 30kg at 155cm (BMI 12.5) came out at 900 kcal,
 *   which would keep her underweight. Below BMI 18.5 the weight at 18.5 is
 *   used, so the plan feeds the body she needs to reach, not the one she
 *   has.
 *
 * Without a height there is no BMI, so actual weight is used as before.
 */
export function effectiveWeightKg(weightKg: number, heightCm?: number | null): number {
  const bmi = bmiOf(weightKg, heightCm);
  if (bmi === null) return weightKg;
  const m2 = (heightCm! / 100) ** 2;
  if (bmi < BMI_UNDERWEIGHT) return BMI_UNDERWEIGHT * m2;
  if (bmi > BMI_OVERWEIGHT) {
    const atCutoff = BMI_OVERWEIGHT * m2;
    return atCutoff + EXCESS_WEIGHT_FACTOR * (weightKg - atCutoff);
  }
  return weightKg;
}

/**
 * Returns the estimated maintenance calories for an adult, or null if the
 * inputs don't support an honest estimate (age below the range the ICMR-NIN
 * adult table applies to, or a physical activity level not yet chosen).
 * Pass the height whenever it is known: without it the weight cannot be
 * corrected at the extremes (see effectiveWeightKg).
 */
export function estimateMaintenanceKcal(
  weightKg: number,
  age: number,
  sex: Sex,
  activityLevel: ActivityLevel,
  heightCm?: number | null
): number | null {
  if (age < ADULT_MIN_AGE) return null;
  const perKg = KCAL_PER_KG[sex][activityLevel];
  return Math.round(effectiveWeightKg(weightKg, heightCm) * perKg);
}

/**
 * The day's calorie target: maintenance plus the goal's adjustment, with
 * two safety rules every surface shares.
 *
 * - No deficit for an underweight person (BMI under 18.5), whatever goal
 *   they picked. "Blood sugar" or "PCOS" still shape which dishes are
 *   chosen, but eating less is not safe advice at that weight.
 * - A deficit never lands above maintenance. The 1,200 kcal floor used to
 *   be applied on its own, so someone with a 1,100 kcal maintenance on
 *   "weight loss" was told to eat 1,200, a surplus.
 *
 * Surpluses are left alone, and bmi is optional because some surfaces do
 * not know the height.
 */
export function dailyTargetKcal(
  maintenanceKcal: number,
  goalDeltaKcal: number,
  bmi?: number | null
): number {
  const delta = bmi != null && bmi < BMI_UNDERWEIGHT ? Math.max(0, goalDeltaKcal) : goalDeltaKcal;
  if (delta >= 0) return Math.max(MIN_TARGET_KCAL, maintenanceKcal + delta);
  return Math.max(Math.min(MIN_TARGET_KCAL, maintenanceKcal), maintenanceKcal + delta);
}
