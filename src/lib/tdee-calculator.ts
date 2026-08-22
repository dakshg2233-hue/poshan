/**
 * TDEE (Total Daily Energy Expenditure) calculator using Mifflin-St Jeor formula.
 * Calculates maintenance calories based on weight, height, age, gender, and activity level.
 */

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "veryActive";
export type Gender = "male" | "female";

interface TDEEResult {
  bmr: number;
  tdee: number;
  maintenance: number;
}

/**
 * Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor formula.
 * Weight in kg, height in cm, age in years.
 */
function calculateBMR(weight: number, height: number, age: number, gender: Gender): number {
  if (gender === "male") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

/**
 * Get activity multiplier based on activity level.
 * Multipliers based on Harris-Benedict equation revised values.
 */
function getActivityMultiplier(activity: ActivityLevel): number {
  const multipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,        // Little or no exercise
    light: 1.375,          // Light exercise 1-3 days/week
    moderate: 1.55,        // Moderate exercise 3-5 days/week
    active: 1.725,         // Heavy exercise 6-7 days/week
    veryActive: 1.9,       // Very heavy exercise or physical job
  };
  return multipliers[activity];
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure).
 * This is the maintenance calorie requirement.
 */
export function calculateTDEE(
  weight: number, // kg
  height: number, // cm
  age: number,
  gender: Gender,
  activity: ActivityLevel
): TDEEResult {
  const bmr = calculateBMR(weight, height, age, gender);
  const multiplier = getActivityMultiplier(activity);
  const tdee = Math.round(bmr * multiplier);

  return {
    bmr,
    tdee,
    maintenance: tdee,
  };
}

/**
 * Adjusted calorie target based on goal.
 * Used to modify maintenance calories for specific fitness goals.
 */
export const GOAL_ADJUSTMENTS: Record<string, number> = {
  loss: -400,      // 400 cal deficit for weight loss
  muscle: 300,     // 300 cal surplus for muscle gain
  diabetes: -200,  // Controlled deficit for blood sugar
  pcos: -250,      // Stronger deficit for PCOS
  thyroid: 0,      // Maintain baseline for thyroid
};

/**
 * Get adjusted calorie target for a specific goal.
 */
export function getAdjustedCalories(tdee: number, goal: string): number {
  const adjustment = GOAL_ADJUSTMENTS[goal] || 0;
  return Math.max(1200, tdee + adjustment); // Minimum 1200 kcal for safety
}

/**
 * Compare user's calculated TDEE to band-based baseline.
 */
export function compareToBand(tdee: number, bandBaseline: number): {
  userTDEE: number;
  bandBaseline: number;
  difference: number;
  recommendation: string;
} {
  const difference = tdee - bandBaseline;
  let recommendation = "";

  if (Math.abs(difference) < 100) {
    recommendation = "Your calculated maintenance matches the band baseline closely.";
  } else if (difference > 0) {
    recommendation = `Your maintenance is ${difference} kcal higher than the band baseline. You may need slightly larger portions.`;
  } else {
    recommendation = `Your maintenance is ${Math.abs(difference)} kcal lower than the band baseline. You may need slightly smaller portions.`;
  }

  return {
    userTDEE: tdee,
    bandBaseline,
    difference,
    recommendation,
  };
}
