/**
 * Recipes for every meal in MEAL_LIBRARY, keyed by MealPlanItem.id.
 *
 * Nutrition is the full panel, not just the four macros: saturated fat, sugar
 * and sodium alongside them, then the minerals and vitamins that actually move
 * on an Indian plate — iron, calcium, potassium, magnesium, zinc, vitamin C,
 * B12, D and folate.
 *
 * Values are per serving, drawn from IFCT 2017 (Indian Food Composition
 * Tables) conventions for home portions. They are good planning numbers, not
 * laboratory assays — cooking fat and portion size move them more than the
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

const n = (
  protein: number, carbohydrate: number, fat: number, saturatedFat: number,
  fibre: number, sugar: number, sodium: number, potassium: number,
  calcium: number, iron: number, magnesium: number, zinc: number,
  vitaminC: number, vitaminB12: number, vitaminD: number, folate: number
): FullNutrition => ({
  protein, carbohydrate, fat, saturatedFat, fibre, sugar, sodium, potassium,
  calcium, iron, magnesium, zinc, vitaminC, vitaminB12, vitaminD, folate,
});

export const RECIPES: Record<string, Recipe> = {
  /* -------------------------------------------------------- NORTH · veg */
  poha: {
    serves: 2, minutes: 15,
    ingredients: [
      { en: "2 cups thick poha, rinsed and drained", hi: "2 कप मोटा पोहा, धोकर छाना" },
      { en: "1 onion, finely chopped", hi: "1 प्याज़, बारीक कटा" },
      { en: "¼ cup raw peanuts", hi: "¼ कप कच्ची मूंगफली" },
      { en: "1 tsp mustard seeds, 8 curry leaves", hi: "1 छोटा चम्मच राई, 8 करी पत्ते" },
      { en: "½ tsp turmeric, 1 green chilli", hi: "½ छोटा चम्मच हल्दी, 1 हरी मिर्च" },
      { en: "Lemon and coriander to finish", hi: "ऊपर से नींबू और धनिया" },
    ],
    steps: [
      { en: "Rinse the poha in a sieve until just soft. Drain fully — soggy poha cannot be saved.", hi: "पोहे को छलनी में तब तक धोएँ जब तक नरम न हो। पूरा पानी निकाल दें — गीला पोहा सुधरता नहीं।" },
      { en: "Fry the peanuts in oil until they colour, then lift them out.", hi: "मूंगफली को तेल में रंग आने तक भूनें, फिर निकाल लें।" },
      { en: "Crackle mustard seeds, add curry leaves, chilli and onion. Cook until the onion turns soft.", hi: "राई चटकाएँ, करी पत्ता, मिर्च और प्याज़ डालें। प्याज़ नरम होने तक पकाएँ।" },
      { en: "Stir in turmeric and salt, fold through the poha, cover and steam two minutes.", hi: "हल्दी और नमक मिलाएँ, पोहा मिलाएँ, ढककर दो मिनट भाप दें।" },
      { en: "Return the peanuts, squeeze lemon over — the vitamin C lifts the iron absorption.", hi: "मूंगफली वापस डालें, नींबू निचोड़ें — विटामिन सी लोहे का अवशोषण बढ़ाता है।" },
    ],
    nutrition: n(8, 55, 11, 2, 4, 3, 380, 210, 32, 2.6, 48, 1.1, 6, 0, 0, 22),
  },
  "aloo-paratha": {
    serves: 2, minutes: 35,
    ingredients: [
      { en: "2 cups wheat flour, kneaded soft", hi: "2 कप गेहूँ का आटा, नरम गूँधा" },
      { en: "3 potatoes, boiled and mashed", hi: "3 आलू, उबले और मसले" },
      { en: "1 tsp ajwain, 1 tsp red chilli", hi: "1 छोटा चम्मच अजवाइन, 1 छोटा चम्मच लाल मिर्च" },
      { en: "Green chilli, ginger, coriander", hi: "हरी मिर्च, अदरक, धनिया" },
      { en: "1 katori dahi to serve", hi: "परोसने को 1 कटोरी दही" },
    ],
    steps: [
      { en: "Mash the potato while warm and season it hard — the filling carries all the flavour.", hi: "आलू गरम रहते मसलें और अच्छा मसाला डालें — स्वाद पूरा भरावन से आता है।" },
      { en: "Roll a small disc, cup the filling inside, seal and roll gently.", hi: "छोटी लोई बेलें, भरावन भरें, बंद करें और हल्के हाथ से बेलें।" },
      { en: "Cook on a hot tawa, a little ghee on each side until brown spots appear.", hi: "गरम तवे पर सेंकें, दोनों तरफ़ थोड़ा घी, जब तक भूरे धब्बे न आएँ।" },
      { en: "Serve with dahi rather than extra ghee — protein instead of more fat.", hi: "अतिरिक्त घी की जगह दही के साथ परोसें — और वसा नहीं, प्रोटीन।" },
    ],
    nutrition: n(12, 58, 18, 7, 5, 4, 420, 480, 140, 2.8, 52, 1.4, 14, 0.4, 0, 28),
  },
  "rajma-chawal": {
    serves: 3, minutes: 60,
    ingredients: [
      { en: "1 cup rajma, soaked overnight", hi: "1 कप राजमा, रातभर भिगोया" },
      { en: "2 onions, 3 tomatoes, pureed", hi: "2 प्याज़, 3 टमाटर, पिसे" },
      { en: "1 tbsp ginger-garlic paste", hi: "1 बड़ा चम्मच अदरक-लहसुन पेस्ट" },
      { en: "1 tsp each cumin, coriander, garam masala", hi: "1-1 छोटा चम्मच जीरा, धनिया, गरम मसाला" },
      { en: "1.5 cups rice", hi: "1.5 कप चावल" },
      { en: "Lemon wedges", hi: "नींबू के टुकड़े" },
    ],
    steps: [
      { en: "Pressure cook the soaked rajma with salt, 5–6 whistles, until it crushes between two fingers.", hi: "भिगोया राजमा नमक के साथ 5–6 सीटी तक पकाएँ, जब तक दो उँगलियों में दबकर टूटे।" },
      { en: "Brown the onion properly — undercooked onion is why home rajma tastes thin.", hi: "प्याज़ ठीक से भूनें — कच्चा प्याज़ ही वजह है कि घर का राजमा फीका लगता है।" },
      { en: "Add ginger-garlic, then tomato, and cook until the oil separates.", hi: "अदरक-लहसुन डालें, फिर टमाटर, और तेल छूटने तक पकाएँ।" },
      { en: "Tip in the rajma with its water and simmer 20 minutes, mashing a few beans to thicken.", hi: "राजमा उसके पानी सहित डालें, 20 मिनट उबालें, कुछ दाने मसलकर गाढ़ा करें।" },
      { en: "Serve over rice with lemon — iron plus vitamin C in the same mouthful.", hi: "चावल पर नींबू के साथ परोसें — एक ही कौर में लोहा और विटामिन सी।" },
    ],
    nutrition: n(16, 78, 10, 2, 12, 5, 460, 720, 90, 4.2, 88, 2.1, 12, 0, 0, 130),
  },
  "chole-roti": {
    serves: 3, minutes: 50,
    ingredients: [
      { en: "1 cup kabuli chana, soaked overnight", hi: "1 कप काबुली चना, रातभर भिगोया" },
      { en: "2 onions, 2 tomatoes", hi: "2 प्याज़, 2 टमाटर" },
      { en: "1 tbsp chole masala, 1 tsp amchur", hi: "1 बड़ा चम्मच छोले मसाला, 1 छोटा चम्मच अमचूर" },
      { en: "1 tea bag (for colour)", hi: "1 टी बैग (रंग के लिए)" },
      { en: "6 rotis", hi: "6 रोटी" },
    ],
    steps: [
      { en: "Pressure cook the chana with a tea bag — that is where the dark colour comes from, not from burning.", hi: "चने को टी बैग के साथ पकाएँ — गहरा रंग वहीं से आता है, जलाने से नहीं।" },
      { en: "Make a thick onion-tomato masala and cook it until it darkens.", hi: "गाढ़ा प्याज़-टमाटर मसाला बनाएँ और गहरा होने तक पकाएँ।" },
      { en: "Add the chana, some cooking water, and simmer 15 minutes.", hi: "चना और थोड़ा उबला पानी डालें, 15 मिनट पकाएँ।" },
      { en: "Finish with amchur — the sourness is what makes chole taste like chole.", hi: "अंत में अमचूर — खटास ही छोले को छोले बनाती है।" },
    ],
    nutrition: n(15, 62, 12, 2, 11, 6, 520, 560, 110, 3.6, 76, 1.9, 9, 0, 0, 150),
  },
  "palak-paneer": {
    serves: 3, minutes: 35,
    ingredients: [
      { en: "500 g palak, blanched", hi: "500 ग्राम पालक, उबली" },
      { en: "200 g paneer, cubed", hi: "200 ग्राम पनीर, टुकड़ों में" },
      { en: "1 onion, 2 tomatoes, ginger, garlic", hi: "1 प्याज़, 2 टमाटर, अदरक, लहसुन" },
      { en: "1 tsp cumin, ½ tsp garam masala", hi: "1 छोटा चम्मच जीरा, ½ छोटा चम्मच गरम मसाला" },
      { en: "6 rotis", hi: "6 रोटी" },
    ],
    steps: [
      { en: "Blanch the palak 2 minutes, then straight into cold water — this keeps it green instead of khaki.", hi: "पालक 2 मिनट उबालें, फिर तुरंत ठंडे पानी में — इसी से हरा रहता है, मटमैला नहीं।" },
      { en: "Blend to a coarse purée. Do not over-blend; texture matters.", hi: "दरदरा पीसें। ज़्यादा न पीसें; बनावट मायने रखती है।" },
      { en: "Cook the onion-tomato base until the oil separates, then fold in the palak.", hi: "प्याज़-टमाटर तेल छूटने तक पकाएँ, फिर पालक मिलाएँ।" },
      { en: "Add paneer at the very end and cook 3 minutes — longer turns it rubbery.", hi: "पनीर बिल्कुल अंत में डालें, 3 मिनट पकाएँ — ज़्यादा पकने पर रबड़ जैसा हो जाता है।" },
    ],
    nutrition: n(20, 40, 24, 11, 6, 5, 540, 820, 480, 4.8, 95, 2.4, 32, 0.9, 0.2, 190),
  },
  "moong-khichdi": {
    serves: 2, minutes: 30,
    ingredients: [
      { en: "½ cup rice, ½ cup moong dal", hi: "½ कप चावल, ½ कप मूंग दाल" },
      { en: "1 tsp cumin, pinch of hing", hi: "1 छोटा चम्मच जीरा, चुटकी हींग" },
      { en: "½ tsp turmeric, ginger", hi: "½ छोटा चम्मच हल्दी, अदरक" },
      { en: "1 tsp ghee", hi: "1 छोटा चम्मच घी" },
    ],
    steps: [
      { en: "Rinse rice and dal together until the water runs clear.", hi: "चावल और दाल साथ धोएँ जब तक पानी साफ़ न आए।" },
      { en: "Temper cumin and hing in ghee, add ginger and turmeric.", hi: "घी में जीरा और हींग तड़काएँ, अदरक और हल्दी डालें।" },
      { en: "Add rice, dal and four cups water. Pressure cook 3 whistles.", hi: "चावल, दाल और चार कप पानी डालें। 3 सीटी लगाएँ।" },
      { en: "Whisk loose while hot. Khichdi should pour, not hold its shape.", hi: "गरम रहते फेंटें। खिचड़ी बहनी चाहिए, जमी नहीं।" },
    ],
    nutrition: n(13, 52, 6, 3, 7, 2, 320, 380, 48, 2.4, 62, 1.6, 3, 0, 0, 88),
  },

  /* ----------------------------------------------------- NORTH · nonveg */
  "anda-bhurji": {
    serves: 2, minutes: 15,
    ingredients: [
      { en: "4 eggs", hi: "4 अंडे" },
      { en: "1 onion, 1 tomato, finely chopped", hi: "1 प्याज़, 1 टमाटर, बारीक कटे" },
      { en: "Green chilli, coriander", hi: "हरी मिर्च, धनिया" },
      { en: "½ tsp turmeric, ½ tsp chilli powder", hi: "½ छोटा चम्मच हल्दी, ½ छोटा चम्मच मिर्च" },
      { en: "4 rotis", hi: "4 रोटी" },
    ],
    steps: [
      { en: "Cook onion until translucent, then tomato until it collapses.", hi: "प्याज़ पारदर्शी होने तक पकाएँ, फिर टमाटर गलने तक।" },
      { en: "Add the spices and cook a minute so they lose their raw edge.", hi: "मसाले डालकर एक मिनट पकाएँ ताकि कच्चापन जाए।" },
      { en: "Pour in beaten eggs and stir constantly on low heat.", hi: "फेंटे अंडे डालें और धीमी आँच पर लगातार चलाएँ।" },
      { en: "Pull it off while still glossy — carry-over heat finishes it.", hi: "चमक रहते ही उतार लें — बची गर्मी बाक़ी काम कर देती है।" },
    ],
    nutrition: n(20, 34, 18, 6, 3, 4, 480, 340, 90, 3.2, 44, 1.8, 12, 1.6, 2.4, 62),
  },
  "chicken-curry-roti": {
    serves: 3, minutes: 45,
    ingredients: [
      { en: "500 g chicken on the bone", hi: "500 ग्राम हड्डी वाला चिकन" },
      { en: "2 onions, 3 tomatoes", hi: "2 प्याज़, 3 टमाटर" },
      { en: "1 tbsp ginger-garlic paste", hi: "1 बड़ा चम्मच अदरक-लहसुन पेस्ट" },
      { en: "1 tsp each turmeric, chilli, coriander, garam masala", hi: "1-1 छोटा चम्मच हल्दी, मिर्च, धनिया, गरम मसाला" },
      { en: "6 rotis", hi: "6 रोटी" },
    ],
    steps: [
      { en: "Brown the onion slowly, 10 minutes — this is the whole gravy.", hi: "प्याज़ धीरे-धीरे 10 मिनट भूनें — पूरी ग्रेवी यही है।" },
      { en: "Add ginger-garlic, then powdered spices, then tomato.", hi: "अदरक-लहसुन डालें, फिर पिसे मसाले, फिर टमाटर।" },
      { en: "Add chicken and sear it in the masala before any water goes in.", hi: "चिकन डालकर मसाले में भूनें, पानी बाद में।" },
      { en: "Cover and cook 20 minutes. Bone-in keeps it from drying out.", hi: "ढककर 20 मिनट पकाएँ। हड्डी वाला मांस सूखता नहीं।" },
    ],
    nutrition: n(34, 38, 20, 6, 4, 5, 620, 540, 70, 3.4, 58, 3.2, 14, 0.6, 0.2, 42),
  },
  "egg-curry-rice": {
    serves: 2, minutes: 30,
    ingredients: [
      { en: "4 eggs, hard boiled", hi: "4 अंडे, उबले" },
      { en: "1 onion, 2 tomatoes", hi: "1 प्याज़, 2 टमाटर" },
      { en: "1 tsp garam masala, ½ tsp turmeric", hi: "1 छोटा चम्मच गरम मसाला, ½ छोटा चम्मच हल्दी" },
      { en: "1 cup rice", hi: "1 कप चावल" },
    ],
    steps: [
      { en: "Halve the boiled eggs and shallow fry cut-side down for 30 seconds.", hi: "उबले अंडे आधे काटें, कटे हिस्से को 30 सेकंड तलें।" },
      { en: "Build the onion-tomato masala and cook until oil separates.", hi: "प्याज़-टमाटर मसाला बनाएँ, तेल छूटने तक पकाएँ।" },
      { en: "Add water for gravy, simmer 10 minutes.", hi: "ग्रेवी के लिए पानी डालें, 10 मिनट पकाएँ।" },
      { en: "Slide the eggs in at the end so the yolks stay intact.", hi: "अंडे अंत में डालें ताकि ज़र्दी साबुत रहे।" },
    ],
    nutrition: n(20, 55, 16, 5, 3, 5, 520, 400, 88, 3.0, 50, 1.9, 11, 1.5, 2.2, 58),
  },
  "keema-matar": {
    serves: 3, minutes: 40,
    ingredients: [
      { en: "400 g mutton or chicken keema", hi: "400 ग्राम मटन या चिकन कीमा" },
      { en: "1 cup green peas", hi: "1 कप हरी मटर" },
      { en: "2 onions, 2 tomatoes", hi: "2 प्याज़, 2 टमाटर" },
      { en: "1 tbsp ginger-garlic, 1 tsp garam masala", hi: "1 बड़ा चम्मच अदरक-लहसुन, 1 छोटा चम्मच गरम मसाला" },
      { en: "6 rotis", hi: "6 रोटी" },
    ],
    steps: [
      { en: "Brown the keema first, on high heat, until the water it releases dries off.", hi: "कीमा पहले तेज़ आँच पर भूनें जब तक छूटा पानी सूख न जाए।" },
      { en: "Set it aside, build the onion-tomato masala in the same pan.", hi: "निकालकर रखें, उसी कड़ाही में प्याज़-टमाटर मसाला बनाएँ।" },
      { en: "Return the keema, add peas and a splash of water, cover 15 minutes.", hi: "कीमा वापस डालें, मटर और थोड़ा पानी, ढककर 15 मिनट।" },
      { en: "Finish with garam masala off the heat.", hi: "आँच बंद कर गरम मसाला डालें।" },
    ],
    nutrition: n(32, 40, 25, 10, 5, 6, 640, 620, 76, 4.4, 64, 4.1, 16, 2.2, 0.3, 72),
  },

  /* -------------------------------------------------------- SOUTH · veg */
  "idli-sambar": {
    serves: 3, minutes: 25,
    ingredients: [
      { en: "3 cups idli batter, fermented overnight", hi: "3 कप इडली घोल, रातभर ख़मीर उठा" },
      { en: "½ cup toor dal", hi: "½ कप तूर दाल" },
      { en: "Drumstick, carrot, pumpkin", hi: "सहजन, गाजर, कद्दू" },
      { en: "1 tbsp sambar powder, tamarind", hi: "1 बड़ा चम्मच सांबर पाउडर, इमली" },
      { en: "Mustard, curry leaves, hing", hi: "राई, करी पत्ता, हींग" },
    ],
    steps: [
      { en: "Steam the idlis 10 minutes. A clean skewer means done.", hi: "इडली 10 मिनट भाप में पकाएँ। साफ़ सींक निकले तो तैयार।" },
      { en: "Cook the dal soft, then add vegetables and tamarind water.", hi: "दाल नरम पकाएँ, फिर सब्ज़ियाँ और इमली पानी डालें।" },
      { en: "Stir in sambar powder and simmer until the vegetables give way.", hi: "सांबर पाउडर मिलाएँ, सब्ज़ियाँ गलने तक पकाएँ।" },
      { en: "Temper mustard, curry leaves and hing in oil, pour over.", hi: "तेल में राई, करी पत्ता, हींग तड़काकर ऊपर डालें।" },
    ],
    nutrition: n(10, 55, 4, 1, 6, 3, 480, 420, 60, 2.2, 58, 1.3, 14, 0, 0, 96),
  },
  "masala-dosa": {
    serves: 2, minutes: 30,
    ingredients: [
      { en: "2 cups dosa batter", hi: "2 कप डोसा घोल" },
      { en: "3 potatoes, boiled", hi: "3 आलू, उबले" },
      { en: "1 onion, mustard, curry leaves", hi: "1 प्याज़, राई, करी पत्ता" },
      { en: "½ tsp turmeric", hi: "½ छोटा चम्मच हल्दी" },
      { en: "Coconut chutney", hi: "नारियल चटनी" },
    ],
    steps: [
      { en: "Make the potato masala: temper mustard, soften onion, add turmeric and mashed potato.", hi: "आलू मसाला बनाएँ: राई तड़काएँ, प्याज़ नरम करें, हल्दी और मसला आलू डालें।" },
      { en: "Heat the tawa properly. Sprinkle water — it should hiss and vanish.", hi: "तवा ठीक से गरम करें। पानी छिड़कें — छन्न करके उड़ जाना चाहिए।" },
      { en: "Pour batter at the centre and spread outward in a spiral.", hi: "घोल बीच में डालें और गोल-गोल बाहर की ओर फैलाएँ।" },
      { en: "Crisp the edges, place the filling, fold and serve immediately.", hi: "किनारे कुरकुरे करें, भरावन रखें, मोड़कर तुरंत परोसें।" },
    ],
    nutrition: n(8, 60, 13, 5, 5, 3, 440, 480, 52, 2.0, 46, 1.1, 16, 0, 0, 40),
  },
  "curd-rice": {
    serves: 2, minutes: 15,
    ingredients: [
      { en: "1.5 cups cooked rice, cooled", hi: "1.5 कप पका चावल, ठंडा" },
      { en: "1.5 cups thick dahi", hi: "1.5 कप गाढ़ा दही" },
      { en: "Mustard, curry leaves, hing, ginger", hi: "राई, करी पत्ता, हींग, अदरक" },
      { en: "Pomegranate or grated carrot", hi: "अनार या कद्दूकस गाजर" },
    ],
    steps: [
      { en: "Mash the cooled rice slightly — warm rice will split the curd.", hi: "ठंडा चावल हल्का मसलें — गरम चावल दही फाड़ देगा।" },
      { en: "Fold in the dahi with a little milk to loosen.", hi: "दही मिलाएँ, थोड़ा दूध डालकर पतला करें।" },
      { en: "Temper mustard, curry leaves, hing and ginger; pour over.", hi: "राई, करी पत्ता, हींग, अदरक तड़काकर ऊपर डालें।" },
      { en: "Rest 10 minutes before eating. It improves.", hi: "खाने से 10 मिनट पहले रखें। स्वाद बढ़ता है।" },
    ],
    nutrition: n(10, 48, 8, 4, 2, 6, 380, 320, 260, 1.2, 38, 1.2, 4, 0.8, 0.1, 26),
  },
  "rasam-rice": {
    serves: 3, minutes: 25,
    ingredients: [
      { en: "¼ cup toor dal", hi: "¼ कप तूर दाल" },
      { en: "Tamarind, 2 tomatoes", hi: "इमली, 2 टमाटर" },
      { en: "1 tbsp rasam powder, black pepper", hi: "1 बड़ा चम्मच रसम पाउडर, काली मिर्च" },
      { en: "Garlic, curry leaves, coriander", hi: "लहसुन, करी पत्ता, धनिया" },
      { en: "1.5 cups rice, cabbage poriyal", hi: "1.5 कप चावल, पत्तागोभी पोरियल" },
    ],
    steps: [
      { en: "Cook the dal soft and keep its water — that is the body of the rasam.", hi: "दाल नरम पकाएँ, पानी रखें — रसम की जान वही है।" },
      { en: "Simmer tamarind water with tomato and rasam powder 10 minutes.", hi: "इमली पानी, टमाटर और रसम पाउडर 10 मिनट उबालें।" },
      { en: "Add the dal water and heat until it froths — do not boil hard.", hi: "दाल का पानी डालें, झाग आने तक गरम करें — तेज़ न उबालें।" },
      { en: "Temper and finish with coriander.", hi: "तड़का लगाएँ और धनिया डालें।" },
    ],
    nutrition: n(9, 56, 7, 2, 6, 4, 460, 440, 56, 2.4, 52, 1.2, 22, 0, 0, 70),
  },
  "lemon-rice": {
    serves: 2, minutes: 20,
    ingredients: [
      { en: "2 cups cooked rice, cooled", hi: "2 कप पका चावल, ठंडा" },
      { en: "2 lemons", hi: "2 नींबू" },
      { en: "¼ cup peanuts, 1 tbsp chana dal", hi: "¼ कप मूंगफली, 1 बड़ा चम्मच चना दाल" },
      { en: "Mustard, curry leaves, turmeric", hi: "राई, करी पत्ता, हल्दी" },
    ],
    steps: [
      { en: "Spread the rice out to cool so the grains stay separate.", hi: "चावल फैलाकर ठंडा करें ताकि दाने अलग रहें।" },
      { en: "Fry peanuts and chana dal until golden, then mustard and curry leaves.", hi: "मूंगफली और चना दाल सुनहरा भूनें, फिर राई और करी पत्ता।" },
      { en: "Add turmeric, take off the heat, then add lemon juice.", hi: "हल्दी डालें, आँच से उतारें, फिर नींबू रस डालें।" },
      { en: "Never boil lemon juice — it turns bitter.", hi: "नींबू रस कभी न उबालें — कड़वा हो जाता है।" },
    ],
    nutrition: n(8, 58, 11, 2, 3, 2, 400, 260, 40, 1.8, 44, 1.0, 24, 0, 0, 28),
  },

  /* ----------------------------------------------------- SOUTH · nonveg */
  "egg-dosa": {
    serves: 2, minutes: 20,
    ingredients: [
      { en: "2 cups dosa batter", hi: "2 कप डोसा घोल" },
      { en: "3 eggs", hi: "3 अंडे" },
      { en: "1 onion, green chilli, coriander", hi: "1 प्याज़, हरी मिर्च, धनिया" },
      { en: "Black pepper", hi: "काली मिर्च" },
    ],
    steps: [
      { en: "Spread the dosa and let it set for 30 seconds.", hi: "डोसा फैलाएँ, 30 सेकंड जमने दें।" },
      { en: "Break an egg on top and spread it thin across the surface.", hi: "ऊपर अंडा तोड़ें और पतला फैलाएँ।" },
      { en: "Scatter onion, chilli, coriander and pepper over the egg.", hi: "अंडे पर प्याज़, मिर्च, धनिया और काली मिर्च छिड़कें।" },
      { en: "Cook until the egg sets, fold once, serve. No flipping.", hi: "अंडा जमने तक पकाएँ, एक बार मोड़ें, परोसें। पलटें नहीं।" },
    ],
    nutrition: n(16, 52, 14, 4, 4, 3, 460, 320, 62, 2.6, 44, 1.5, 10, 1.2, 1.8, 48),
  },
  "meen-kuzhambu": {
    serves: 3, minutes: 35,
    ingredients: [
      { en: "500 g fish steaks", hi: "500 ग्राम मछली के टुकड़े" },
      { en: "Tamarind, lemon-sized ball", hi: "इमली, नींबू के आकार की" },
      { en: "1 onion, 2 tomatoes, garlic", hi: "1 प्याज़, 2 टमाटर, लहसुन" },
      { en: "1 tbsp chilli powder, 1 tsp coriander powder", hi: "1 बड़ा चम्मच मिर्च, 1 छोटा चम्मच धनिया पाउडर" },
      { en: "Fenugreek seeds, curry leaves", hi: "मेथी दाना, करी पत्ता" },
    ],
    steps: [
      { en: "Temper fenugreek and curry leaves in gingelly oil.", hi: "तिल के तेल में मेथी और करी पत्ता तड़काएँ।" },
      { en: "Cook onion, garlic and tomato down, add the spice powders.", hi: "प्याज़, लहसुन, टमाटर गलाएँ, फिर पिसे मसाले।" },
      { en: "Pour in tamarind water and simmer 10 minutes to lose the raw sourness.", hi: "इमली पानी डालें, 10 मिनट पकाएँ ताकि कच्ची खटास जाए।" },
      { en: "Slide the fish in and simmer 8 minutes. Never stir — shake the pan.", hi: "मछली डालें, 8 मिनट पकाएँ। चलाएँ नहीं — कड़ाही हिलाएँ।" },
    ],
    nutrition: n(30, 52, 12, 3, 3, 4, 580, 560, 88, 2.8, 62, 1.4, 18, 2.8, 6.4, 44),
  },
  "chicken-chettinad": {
    serves: 3, minutes: 50,
    ingredients: [
      { en: "500 g chicken", hi: "500 ग्राम चिकन" },
      { en: "Whole spices: fennel, pepper, star anise, coconut", hi: "साबुत मसाले: सौंफ, काली मिर्च, चक्र फूल, नारियल" },
      { en: "2 onions, 2 tomatoes", hi: "2 प्याज़, 2 टमाटर" },
      { en: "Curry leaves", hi: "करी पत्ता" },
      { en: "1.5 cups rice", hi: "1.5 कप चावल" },
    ],
    steps: [
      { en: "Dry roast the whole spices with coconut until fragrant, then grind.", hi: "साबुत मसाले नारियल के साथ ख़ुशबू आने तक भूनें, फिर पीसें।" },
      { en: "This masala is the dish — do not substitute packet powder.", hi: "यही मसाला असली व्यंजन है — पैकेट का पाउडर काम नहीं देगा।" },
      { en: "Brown onion, add chicken, sear, then the ground masala.", hi: "प्याज़ भूनें, चिकन डालकर सेकें, फिर पिसा मसाला।" },
      { en: "Cook covered 25 minutes with very little water — it should cling, not swim.", hi: "बहुत कम पानी के साथ ढककर 25 मिनट पकाएँ — मसाला चिपके, तैरे नहीं।" },
    ],
    nutrition: n(36, 54, 18, 7, 4, 4, 600, 580, 82, 3.6, 66, 3.4, 12, 0.6, 0.2, 46),
  },

  /* --------------------------------------------------------- EAST · veg */
  "chira-gur": {
    serves: 2, minutes: 10,
    ingredients: [
      { en: "2 cups chira (flattened rice)", hi: "2 कप चिड़ा (पोहा)" },
      { en: "½ cup grated jaggery", hi: "½ कप कद्दूकस गुड़" },
      { en: "½ cup grated coconut", hi: "½ कप कद्दूकस नारियल" },
      { en: "Banana, optional", hi: "केला, वैकल्पिक" },
    ],
    steps: [
      { en: "Rinse the chira briefly and drain.", hi: "चिड़ा जल्दी से धोकर छान लें।" },
      { en: "Toss with jaggery and coconut while still damp.", hi: "नम रहते ही गुड़ और नारियल मिलाएँ।" },
      { en: "Rest 5 minutes so the jaggery melts into it.", hi: "5 मिनट रखें ताकि गुड़ घुल जाए।" },
      { en: "Jaggery keeps a little iron that white sugar does not — but it still raises blood sugar.", hi: "गुड़ में थोड़ा लोहा रहता है जो चीनी में नहीं — पर यह भी शर्करा बढ़ाता है।" },
    ],
    nutrition: n(5, 58, 3, 2, 3, 26, 60, 200, 30, 3.2, 34, 0.8, 2, 0, 0, 14),
  },
  "dal-bhaat-posto": {
    serves: 3, minutes: 40,
    ingredients: [
      { en: "1 cup masoor dal", hi: "1 कप मसूर दाल" },
      { en: "3 potatoes, cubed", hi: "3 आलू, टुकड़ों में" },
      { en: "3 tbsp poppy seed paste", hi: "3 बड़े चम्मच पोस्ता दाना पेस्ट" },
      { en: "Green chilli, nigella seeds", hi: "हरी मिर्च, कलौंजी" },
      { en: "1.5 cups rice", hi: "1.5 कप चावल" },
    ],
    steps: [
      { en: "Soak the poppy seeds, then grind to a smooth paste with green chilli.", hi: "पोस्ता भिगोएँ, फिर हरी मिर्च के साथ बारीक पीसें।" },
      { en: "Fry the potato cubes until the edges catch colour.", hi: "आलू के टुकड़े किनारे रंग आने तक तलें।" },
      { en: "Add the posto paste and cook on low — it burns fast.", hi: "पोस्तो पेस्ट डालकर धीमी आँच पर पकाएँ — जल्दी जलता है।" },
      { en: "Cook the dal separately, plain, and serve all three together.", hi: "दाल अलग सादी पकाएँ, तीनों साथ परोसें।" },
    ],
    nutrition: n(14, 68, 10, 2, 8, 4, 420, 640, 96, 3.4, 72, 1.8, 18, 0, 0, 118),
  },
  khichuri: {
    serves: 3, minutes: 40,
    ingredients: [
      { en: "1 cup rice, ½ cup roasted moong dal", hi: "1 कप चावल, ½ कप भुनी मूंग दाल" },
      { en: "Cauliflower, potato, peas", hi: "फूलगोभी, आलू, मटर" },
      { en: "Bay leaf, cumin, ginger, turmeric", hi: "तेज़पत्ता, जीरा, अदरक, हल्दी" },
      { en: "1 brinjal for begun bhaja", hi: "1 बैंगन, बेगुन भाजा के लिए" },
    ],
    steps: [
      { en: "Dry roast the moong dal until it smells nutty — this is what makes it khichuri, not khichdi.", hi: "मूंग दाल भूनें जब तक मेवे जैसी ख़ुशबू न आए — यही खिचुड़ी को खिचड़ी से अलग करता है।" },
      { en: "Temper bay leaf and cumin, add ginger and turmeric.", hi: "तेज़पत्ता और जीरा तड़काएँ, अदरक और हल्दी डालें।" },
      { en: "Add rice, dal, vegetables and plenty of water. Cook until soft.", hi: "चावल, दाल, सब्ज़ियाँ और भरपूर पानी डालें। नरम होने तक पकाएँ।" },
      { en: "Fry brinjal slices separately and lay them on top.", hi: "बैंगन के टुकड़े अलग तलकर ऊपर रखें।" },
    ],
    nutrition: n(12, 58, 11, 3, 7, 3, 400, 520, 66, 2.8, 64, 1.6, 20, 0, 0, 92),
  },

  /* ------------------------------------------------------ EAST · nonveg */
  "machher-jhol": {
    serves: 3, minutes: 35,
    ingredients: [
      { en: "500 g rohu or katla steaks", hi: "500 ग्राम रोहू या कतला के टुकड़े" },
      { en: "2 potatoes, quartered", hi: "2 आलू, चार टुकड़ों में" },
      { en: "Nigella seeds, green chilli", hi: "कलौंजी, हरी मिर्च" },
      { en: "Turmeric, ginger paste", hi: "हल्दी, अदरक पेस्ट" },
      { en: "1.5 cups rice", hi: "1.5 कप चावल" },
    ],
    steps: [
      { en: "Rub the fish with turmeric and salt, rest 10 minutes, then fry lightly.", hi: "मछली पर हल्दी-नमक मलें, 10 मिनट रखें, फिर हल्का तलें।" },
      { en: "Fry the potatoes in the same oil.", hi: "उसी तेल में आलू तलें।" },
      { en: "Temper nigella and chilli, add ginger and turmeric, then water.", hi: "कलौंजी और मिर्च तड़काएँ, अदरक-हल्दी डालें, फिर पानी।" },
      { en: "Return fish and potato, simmer 10 minutes. The jhol stays thin — that is the point.", hi: "मछली और आलू वापस डालें, 10 मिनट पकाएँ। झोल पतला ही रहता है — यही असल है।" },
    ],
    nutrition: n(30, 55, 10, 2, 2, 3, 540, 620, 92, 2.4, 58, 1.6, 14, 3.2, 5.8, 38),
  },
  "dimer-dalna": {
    serves: 2, minutes: 30,
    ingredients: [
      { en: "4 eggs, boiled", hi: "4 अंडे, उबले" },
      { en: "2 potatoes, halved", hi: "2 आलू, आधे कटे" },
      { en: "1 onion, ginger, tomato", hi: "1 प्याज़, अदरक, टमाटर" },
      { en: "Cumin, turmeric, garam masala", hi: "जीरा, हल्दी, गरम मसाला" },
    ],
    steps: [
      { en: "Turmeric-rub the boiled eggs and fry until the skin blisters.", hi: "उबले अंडों पर हल्दी मलें और छाला पड़ने तक तलें।" },
      { en: "Fry the potato halves in the same pan.", hi: "उसी कड़ाही में आलू के टुकड़े तलें।" },
      { en: "Build the onion-ginger-tomato masala, add water for a light gravy.", hi: "प्याज़-अदरक-टमाटर मसाला बनाएँ, हल्की ग्रेवी को पानी डालें।" },
      { en: "Return eggs and potato, simmer 10 minutes.", hi: "अंडे और आलू वापस डालें, 10 मिनट पकाएँ।" },
    ],
    nutrition: n(18, 34, 20, 6, 3, 4, 500, 560, 84, 3.0, 46, 1.7, 16, 1.4, 2.2, 56),
  },

  /* --------------------------------------------------------- WEST · veg */
  thepla: {
    serves: 3, minutes: 30,
    ingredients: [
      { en: "2 cups wheat flour", hi: "2 कप गेहूँ का आटा" },
      { en: "1 cup methi leaves, chopped", hi: "1 कप मेथी पत्ते, कटे" },
      { en: "2 tbsp dahi, 1 tsp sesame", hi: "2 बड़े चम्मच दही, 1 छोटा चम्मच तिल" },
      { en: "Turmeric, chilli, ajwain", hi: "हल्दी, मिर्च, अजवाइन" },
      { en: "Dahi to serve", hi: "परोसने को दही" },
    ],
    steps: [
      { en: "Knead everything together — the methi water is enough moisture, add little else.", hi: "सब साथ गूँधें — मेथी का पानी काफ़ी है, और कुछ कम ही डालें।" },
      { en: "Rest the dough 15 minutes.", hi: "आटा 15 मिनट रखें।" },
      { en: "Roll thin and cook on a medium tawa with a smear of oil.", hi: "पतला बेलें और मध्यम तवे पर थोड़े तेल से सेंकें।" },
      { en: "Methi is bitter and that is the useful part — it helps blood sugar.", hi: "मेथी कड़वी है और यही काम की बात है — रक्त शर्करा में मदद करती है।" },
    ],
    nutrition: n(11, 48, 14, 4, 6, 3, 380, 380, 180, 4.2, 68, 1.5, 12, 0.3, 0, 84),
  },
  "dal-bhakri": {
    serves: 3, minutes: 45,
    ingredients: [
      { en: "1 cup toor dal", hi: "1 कप तूर दाल" },
      { en: "2 cups bajra flour", hi: "2 कप बाजरे का आटा" },
      { en: "Seasonal sabzi", hi: "मौसमी सब्ज़ी" },
      { en: "Kokum or tamarind, jaggery pinch", hi: "कोकम या इमली, चुटकी गुड़" },
      { en: "Chaas to serve", hi: "परोसने को छाछ" },
    ],
    steps: [
      { en: "Cook the dal soft and whisk it smooth.", hi: "दाल नरम पकाएँ और चिकना फेंटें।" },
      { en: "Season with kokum and a pinch of jaggery — sweet-sour is the Maharashtrian signature.", hi: "कोकम और चुटकी गुड़ डालें — खट्टा-मीठा ही महाराष्ट्रीय पहचान है।" },
      { en: "Knead bajra flour with hot water; it has no gluten so work fast.", hi: "बाजरे का आटा गरम पानी से गूँधें; ग्लूटेन नहीं है इसलिए तेज़ी से काम करें।" },
      { en: "Pat the bhakri by hand rather than rolling, and cook on a hot tawa.", hi: "भाकरी बेलने के बजाय हाथ से थपथपाएँ, गरम तवे पर सेंकें।" },
    ],
    nutrition: n(14, 60, 11, 2, 9, 4, 420, 540, 74, 3.8, 96, 2.0, 10, 0, 0, 104),
  },
  "misal-pav": {
    serves: 3, minutes: 50,
    ingredients: [
      { en: "1 cup matki (moth beans), sprouted", hi: "1 कप मटकी, अंकुरित" },
      { en: "2 onions, coconut, goda masala", hi: "2 प्याज़, नारियल, गोडा मसाला" },
      { en: "Kanda-lasun masala or red chilli", hi: "कांदा-लसूण मसाला या लाल मिर्च" },
      { en: "3 pav, farsan, lemon", hi: "3 पाव, फ़रसाण, नींबू" },
    ],
    steps: [
      { en: "Sprout the matki two days ahead — the sprouting is what raises the iron and vitamin C.", hi: "मटकी दो दिन पहले अंकुरित करें — अंकुरण ही लोहा और विटामिन सी बढ़ाता है।" },
      { en: "Roast onion and coconut dark, then grind — this is the kat.", hi: "प्याज़ और नारियल गहरा भूनें, फिर पीसें — यही कट है।" },
      { en: "Cook the sprouts with the masala until soft.", hi: "अंकुरित मटकी मसाले के साथ नरम होने तक पकाएँ।" },
      { en: "Serve with one pav, lemon, and go easy on the farsan — that is where the salt and oil hide.", hi: "एक पाव और नींबू के साथ परोसें, फ़रसाण कम रखें — नमक और तेल वहीं छिपे हैं।" },
    ],
    nutrition: n(16, 55, 15, 4, 11, 5, 720, 680, 88, 4.6, 92, 2.2, 16, 0, 0, 172),
  },
  "khichdi-kadhi": {
    serves: 3, minutes: 40,
    ingredients: [
      { en: "1 cup rice, ½ cup moong dal", hi: "1 कप चावल, ½ कप मूंग दाल" },
      { en: "1.5 cups sour dahi", hi: "1.5 कप खट्टा दही" },
      { en: "3 tbsp besan", hi: "3 बड़े चम्मच बेसन" },
      { en: "Curry leaves, mustard, ginger", hi: "करी पत्ता, राई, अदरक" },
      { en: "Pinch of jaggery", hi: "चुटकी गुड़" },
    ],
    steps: [
      { en: "Whisk dahi and besan absolutely smooth before heating — lumps will not come out later.", hi: "गरम करने से पहले दही-बेसन बिल्कुल चिकना फेंटें — गुठलियाँ बाद में नहीं जातीं।" },
      { en: "Heat slowly and stir constantly in one direction until it thickens.", hi: "धीरे गरम करें और एक ही दिशा में लगातार चलाएँ जब तक गाढ़ा न हो।" },
      { en: "Simmer 15 minutes so the besan loses its raw taste.", hi: "15 मिनट पकाएँ ताकि बेसन का कच्चापन जाए।" },
      { en: "Temper and pour over. Serve with plain khichdi.", hi: "तड़का लगाकर ऊपर डालें। सादी खिचड़ी के साथ परोसें।" },
    ],
    nutrition: n(13, 56, 10, 5, 6, 6, 440, 400, 240, 2.2, 58, 1.4, 3, 0.7, 0.1, 76),
  },

  /* ------------------------------------------------------ WEST · nonveg */
  "kolhapuri-chicken": {
    serves: 3, minutes: 55,
    ingredients: [
      { en: "500 g chicken", hi: "500 ग्राम चिकन" },
      { en: "Kolhapuri kanda-lasun masala", hi: "कोल्हापुरी कांदा-लसूण मसाला" },
      { en: "Dry coconut, 2 onions", hi: "सूखा नारियल, 2 प्याज़" },
      { en: "Byadgi chillies", hi: "ब्याडगी मिर्च" },
      { en: "6 bajra bhakris", hi: "6 बाजरा भाकरी" },
    ],
    steps: [
      { en: "Roast dry coconut and onion until properly dark, then grind with chillies.", hi: "सूखा नारियल और प्याज़ गहरा भूनें, फिर मिर्च के साथ पीसें।" },
      { en: "Marinate the chicken in turmeric and salt for 20 minutes.", hi: "चिकन को हल्दी-नमक में 20 मिनट रखें।" },
      { en: "Sear the chicken, add the ground masala, cook until oil floats.", hi: "चिकन सेकें, पिसा मसाला डालें, तेल तैरने तक पकाएँ।" },
      { en: "Pair with bajra bhakri, not rice — it balances the glycaemic load.", hi: "चावल नहीं, बाजरा भाकरी के साथ लें — ग्लाइसेमिक लोड संतुलित रहता है।" },
    ],
    nutrition: n(35, 45, 24, 10, 6, 4, 660, 620, 92, 4.2, 88, 3.6, 10, 0.6, 0.2, 62),
  },
  "bombil-fry": {
    serves: 2, minutes: 25,
    ingredients: [
      { en: "6 bombil (Bombay duck), cleaned", hi: "6 बोंबिल, साफ़ किए" },
      { en: "3 tbsp rava (semolina)", hi: "3 बड़े चम्मच रवा (सूजी)" },
      { en: "1 tbsp chilli powder, turmeric", hi: "1 बड़ा चम्मच मिर्च, हल्दी" },
      { en: "Ginger-garlic paste, lemon", hi: "अदरक-लहसुन पेस्ट, नींबू" },
      { en: "1 cup rice", hi: "1 कप चावल" },
    ],
    steps: [
      { en: "Pat the bombil very dry — it holds a lot of water and will not crisp otherwise.", hi: "बोंबिल को अच्छी तरह सुखाएँ — इसमें बहुत पानी होता है, वरना कुरकुरा नहीं होगा।" },
      { en: "Marinate with chilli, turmeric, ginger-garlic and salt for 15 minutes.", hi: "मिर्च, हल्दी, अदरक-लहसुन और नमक में 15 मिनट रखें।" },
      { en: "Press into rava on both sides.", hi: "दोनों तरफ़ रवा में लपेटें।" },
      { en: "Shallow fry, not deep — 3 minutes a side is enough.", hi: "कम तेल में तलें, डुबोकर नहीं — हर तरफ़ 3 मिनट काफ़ी है।" },
    ],
    nutrition: n(28, 50, 12, 3, 2, 2, 560, 480, 200, 2.6, 54, 1.8, 8, 2.4, 4.2, 32),
  },

  /* ================================================================
     Recipes for the nine meals added to fill the empty filter cells.
     Nutrition follows the same IFCT 2017 conventions as the rest:
     per serving, cooked weight, sodium as added salt only.
     ================================================================ */

  "roasted-chana": {
    serves: 1, minutes: 5,
    ingredients: [
      { en: "½ cup roasted chana (bhuna chana), skin on", hi: "½ कप भुना चना, छिलके सहित" },
      { en: "1 tbsp jaggery, broken small", hi: "1 बड़ा चम्मच गुड़, छोटे टुकड़ों में" },
      { en: "A pinch of black salt", hi: "चुटकी भर काला नमक" },
    ],
    steps: [
      { en: "Warm the chana in a dry pan for a minute — it wakes the nuttiness up.", hi: "चने को सूखे तवे पर एक मिनट गरम करें — खुशबू लौट आती है।" },
      { en: "Take off the heat, toss with black salt.", hi: "आँच से हटाकर काला नमक मिलाएँ।" },
      { en: "Eat with the jaggery alongside, not mixed in — the sweetness is a chaser, not a coating.", hi: "गुड़ साथ में खाएँ, मिलाकर नहीं — मिठास साथ के लिए है, लपेटने के लिए नहीं।" },
    ],
    nutrition: n(10, 26, 3, 0.4, 8, 9, 120, 340, 58, 2.4, 62, 1.4, 1, 0, 0, 68),
  },
  "egg-chaat": {
    serves: 1, minutes: 12,
    ingredients: [
      { en: "2 eggs, hard boiled", hi: "2 अंडे, कड़े उबले" },
      { en: "1 small onion, finely chopped", hi: "1 छोटा प्याज़, बारीक कटा" },
      { en: "½ tsp chaat masala, juice of half a lemon", hi: "½ छोटा चम्मच चाट मसाला, आधा नींबू" },
      { en: "Coriander, and green chilli if you want it", hi: "धनिया, और चाहें तो हरी मिर्च" },
    ],
    steps: [
      { en: "Boil the eggs eight minutes, then straight into cold water so the shells come away clean.", hi: "अंडे आठ मिनट उबालें, फिर ठंडे पानी में डालें ताकि छिलका आसानी से उतरे।" },
      { en: "Quarter them lengthways.", hi: "लंबाई में चार टुकड़े करें।" },
      { en: "Scatter the onion over, dust with chaat masala, squeeze the lemon on last.", hi: "ऊपर प्याज़ डालें, चाट मसाला छिड़कें, आख़िर में नींबू निचोड़ें।" },
    ],
    nutrition: n(14, 12, 11, 3.4, 2, 4, 340, 220, 62, 1.9, 18, 1.3, 6, 1.1, 2.2, 48),
  },
  sundal: {
    serves: 2, minutes: 20,
    ingredients: [
      { en: "1 cup kabuli chana, soaked overnight", hi: "1 कप काबुली चना, रातभर भिगोया" },
      { en: "3 tbsp fresh coconut, grated", hi: "3 बड़े चम्मच ताज़ा नारियल, कद्दूकस" },
      { en: "1 tsp mustard seeds, 8 curry leaves", hi: "1 छोटा चम्मच राई, 8 करी पत्ते" },
      { en: "1 dried red chilli, pinch of asafoetida", hi: "1 सूखी लाल मिर्च, चुटकी हींग" },
    ],
    steps: [
      { en: "Pressure cook the soaked chana until soft but still holding shape — three whistles.", hi: "भीगे चने को नरम पर साबुत रहने तक उबालें — तीन सीटी।" },
      { en: "Crackle mustard in a teaspoon of oil, add curry leaves, chilli and asafoetida.", hi: "एक चम्मच तेल में राई चटकाएँ, करी पत्ता, मिर्च और हींग डालें।" },
      { en: "Fold the drained chana through, then the coconut off the heat so it stays fresh.", hi: "छना चना मिलाएँ, फिर आँच बंद करके नारियल डालें ताकि ताज़ा रहे।" },
    ],
    nutrition: n(11, 28, 4, 2.1, 9, 5, 180, 290, 64, 2.2, 58, 1.5, 2, 0, 0, 82),
  },
  "egg-podimas": {
    serves: 1, minutes: 12,
    ingredients: [
      { en: "2 eggs, beaten", hi: "2 अंडे, फेंटे हुए" },
      { en: "1 small onion, 1 green chilli, both fine", hi: "1 छोटा प्याज़, 1 हरी मिर्च, दोनों बारीक" },
      { en: "½ tsp mustard seeds, 6 curry leaves, ¼ tsp turmeric", hi: "½ छोटा चम्मच राई, 6 करी पत्ते, ¼ छोटा चम्मच हल्दी" },
    ],
    steps: [
      { en: "Crackle the mustard, add curry leaf, chilli and onion. Cook until the onion goes soft.", hi: "राई चटकाएँ, करी पत्ता, मिर्च और प्याज़ डालें। प्याज़ नरम होने तक पकाएँ।" },
      { en: "Stir in turmeric, then pour the eggs in and keep them moving.", hi: "हल्दी मिलाएँ, फिर अंडे डालकर लगातार चलाते रहें।" },
      { en: "Take it off while still slightly wet — it carries on cooking in the pan.", hi: "थोड़ा गीला रहते ही उतार लें — कड़ाही में पकता रहता है।" },
    ],
    nutrition: n(15, 8, 14, 4.2, 1, 3, 320, 190, 58, 2.0, 16, 1.4, 4, 1.1, 2.2, 44),
  },
  "dim-toast": {
    serves: 1, minutes: 12,
    ingredients: [
      { en: "2 eggs, beaten with salt and pepper", hi: "2 अंडे, नमक-काली मिर्च के साथ फेंटे" },
      { en: "2 slices bread, preferably a day old", hi: "2 ब्रेड स्लाइस, एक दिन पुरानी हो तो बेहतर" },
      { en: "1 small onion and 1 green chilli, chopped fine", hi: "1 छोटा प्याज़ और 1 हरी मिर्च, बारीक कटी" },
    ],
    steps: [
      { en: "Beat the onion and chilli into the eggs.", hi: "प्याज़ और मिर्च अंडों में फेंट लें।" },
      { en: "Soak each slice both sides — a day-old slice takes it up without falling apart.", hi: "हर स्लाइस दोनों तरफ़ भिगोएँ — पुरानी ब्रेड टूटे बिना सोख लेती है।" },
      { en: "Fry on a low flame until set and golden. Low heat matters; high heat browns the outside and leaves the egg wet.", hi: "धीमी आँच पर सुनहरा होने तक सेकें। आँच धीमी ज़रूरी है; तेज़ आँच बाहर से जला देती है और अंडा कच्चा रहता है।" },
    ],
    nutrition: n(17, 32, 15, 4.6, 3, 4, 440, 230, 96, 2.6, 28, 1.6, 3, 1.1, 2.2, 62),
  },
  "muri-makha": {
    serves: 1, minutes: 5,
    ingredients: [
      { en: "2 cups puffed rice (muri)", hi: "2 कप मुरमुरे (मूड़ी)" },
      { en: "1 tsp mustard oil, raw", hi: "1 छोटा चम्मच कच्चा सरसों तेल" },
      { en: "1 small onion, 1 green chilli, chopped", hi: "1 छोटा प्याज़, 1 हरी मिर्च, कटी" },
      { en: "A few roasted peanuts, optional", hi: "कुछ भुनी मूंगफली, वैकल्पिक" },
    ],
    steps: [
      { en: "Put everything in a bowl.", hi: "सब कुछ एक कटोरे में डालें।" },
      { en: "Mix with your hand — that is the whole technique, and a spoon genuinely does not do it as well.", hi: "हाथ से मिलाएँ — यही पूरी विधि है, चम्मच से वैसा नहीं बनता।" },
      { en: "Eat at once, before the muri softens.", hi: "तुरंत खाएँ, मुरमुरे नरम पड़ने से पहले।" },
    ],
    nutrition: n(5, 30, 3, 0.4, 3, 2, 210, 120, 18, 1.4, 22, 0.7, 3, 0, 0, 18),
  },
  "dimer-devil": {
    serves: 2, minutes: 30,
    ingredients: [
      { en: "2 eggs, hard boiled and halved", hi: "2 अंडे, कड़े उबले और आधे कटे" },
      { en: "1 boiled potato, mashed", hi: "1 उबला आलू, मसला" },
      { en: "½ tsp garam masala, ½ tsp ginger-garlic paste", hi: "½ छोटा चम्मच गरम मसाला, ½ छोटा चम्मच अदरक-लहसुन" },
      { en: "Breadcrumbs, and 1 egg for coating", hi: "ब्रेडक्रम्ब्स, और लपेटने को 1 अंडा" },
    ],
    steps: [
      { en: "Mix the potato with the masalas and salt.", hi: "आलू में मसाले और नमक मिलाएँ।" },
      { en: "Wrap each egg half in the potato, then coat in beaten egg and crumbs.", hi: "हर आधे अंडे को आलू से ढकें, फिर फेंटे अंडे और चूरे में लपेटें।" },
      { en: "Bake at 200°C for 20 minutes, turning once. Baked rather than deep fried — same crust, a third of the oil.", hi: "200°C पर 20 मिनट बेक करें, बीच में पलटें। तलने की जगह बेक — परत वही, तेल एक-तिहाई।" },
    ],
    nutrition: n(16, 18, 12, 3.6, 2, 3, 380, 310, 72, 2.2, 26, 1.5, 8, 1.1, 2.0, 54),
  },
  akuri: {
    serves: 1, minutes: 15,
    ingredients: [
      { en: "2 eggs, lightly beaten", hi: "2 अंडे, हल्के फेंटे" },
      { en: "1 tomato and 1 onion, both chopped fine", hi: "1 टमाटर और 1 प्याज़, दोनों बारीक कटे" },
      { en: "1 green chilli, ¼ tsp turmeric, plenty of coriander", hi: "1 हरी मिर्च, ¼ छोटा चम्मच हल्दी, ख़ूब धनिया" },
      { en: "1 pav to serve", hi: "साथ में 1 पाव" },
    ],
    steps: [
      { en: "Soften the onion, then the tomato and chilli, until the tomato collapses.", hi: "प्याज़ नरम करें, फिर टमाटर और मिर्च, जब तक टमाटर गल न जाए।" },
      { en: "Turn the heat right down before the eggs go in. Akuri is meant to stay soft and creamy.", hi: "अंडे डालने से पहले आँच बिलकुल धीमी करें। अकूरी नरम और मलाईदार रहनी चाहिए।" },
      { en: "Stir constantly and pull it off while it still looks underdone.", hi: "लगातार चलाएँ और थोड़ा कच्चा दिखते ही उतार लें।" },
    ],
    nutrition: n(18, 36, 18, 5.2, 3, 6, 460, 340, 88, 2.8, 30, 1.7, 14, 1.1, 2.2, 66),
  },
  "masala-egg-pav": {
    serves: 1, minutes: 10,
    ingredients: [
      { en: "2 eggs", hi: "2 अंडे" },
      { en: "1 small onion, 1 tomato, chopped", hi: "1 छोटा प्याज़, 1 टमाटर, कटे" },
      { en: "¼ tsp turmeric, ½ tsp pav bhaji masala", hi: "¼ छोटा चम्मच हल्दी, ½ छोटा चम्मच पाव भाजी मसाला" },
    ],
    steps: [
      { en: "Cook the onion until translucent, add tomato and the masalas.", hi: "प्याज़ को पारदर्शी होने तक पकाएँ, टमाटर और मसाले डालें।" },
      { en: "Pour the eggs in and scramble hard — bhurji wants small curds, not sheets.", hi: "अंडे डालकर तेज़ी से चलाएँ — भुर्जी में छोटे दाने चाहिए, परत नहीं।" },
      { en: "Serve in a cup without the pav. That is the whole point of it as a snack.", hi: "बिना पाव कटोरी में परोसें। नाश्ते के तौर पर यही बात है।" },
    ],
    nutrition: n(15, 10, 13, 4.0, 2, 4, 350, 260, 64, 2.1, 20, 1.4, 10, 1.1, 2.2, 50),
  },
};

export const recipeFor = (mealId: string): Recipe | undefined => RECIPES[mealId];

/** How many of the 29 library meals have a recipe written. */
export const recipeCount = () => Object.keys(RECIPES).length;
