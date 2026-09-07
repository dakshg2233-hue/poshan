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

/**
 * A starter set, not full MEAL_LIBRARY coverage: 16 dishes chosen for
 * variety (veg/non-veg, all three meal-times, both collections) rather
 * than volume. RecipePanel degrades to showing nothing for any dish
 * without an entry here, so adding more later is additive and safe.
 */
export const RECIPES: Record<string, Recipe> = {
  "paneer-masala": {
    serves: 2, minutes: 30,
    ingredients: [
      { en: "200 g paneer, cubed", hi: "200 ग्राम पनीर, क्यूब में कटा" },
      { en: "2 onions, finely chopped", hi: "2 प्याज़, बारीक कटे" },
      { en: "2 tomatoes, pureed", hi: "2 टमाटर, प्यूरी किए हुए" },
      { en: "1 tbsp ginger-garlic paste", hi: "1 टेबलस्पून अदरक-लहसुन पेस्ट" },
      { en: "2 tbsp oil or ghee", hi: "2 टेबलस्पून तेल या घी" },
      { en: "1 tsp red chilli powder, 1/2 tsp turmeric, 1 tsp garam masala", hi: "1 टीस्पून लाल मिर्च, 1/2 टीस्पून हल्दी, 1 टीस्पून गरम मसाला" },
      { en: "Salt to taste, coriander leaves to garnish", hi: "स्वादानुसार नमक, गार्निश के लिए धनिया" },
    ],
    steps: [
      { en: "Heat oil, fry the paneer cubes lightly until golden, set aside.", hi: "तेल गरम करें, पनीर के टुकड़ों को हल्का सुनहरा तलें और अलग रख दें।" },
      { en: "In the same pan, sauté onions until golden brown.", hi: "उसी पैन में प्याज़ को सुनहरा होने तक भूनें।" },
      { en: "Add ginger-garlic paste, cook 1 minute until raw smell goes.", hi: "अदरक-लहसुन पेस्ट डालें, 1 मिनट तक कच्ची महक जाने तक पकाएँ।" },
      { en: "Add tomato puree and spices; cook until oil separates.", hi: "टमाटर प्यूरी और मसाले डालें; तेल अलग होने तक पकाएँ।" },
      { en: "Add paneer and a splash of water, simmer 5 minutes.", hi: "पनीर और थोड़ा पानी डालें, 5 मिनट धीमी आँच पर पकाएँ।" },
      { en: "Garnish with coriander and serve hot with roti or rice.", hi: "धनिया से सजाकर रोटी या चावल के साथ गरम परोसें।" },
    ],
    nutrition: n(29.8, 8.6, 42.2, 18, 1.5, 4, 620, 380, 480, 1.8, 45, 2.6, 8, 0.6, 0.1, 35),
  },

  "paneer-methi": {
    serves: 2, minutes: 30,
    ingredients: [
      { en: "200 g paneer, cubed", hi: "200 ग्राम पनीर, क्यूब में कटा" },
      { en: "1 bunch fresh methi (fenugreek) leaves, chopped", hi: "1 गड्डी ताज़ा मेथी, कटी हुई" },
      { en: "2 onions, 2 tomatoes, chopped", hi: "2 प्याज़, 2 टमाटर, कटे हुए" },
      { en: "1 tbsp ginger-garlic paste", hi: "1 टेबलस्पून अदरक-लहसुन पेस्ट" },
      { en: "2 tbsp oil or ghee", hi: "2 टेबलस्पून तेल या घी" },
      { en: "1 tsp red chilli powder, 1/2 tsp turmeric", hi: "1 टीस्पून लाल मिर्च, 1/2 टीस्पून हल्दी" },
      { en: "Salt to taste", hi: "स्वादानुसार नमक" },
    ],
    steps: [
      { en: "Wash methi leaves well and chop finely — this cuts the bitterness.", hi: "मेथी के पत्तों को अच्छे से धोकर बारीक काटें — इससे कड़वाहट कम होती है।" },
      { en: "Heat oil, sauté onions until golden, add ginger-garlic paste.", hi: "तेल गरम करें, प्याज़ सुनहरा होने तक भूनें, अदरक-लहसुन पेस्ट डालें।" },
      { en: "Add tomatoes and spices, cook until soft and oil separates.", hi: "टमाटर और मसाले डालें, नरम होने और तेल अलग होने तक पकाएँ।" },
      { en: "Stir in the chopped methi, cook 4-5 minutes until wilted.", hi: "कटी मेथी डालें, 4-5 मिनट तक पकाएँ जब तक मुरझा न जाए।" },
      { en: "Add paneer cubes, simmer 5 minutes so the paneer soaks up the flavour.", hi: "पनीर के टुकड़े डालें, 5 मिनट धीमी आँच पर पकाएँ ताकि स्वाद अंदर जाए।" },
      { en: "Serve hot with roti.", hi: "गरम-गरम रोटी के साथ परोसें।" },
    ],
    nutrition: n(29.8, 8.6, 42.2, 18, 1.5, 3, 600, 420, 470, 3.2, 50, 2.6, 12, 0.6, 0.1, 60),
  },

  "chole-masala": {
    serves: 2, minutes: 40,
    ingredients: [
      { en: "1.5 cups boiled chickpeas (chole)", hi: "1.5 कप उबले छोले" },
      { en: "2 onions, 2 tomatoes, pureed", hi: "2 प्याज़, 2 टमाटर, प्यूरी किए हुए" },
      { en: "1 tbsp ginger-garlic paste", hi: "1 टेबलस्पून अदरक-लहसुन पेस्ट" },
      { en: "2 tsp chole masala powder", hi: "2 टीस्पून छोले मसाला पाउडर" },
      { en: "2 tbsp oil", hi: "2 टेबलस्पून तेल" },
      { en: "1 tea bag or a pinch of anardana for the dark colour (optional)", hi: "रंग के लिए 1 टी बैग या अनारदाना (वैकल्पिक)" },
      { en: "Salt to taste, coriander to garnish", hi: "स्वादानुसार नमक, धनिया गार्निश के लिए" },
    ],
    steps: [
      { en: "If using dried chickpeas, soak overnight and pressure-cook until soft.", hi: "सूखे छोले हों तो रातभर भिगोकर नरम होने तक प्रेशर कुक करें।" },
      { en: "Heat oil, sauté onions until deep golden brown.", hi: "तेल गरम करें, प्याज़ को गहरा सुनहरा होने तक भूनें।" },
      { en: "Add ginger-garlic paste and tomato puree, cook until oil separates.", hi: "अदरक-लहसुन पेस्ट और टमाटर प्यूरी डालें, तेल अलग होने तक पकाएँ।" },
      { en: "Add chole masala powder and salt, cook 2 minutes.", hi: "छोले मसाला और नमक डालें, 2 मिनट पकाएँ।" },
      { en: "Add boiled chickpeas with a little of their water, simmer 15 minutes.", hi: "उबले छोले थोड़े पानी के साथ डालें, 15 मिनट धीमी आँच पर पकाएँ।" },
      { en: "Mash a few chickpeas to thicken the gravy, garnish and serve with bhature or rice.", hi: "गाढ़ा करने के लिए कुछ छोले मैश करें, गार्निश करके भटूरे या चावल के साथ परोसें।" },
    ],
    nutrition: n(14.6, 40.6, 12.1, 2, 11.9, 6, 580, 520, 90, 4.2, 75, 2.1, 10, 0, 0, 180),
  },

  "rajma-masala": {
    serves: 2, minutes: 40,
    ingredients: [
      { en: "1.5 cups boiled rajma (kidney beans)", hi: "1.5 कप उबले राजमा" },
      { en: "2 onions, 2 tomatoes, pureed", hi: "2 प्याज़, 2 टमाटर, प्यूरी किए हुए" },
      { en: "1 tbsp ginger-garlic paste", hi: "1 टेबलस्पून अदरक-लहसुन पेस्ट" },
      { en: "1 tsp cumin seeds, 1 tsp garam masala, 1/2 tsp turmeric", hi: "1 टीस्पून जीरा, 1 टीस्पून गरम मसाला, 1/2 टीस्पून हल्दी" },
      { en: "2 tbsp oil or ghee", hi: "2 टेबलस्पून तेल या घी" },
      { en: "Salt to taste, coriander to garnish", hi: "स्वादानुसार नमक, धनिया गार्निश के लिए" },
    ],
    steps: [
      { en: "Soak rajma overnight and pressure-cook until soft (skip if using canned/pre-boiled).", hi: "राजमा को रातभर भिगोकर नरम होने तक प्रेशर कुक करें (डिब्बाबंद हो तो यह चरण छोड़ें)।" },
      { en: "Heat oil, splutter cumin seeds, then sauté onions until golden.", hi: "तेल गरम करें, जीरा तड़काएँ, फिर प्याज़ सुनहरा होने तक भूनें।" },
      { en: "Add ginger-garlic paste and tomato puree, cook until oil separates.", hi: "अदरक-लहसुन पेस्ट और टमाटर प्यूरी डालें, तेल अलग होने तक पकाएँ।" },
      { en: "Add spices and boiled rajma with its cooking water, mix well.", hi: "मसाले और उबले राजमा को उसके पानी सहित डालें, अच्छे से मिलाएँ।" },
      { en: "Simmer 15-20 minutes, mashing a few beans to thicken the gravy.", hi: "15-20 मिनट धीमी आँच पर पकाएँ, गाढ़ा करने के लिए कुछ राजमा मैश करें।" },
      { en: "Garnish with coriander, serve hot with steamed rice.", hi: "धनिया से सजाकर गरम चावल के साथ परोसें।" },
    ],
    nutrition: n(14.6, 40.6, 12.1, 2, 11.9, 5, 560, 540, 85, 4.8, 80, 2.3, 9, 0, 0, 160),
  },

  "moong-dal-masala": {
    serves: 2, minutes: 25,
    ingredients: [
      { en: "3/4 cup split moong dal, washed", hi: "3/4 कप मूंग दाल, धुली हुई" },
      { en: "1 onion, 1 tomato, chopped", hi: "1 प्याज़, 1 टमाटर, कटे हुए" },
      { en: "1 tsp cumin seeds, a pinch of hing (asafoetida), 1/2 tsp turmeric", hi: "1 टीस्पून जीरा, एक चुटकी हींग, 1/2 टीस्पून हल्दी" },
      { en: "1 tbsp ghee or oil", hi: "1 टेबलस्पून घी या तेल" },
      { en: "1-2 green chillies, chopped", hi: "1-2 हरी मिर्च, कटी हुई" },
      { en: "Salt to taste, coriander to garnish", hi: "स्वादानुसार नमक, धनिया गार्निश के लिए" },
    ],
    steps: [
      { en: "Pressure-cook the moong dal with turmeric and salt until soft, about 3 whistles.", hi: "मूंग दाल को हल्दी और नमक के साथ नरम होने तक प्रेशर कुक करें, लगभग 3 सीटी।" },
      { en: "Heat ghee in a small pan, splutter cumin seeds and hing.", hi: "एक छोटे पैन में घी गरम करें, जीरा और हींग तड़काएँ।" },
      { en: "Add chopped onion and green chilli, sauté until onion softens.", hi: "कटा प्याज़ और हरी मिर्च डालें, प्याज़ नरम होने तक भूनें।" },
      { en: "Add tomato, cook until it breaks down.", hi: "टमाटर डालें, गलने तक पकाएँ।" },
      { en: "Pour this tempering over the cooked dal and simmer 5 minutes.", hi: "यह तड़का पकी दाल पर डालें और 5 मिनट पकाएँ।" },
      { en: "Garnish with coriander, serve with rice or roti.", hi: "धनिया से सजाकर चावल या रोटी के साथ परोसें।" },
    ],
    nutrition: n(14.6, 37.4, 11.5, 1.8, 10.3, 4, 520, 460, 60, 3.8, 65, 1.9, 6, 0, 0, 140),
  },

  "aloo-masala": {
    serves: 2, minutes: 25,
    ingredients: [
      { en: "3 medium potatoes, boiled and cubed", hi: "3 मध्यम आलू, उबले और कटे हुए" },
      { en: "1 onion, 1 tomato, chopped", hi: "1 प्याज़, 1 टमाटर, कटे हुए" },
      { en: "1 tsp cumin seeds, 1/2 tsp turmeric, 1 tsp red chilli powder", hi: "1 टीस्पून जीरा, 1/2 टीस्पून हल्दी, 1 टीस्पून लाल मिर्च" },
      { en: "2 tbsp oil", hi: "2 टेबलस्पून तेल" },
      { en: "Salt to taste, coriander to garnish", hi: "स्वादानुसार नमक, धनिया गार्निश के लिए" },
    ],
    steps: [
      { en: "Heat oil, splutter cumin seeds.", hi: "तेल गरम करें, जीरा तड़काएँ।" },
      { en: "Add onion, sauté until translucent.", hi: "प्याज़ डालें, पारदर्शी होने तक भूनें।" },
      { en: "Add tomato and spices, cook until soft.", hi: "टमाटर और मसाले डालें, नरम होने तक पकाएँ।" },
      { en: "Add boiled potato cubes, mix gently so they don't break too much.", hi: "उबले आलू के टुकड़े डालें, धीरे से मिलाएँ ताकि ज़्यादा न टूटें।" },
      { en: "Add a splash of water, cover and simmer 5-7 minutes.", hi: "थोड़ा पानी डालें, ढककर 5-7 मिनट पकाएँ।" },
      { en: "Garnish with coriander, serve with roti or poori.", hi: "धनिया से सजाकर रोटी या पूरी के साथ परोसें।" },
    ],
    nutrition: n(4.2, 34.2, 10.5, 1.5, 5.4, 5, 480, 620, 30, 1.2, 35, 0.7, 18, 0, 0, 30),
  },

  "aloo-methi": {
    serves: 2, minutes: 25,
    ingredients: [
      { en: "3 medium potatoes, boiled and cubed", hi: "3 मध्यम आलू, उबले और कटे हुए" },
      { en: "1 bunch fresh methi (fenugreek) leaves, chopped", hi: "1 गड्डी ताज़ा मेथी, कटी हुई" },
      { en: "1 onion, chopped", hi: "1 प्याज़, कटा हुआ" },
      { en: "1 tsp cumin seeds, 1/2 tsp turmeric, 1 tsp red chilli powder", hi: "1 टीस्पून जीरा, 1/2 टीस्पून हल्दी, 1 टीस्पून लाल मिर्च" },
      { en: "2 tbsp oil", hi: "2 टेबलस्पून तेल" },
      { en: "Salt to taste", hi: "स्वादानुसार नमक" },
    ],
    steps: [
      { en: "Wash and chop methi leaves finely to reduce bitterness.", hi: "मेथी को अच्छे से धोकर बारीक काटें ताकि कड़वाहट कम हो।" },
      { en: "Heat oil, splutter cumin seeds, add onion and sauté until soft.", hi: "तेल गरम करें, जीरा तड़काएँ, प्याज़ डालकर नरम होने तक भूनें।" },
      { en: "Add methi leaves, cook 4-5 minutes until wilted.", hi: "मेथी डालें, 4-5 मिनट तक पकाएँ जब तक मुरझा न जाए।" },
      { en: "Add turmeric and chilli powder, mix well.", hi: "हल्दी और लाल मिर्च डालें, अच्छे से मिलाएँ।" },
      { en: "Add boiled potato cubes and salt, mix gently and cook 5 minutes.", hi: "उबले आलू और नमक डालें, धीरे से मिलाकर 5 मिनट पकाएँ।" },
      { en: "Serve hot with roti.", hi: "गरम-गरम रोटी के साथ परोसें।" },
    ],
    nutrition: n(4.2, 34.2, 10.5, 1.5, 5.4, 4, 460, 640, 45, 2.6, 40, 0.8, 20, 0, 0, 55),
  },

  "chicken-curry": {
    serves: 2, minutes: 45,
    ingredients: [
      { en: "400 g chicken curry-cut, with bone or boneless", hi: "400 ग्राम चिकन करी-कट" },
      { en: "2 onions, 2 tomatoes, pureed", hi: "2 प्याज़, 2 टमाटर, प्यूरी किए हुए" },
      { en: "1 tbsp ginger-garlic paste", hi: "1 टेबलस्पून अदरक-लहसुन पेस्ट" },
      { en: "1 tsp turmeric, 1 tsp red chilli powder, 1 tsp garam masala", hi: "1 टीस्पून हल्दी, 1 टीस्पून लाल मिर्च, 1 टीस्पून गरम मसाला" },
      { en: "3 tbsp oil", hi: "3 टेबलस्पून तेल" },
      { en: "Salt to taste, coriander to garnish", hi: "स्वादानुसार नमक, धनिया गार्निश के लिए" },
    ],
    steps: [
      { en: "Heat oil, sauté onions until golden brown.", hi: "तेल गरम करें, प्याज़ को सुनहरा होने तक भूनें।" },
      { en: "Add ginger-garlic paste, cook until raw smell goes.", hi: "अदरक-लहसुन पेस्ट डालें, कच्ची महक जाने तक पकाएँ।" },
      { en: "Add tomato puree and spices, cook until oil separates.", hi: "टमाटर प्यूरी और मसाले डालें, तेल अलग होने तक पकाएँ।" },
      { en: "Add chicken pieces, mix well to coat in the masala, cook 5 minutes.", hi: "चिकन के टुकड़े डालें, मसाले में अच्छे से मिलाएँ, 5 मिनट पकाएँ।" },
      { en: "Add warm water to just cover the chicken, cover and simmer 20 minutes until cooked through.", hi: "चिकन डूबने लायक गरम पानी डालें, ढककर 20 मिनट पकाएँ जब तक पूरी तरह पक न जाए।" },
      { en: "Garnish with coriander, serve with rice or roti.", hi: "धनिया से सजाकर चावल या रोटी के साथ परोसें।" },
    ],
    nutrition: n(28, 5.4, 34.4, 9, 1.5, 3, 650, 420, 40, 1.8, 38, 2.4, 6, 0.4, 0.2, 20),
  },

  "egg-curry": {
    serves: 2, minutes: 30,
    ingredients: [
      { en: "4 eggs, boiled and peeled", hi: "4 अंडे, उबले और छिले हुए" },
      { en: "2 onions, 2 tomatoes, pureed", hi: "2 प्याज़, 2 टमाटर, प्यूरी किए हुए" },
      { en: "1 tbsp ginger-garlic paste", hi: "1 टेबलस्पून अदरक-लहसुन पेस्ट" },
      { en: "1 tsp turmeric, 1 tsp red chilli powder, 1 tsp garam masala", hi: "1 टीस्पून हल्दी, 1 टीस्पून लाल मिर्च, 1 टीस्पून गरम मसाला" },
      { en: "2 tbsp oil", hi: "2 टेबलस्पून तेल" },
      { en: "Salt to taste, coriander to garnish", hi: "स्वादानुसार नमक, धनिया गार्निश के लिए" },
    ],
    steps: [
      { en: "Boil eggs for 10 minutes, cool, peel, and slit lightly so the masala soaks in.", hi: "अंडों को 10 मिनट उबालें, ठंडा करके छीलें, और हल्के से चीरा लगाएँ ताकि मसाला अंदर जाए।" },
      { en: "Heat oil, sauté onions until golden.", hi: "तेल गरम करें, प्याज़ सुनहरा होने तक भूनें।" },
      { en: "Add ginger-garlic paste and tomato puree, cook until oil separates.", hi: "अदरक-लहसुन पेस्ट और टमाटर प्यूरी डालें, तेल अलग होने तक पकाएँ।" },
      { en: "Add spices and a little water, simmer 5 minutes to form the gravy.", hi: "मसाले और थोड़ा पानी डालें, ग्रेवी बनाने के लिए 5 मिनट पकाएँ।" },
      { en: "Add the boiled eggs, simmer 5 more minutes so they soak up the flavour.", hi: "उबले अंडे डालें, स्वाद अंदर जाने के लिए 5 मिनट और पकाएँ।" },
      { en: "Garnish with coriander, serve with rice or roti.", hi: "धनिया से सजाकर चावल या रोटी के साथ परोसें।" },
    ],
    nutrition: n(20.5, 7.1, 27.7, 7, 1.5, 3, 600, 320, 65, 2.4, 30, 1.8, 6, 1.1, 1.8, 55),
  },

  "prawn-curry": {
    serves: 2, minutes: 25,
    ingredients: [
      { en: "300 g prawns, cleaned and deveined", hi: "300 ग्राम झींगा, साफ किए हुए" },
      { en: "1 onion, 2 tomatoes, chopped", hi: "1 प्याज़, 2 टमाटर, कटे हुए" },
      { en: "1 tbsp ginger-garlic paste", hi: "1 टेबलस्पून अदरक-लहसुन पेस्ट" },
      { en: "1/2 cup coconut milk (optional, for a coastal-style gravy)", hi: "1/2 कप नारियल दूध (वैकल्पिक, तटीय शैली के लिए)" },
      { en: "1 tsp turmeric, 1 tsp red chilli powder", hi: "1 टीस्पून हल्दी, 1 टीस्पून लाल मिर्च" },
      { en: "2 tbsp oil", hi: "2 टेबलस्पून तेल" },
      { en: "Salt to taste, curry leaves and coriander to garnish", hi: "स्वादानुसार नमक, गार्निश के लिए करी पत्ता और धनिया" },
    ],
    steps: [
      { en: "Heat oil, add curry leaves and sauté onion until soft.", hi: "तेल गरम करें, करी पत्ता डालें और प्याज़ नरम होने तक भूनें।" },
      { en: "Add ginger-garlic paste, cook 1 minute.", hi: "अदरक-लहसुन पेस्ट डालें, 1 मिनट पकाएँ।" },
      { en: "Add tomatoes and spices, cook until soft and the oil separates.", hi: "टमाटर और मसाले डालें, नरम होने और तेल अलग होने तक पकाएँ।" },
      { en: "Add prawns, cook 3-4 minutes — prawns cook fast and turn rubbery if overdone.", hi: "झींगा डालें, 3-4 मिनट पकाएँ — झींगा जल्दी पकता है, ज़्यादा पकाने से रबड़ जैसा हो जाता है।" },
      { en: "Stir in coconut milk if using, simmer 2 minutes.", hi: "नारियल दूध डालें (अगर उपयोग कर रहे हैं), 2 मिनट पकाएँ।" },
      { en: "Garnish with coriander, serve with steamed rice.", hi: "धनिया से सजाकर गरम चावल के साथ परोसें।" },
    ],
    nutrition: n(37, 5.7, 11.6, 2.5, 1.5, 3, 720, 380, 90, 3.5, 55, 2.8, 5, 1.5, 0.3, 25),
  },

  "aloo-paratha-classic": {
    serves: 2, minutes: 35,
    ingredients: [
      { en: "1.5 cups whole wheat flour (atta), plus extra for dusting", hi: "1.5 कप गेहूं का आटा, बेलने के लिए अतिरिक्त" },
      { en: "3 medium potatoes, boiled and mashed", hi: "3 मध्यम आलू, उबले और मैश किए हुए" },
      { en: "1 green chilli, finely chopped; 1/2 tsp ajwain (carom seeds)", hi: "1 हरी मिर्च, बारीक कटी; 1/2 टीस्पून अजवाइन" },
      { en: "1/2 tsp red chilli powder, 1/2 tsp roasted cumin powder, coriander leaves", hi: "1/2 टीस्पून लाल मिर्च, 1/2 टीस्पून भुना जीरा पाउडर, धनिया पत्ती" },
      { en: "Ghee or oil for cooking", hi: "पकाने के लिए घी या तेल" },
      { en: "Salt to taste", hi: "स्वादानुसार नमक" },
    ],
    steps: [
      { en: "Knead the flour with water into a soft dough, rest 15 minutes.", hi: "आटे को पानी से नरम गूंथें, 15 मिनट के लिए ढककर रखें।" },
      { en: "Mix mashed potato with chilli, ajwain, spices, salt and coriander to make the filling.", hi: "मैश आलू में मिर्च, अजवाइन, मसाले, नमक और धनिया मिलाकर भरावन तैयार करें।" },
      { en: "Divide dough and filling into equal portions. Roll a small disc, place filling in the centre, seal edges and roll again gently into a paratha.", hi: "आटे और भरावन को बराबर भागों में बाँटें। एक छोटी लोई बेलें, बीच में भरावन रखें, किनारे बंद करके धीरे से फिर बेलें।" },
      { en: "Heat a tawa, cook the paratha on both sides until light brown spots appear.", hi: "तवा गरम करें, पराठे को दोनों तरफ हल्के भूरे धब्बे आने तक सेकें।" },
      { en: "Apply ghee on both sides and press gently while cooking to crisp it up.", hi: "दोनों तरफ घी लगाएँ और सेंकते समय हल्के से दबाएँ ताकि कुरकुरा हो।" },
      { en: "Serve hot with curd and pickle.", hi: "गरम-गरम दही और अचार के साथ परोसें।" },
    ],
    nutrition: n(12.3, 79.2, 11.2, 4.5, 11.3, 4, 540, 480, 55, 3.2, 60, 1.6, 10, 0, 0, 45),
  },

  "hp-paneer-tikka-bowl": {
    serves: 1, minutes: 25,
    ingredients: [
      { en: "200 g paneer, cubed and marinated in yoghurt + tikka masala", hi: "200 ग्राम पनीर, क्यूब में कटा और दही + टिक्का मसाला में मैरिनेट किया हुआ" },
      { en: "1/2 cup cooked brown rice", hi: "1/2 कप पका हुआ ब्राउन राइस" },
      { en: "Mixed bell peppers and onion, cubed", hi: "शिमला मिर्च और प्याज़, क्यूब में कटे" },
      { en: "1 tsp oil for grilling, lemon wedge to serve", hi: "ग्रिल करने के लिए 1 टीस्पून तेल, परोसने के लिए नींबू" },
      { en: "Mint-coriander chutney (optional)", hi: "पुदीना-धनिया चटनी (वैकल्पिक)" },
    ],
    steps: [
      { en: "Marinate paneer cubes in thick yoghurt, tikka masala, ginger-garlic paste and salt for at least 20 minutes.", hi: "पनीर के टुकड़ों को गाढ़े दही, टिक्का मसाला, अदरक-लहसुन पेस्ट और नमक में कम से कम 20 मिनट मैरिनेट करें।" },
      { en: "Thread paneer and vegetables onto skewers, or spread on a tray.", hi: "पनीर और सब्ज़ियों को सींक में पिरोएँ, या ट्रे पर फैलाएँ।" },
      { en: "Grill or pan-sear on high heat with a little oil until charred at the edges, turning to cook evenly.", hi: "थोड़े तेल के साथ तेज़ आँच पर ग्रिल या सेंकें जब तक किनारे हल्के जल न जाएँ, समान रूप से पकाने के लिए पलटें।" },
      { en: "Warm the brown rice.", hi: "ब्राउन राइस को गरम करें।" },
      { en: "Assemble the bowl: rice at the base, grilled paneer and vegetables on top.", hi: "बाउल तैयार करें: नीचे चावल, ऊपर ग्रिल्ड पनीर और सब्ज़ियाँ।" },
      { en: "Squeeze lemon over the top and serve with chutney.", hi: "ऊपर से नींबू निचोड़ें और चटनी के साथ परोसें।" },
    ],
    nutrition: n(43, 39, 31, 12, 7, 6, 580, 520, 620, 2.4, 70, 3.4, 15, 0.8, 0.1, 50),
  },

  "hp-tofu-stir-fry-with-edamame": {
    serves: 1, minutes: 20,
    ingredients: [
      { en: "200 g firm tofu, cubed", hi: "200 ग्राम फर्म टोफू, क्यूब में कटा" },
      { en: "1 cup edamame (shelled), steamed", hi: "1 कप एडामामे (छिली हुई फली), उबली हुई" },
      { en: "Mixed vegetables — broccoli, carrot, bell pepper, sliced", hi: "मिली-जुली सब्ज़ियाँ — ब्रोकली, गाजर, शिमला मिर्च, कटी हुई" },
      { en: "1 tbsp soy sauce, 1 tsp sesame oil, 1 clove garlic minced", hi: "1 टेबलस्पून सोया सॉस, 1 टीस्पून तिल का तेल, 1 लहसुन की कली कद्दूकस" },
      { en: "1 tsp oil for the pan", hi: "पैन के लिए 1 टीस्पून तेल" },
    ],
    steps: [
      { en: "Pat the tofu dry with a towel to help it crisp up when pan-fried.", hi: "टोफू को तौलिए से सुखा लें ताकि तलते समय कुरकुरा हो।" },
      { en: "Heat oil in a wok or wide pan, pan-fry tofu cubes until golden on most sides, set aside.", hi: "कढ़ाई या चौड़े पैन में तेल गरम करें, टोफू के टुकड़ों को ज़्यादातर तरफ से सुनहरा होने तक तलें, अलग रख दें।" },
      { en: "In the same pan, add garlic and the mixed vegetables, stir-fry on high heat 3-4 minutes so they stay crisp.", hi: "उसी पैन में लहसुन और सब्ज़ियाँ डालें, तेज़ आँच पर 3-4 मिनट तक चलाते हुए पकाएँ ताकि कुरकुरी रहें।" },
      { en: "Add steamed edamame and the fried tofu back in.", hi: "उबली एडामामे और तला टोफू वापस डालें।" },
      { en: "Drizzle soy sauce and sesame oil, toss everything together for a minute.", hi: "सोया सॉस और तिल का तेल डालें, सबको एक मिनट मिलाएँ।" },
      { en: "Serve warm as is, or over a small portion of rice.", hi: "गरम-गरम ऐसे ही परोसें, या थोड़े चावल के साथ।" },
    ],
    nutrition: n(42, 35, 24, 3, 13, 7, 640, 680, 380, 5.2, 110, 3.8, 22, 0, 0, 220),
  },

  "hp-lentil-and-quinoa-power-bowl": {
    serves: 1, minutes: 30,
    ingredients: [
      { en: "1 cup cooked lentils (moong or masoor)", hi: "1 कप पकी हुई दाल (मूंग या मसूर)" },
      { en: "3/4 cup cooked quinoa", hi: "3/4 कप पका हुआ क्विनोआ" },
      { en: "Mixed vegetables — cucumber, tomato, spinach", hi: "मिली-जुली सब्ज़ियाँ — खीरा, टमाटर, पालक" },
      { en: "1 tbsp lemon juice, 1 tsp olive oil or oil of choice", hi: "1 टेबलस्पून नींबू का रस, 1 टीस्पून जैतून का तेल या पसंद का तेल" },
      { en: "Roasted cumin powder, salt and pepper to taste", hi: "भुना जीरा पाउडर, स्वादानुसार नमक और काली मिर्च" },
    ],
    steps: [
      { en: "Rinse quinoa well, then cook in water (1:2 ratio) until fluffy, about 15 minutes.", hi: "क्विनोआ को अच्छे से धोएँ, फिर पानी में (1:2 अनुपात) फूलने तक लगभग 15 मिनट पकाएँ।" },
      { en: "Cook lentils separately until soft but holding their shape (not mushy dal).", hi: "दाल को अलग से नरम होने तक पकाएँ, लेकिन आकार बना रहे (गीली दाल जैसी नहीं)।" },
      { en: "Chop the vegetables and wilt the spinach lightly if preferred, or keep raw for crunch.", hi: "सब्ज़ियों को काटें, पालक को हल्का सा भूनें या कच्चा ही रहने दें कुरकुरेपन के लिए।" },
      { en: "In a bowl, layer quinoa, lentils and vegetables.", hi: "एक बाउल में क्विनोआ, दाल और सब्ज़ियों की परत बनाएँ।" },
      { en: "Whisk lemon juice, oil, cumin powder, salt and pepper into a quick dressing.", hi: "नींबू का रस, तेल, जीरा पाउडर, नमक और काली मिर्च मिलाकर तुरंत ड्रेसिंग बनाएँ।" },
      { en: "Drizzle over the bowl and toss gently before eating.", hi: "बाउल पर डालें और खाने से पहले धीरे से मिलाएँ।" },
    ],
    nutrition: n(29, 73, 12, 1.5, 20, 6, 460, 720, 95, 6.5, 130, 3.2, 14, 0, 0, 280),
  },

  "hp-greek-yogurt-berry-parfait": {
    serves: 1, minutes: 10,
    ingredients: [
      { en: "300 g Greek yoghurt", hi: "300 ग्राम ग्रीक दही" },
      { en: "1 cup mixed berries (strawberry, blueberry), fresh or thawed frozen", hi: "1 कप मिली-जुली बेरी (स्ट्रॉबेरी, ब्लूबेरी), ताज़ी या पिघली हुई फ्रोज़न" },
      { en: "1 tbsp chia seeds", hi: "1 टेबलस्पून चिया बीज" },
      { en: "A few soaked almonds or walnuts, chopped (optional)", hi: "कुछ भिगोए बादाम या अखरोट, कटे हुए (वैकल्पिक)" },
      { en: "1 tsp honey (optional, skip for less sugar)", hi: "1 टीस्पून शहद (वैकल्पिक, कम शक्कर के लिए छोड़ें)" },
    ],
    steps: [
      { en: "Spoon a third of the yoghurt into a glass or bowl.", hi: "दही का एक तिहाई हिस्सा गिलास या बाउल में डालें।" },
      { en: "Layer a third of the berries and a sprinkle of chia seeds on top.", hi: "ऊपर एक तिहाई बेरी और थोड़े चिया बीज डालें।" },
      { en: "Repeat the yoghurt-berry layers two more times.", hi: "दही-बेरी की परतें दो बार और दोहराएँ।" },
      { en: "Top with chopped nuts and a drizzle of honey if using.", hi: "ऊपर से कटे मेवे डालें और चाहें तो शहद डालें।" },
      { en: "Serve immediately, or chill 10 minutes for a firmer parfait.", hi: "तुरंत परोसें, या गाढ़े पारफे के लिए 10 मिनट ठंडा करें।" },
    ],
    nutrition: n(34, 35, 8, 3, 11, 22, 140, 480, 380, 1.2, 45, 1.6, 28, 1.4, 0.2, 40),
  },

  "hp-cottage-cheese-chaat": {
    serves: 1, minutes: 15,
    ingredients: [
      { en: "250 g low-fat cottage cheese (paneer, cubed small)", hi: "250 ग्राम लो-फैट कॉटेज चीज़ (पनीर, छोटे क्यूब में कटा)" },
      { en: "1/2 cup boiled chickpeas", hi: "1/2 कप उबले छोले" },
      { en: "Chopped onion, tomato, cucumber for the salad base", hi: "सलाद के लिए कटा प्याज़, टमाटर, खीरा" },
      { en: "Chaat masala, roasted cumin powder, black salt to taste", hi: "स्वादानुसार चाट मसाला, भुना जीरा पाउडर, काला नमक" },
      { en: "Lemon juice, coriander and mint leaves, tamarind chutney (optional)", hi: "नींबू का रस, धनिया-पुदीना पत्ती, इमली चटनी (वैकल्पिक)" },
    ],
    steps: [
      { en: "Toss the cottage cheese cubes with the boiled chickpeas in a large bowl.", hi: "एक बड़े बाउल में कॉटेज चीज़ के टुकड़ों को उबले छोलों के साथ मिलाएँ।" },
      { en: "Add the chopped onion, tomato and cucumber.", hi: "कटा प्याज़, टमाटर और खीरा डालें।" },
      { en: "Sprinkle chaat masala, roasted cumin powder and black salt over everything.", hi: "सबके ऊपर चाट मसाला, भुना जीरा पाउडर और काला नमक छिड़कें।" },
      { en: "Squeeze lemon juice and toss gently to combine.", hi: "नींबू का रस निचोड़ें और धीरे से मिलाएँ।" },
      { en: "Drizzle a little tamarind chutney if using, and top with coriander and mint.", hi: "चाहें तो थोड़ी इमली चटनी डालें, और ऊपर से धनिया-पुदीना डालें।" },
      { en: "Serve immediately while the salad is still crisp.", hi: "सलाद के कुरकुरे रहते हुए तुरंत परोसें।" },
    ],
    nutrition: n(39, 38, 8, 3.5, 11, 8, 620, 460, 420, 3.4, 60, 2.6, 24, 0.9, 0.1, 130),
  },
};

export const recipeFor = (mealId: string): Recipe | undefined => RECIPES[mealId];

/** How many library meals have a recipe written. */
export const recipeCount = () => Object.keys(RECIPES).length;
