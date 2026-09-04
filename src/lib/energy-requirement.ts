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
 * individualise it. That's what estimateMaintenanceKcal does below.
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

/**
 * Returns the estimated maintenance calories for an adult, or null if the
 * inputs don't support an honest estimate (age below the range the ICMR-NIN
 * adult table applies to, or a physical activity level not yet chosen).
 */
export function estimateMaintenanceKcal(
  weightKg: number,
  age: number,
  sex: Sex,
  activityLevel: ActivityLevel
): number | null {
  if (age < ADULT_MIN_AGE) return null;
  const perKg = KCAL_PER_KG[sex][activityLevel];
  return Math.round(weightKg * perKg);
}
