/**
 * Recipes for every meal in MEAL_LIBRARY, keyed by MealPlanItem.id.
 *
 * Nutrition is the full panel, not just the four macros: saturated fat, sugar
 * and sodium alongside them, then the minerals and vitamins that actually move
 * on an Indian plate: iron, calcium, potassium, magnesium, zinc, vitamin C,
 * B12, D and folate.
 *
 * Values are per serving, drawn from IFCT 2017 (Indian Food Composition
 * Tables) conventions for home portions. They are good planning numbers, not
 * laboratory assays: cooking fat and portion size move them more than the
 * table does.
 */

import type { Bi } from "./poshan-data";

/** Grams unless noted. Minerals in milligrams, B12/D/folate in micrograms. */
export type FullNutrition = {
  protein: number;
  carbohydrate: number;
  fat: number;
  saturatedFat: number;
  fibre: number;
  sugar: number;
  sodium: number; // mg
  potassium: number; // mg
  calcium: number; // mg
  iron: number; // mg
  magnesium: number; // mg
  zinc: number; // mg
  vitaminC: number; // mg
  vitaminB12: number; // µg
  vitaminD: number; // µg
  folate: number; // µg
};

export type Recipe = {
  serves: number;
  minutes: number;
  ingredients: Bi[];
  steps: Bi[];
  nutrition: FullNutrition;
  /** Drop a photograph here and the recipe panel shows it. */
  photo?: string;
};

/** Display metadata for the nutrition panel: label, unit, daily reference. */
export const NUTRIENT_META: Record<
  keyof FullNutrition,
  { label: Bi; unit: string; rda?: number }
> = {
  protein: { label: { en: "Protein", hi: "प्रोटीन" }, unit: "g", rda: 54 },
  carbohydrate: { label: { en: "Carbohydrate", hi: "कार्बोहाइड्रेट" }, unit: "g", rda: 275 },
  fat: { label: { en: "Fat", hi: "वसा" }, unit: "g", rda: 67 },
  saturatedFat: { label: { en: "Saturated Fat", hi: "संतृप्त वसा" }, unit: "g", rda: 20 },
  fibre: { label: { en: "Dietary Fibre", hi: "आहारीय रेशा" }, unit: "g", rda: 30 },
  sugar: { label: { en: "Total Sugars", hi: "कुल शर्करा" }, unit: "g", rda: 25 },
  sodium: { label: { en: "Sodium", hi: "सोडियम" }, unit: "mg", rda: 2000 },
  potassium: { label: { en: "Potassium", hi: "पोटैशियम" }, unit: "mg", rda: 3500 },
  calcium: { label: { en: "Calcium", hi: "कैल्शियम" }, unit: "mg", rda: 1000 },
  iron: { label: { en: "Iron", hi: "लोहा" }, unit: "mg", rda: 19 },
  magnesium: { label: { en: "Magnesium", hi: "मैग्नीशियम" }, unit: "mg", rda: 370 },
  zinc: { label: { en: "Zinc", hi: "ज़िंक" }, unit: "mg", rda: 12 },
  vitaminC: { label: { en: "Vitamin C", hi: "विटामिन सी" }, unit: "mg", rda: 80 },
  vitaminB12: { label: { en: "Vitamin B12 (Cobalamin)", hi: "विटामिन बी12 (कोबालामिन)" }, unit: "µg", rda: 2.2 },
  vitaminD: { label: { en: "Vitamin D", hi: "विटामिन डी" }, unit: "µg", rda: 15 },
  folate: { label: { en: "Folate", hi: "फ़ोलेट" }, unit: "µg", rda: 300 },
};

/** Order the panel reads in: macros, then minerals, then vitamins. */
export const NUTRIENT_ORDER: (keyof FullNutrition)[] = [
  "protein", "carbohydrate", "fat", "saturatedFat", "fibre", "sugar",
  "sodium", "potassium", "calcium", "iron", "magnesium", "zinc",
  "vitaminC", "vitaminB12", "vitaminD", "folate",
];

/** Build a FullNutrition panel from the 16 values in NUTRIENT_ORDER, positionally. */
export const n = (
  protein: number, carbohydrate: number, fat: number, saturatedFat: number,
  fibre: number, sugar: number, sodium: number, potassium: number,
  calcium: number, iron: number, magnesium: number, zinc: number,
  vitaminC: number, vitaminB12: number, vitaminD: number, folate: number
): FullNutrition => ({
  protein, carbohydrate, fat, saturatedFat, fibre, sugar, sodium, potassium,
  calcium, iron, magnesium, zinc, vitaminC, vitaminB12, vitaminD, folate,
});

export const RECIPES: Record<string, Recipe> = {
  // Cleared. Add recipes here, keyed by the MealPlanItem id they belong to.
  // Use the exported n() helper for the nutrition panel — it takes the 16
  // values in NUTRIENT_ORDER, positionally:
  //   "meal-id": {
  //     serves: 2, minutes: 15,
  //     ingredients: [{ en: "...", hi: "..." }],
  //     steps: [{ en: "...", hi: "..." }],
  //     nutrition: n(protein, carbohydrate, fat, saturatedFat, fibre, sugar,
  //                  sodium, potassium, calcium, iron, magnesium, zinc,
  //                  vitaminC, vitaminB12, vitaminD, folate),
  //   },
};

export const recipeFor = (mealId: string): Recipe | undefined => RECIPES[mealId];

/** How many library meals have a recipe written. */
export const recipeCount = () => Object.keys(RECIPES).length;
