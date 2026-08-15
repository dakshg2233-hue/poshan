/**
 * Condition-aware nutrition.
 *
 * Rules follow mainstream clinical nutrition practice — ICMR-NIN Dietary
 * Guidelines for Indians (2024), WHO sodium guidance, KDIGO for kidney
 * disease, and standard coeliac/thyroid management. Prevalence figures are
 * from ICMR-INDIAB (2023) and NFHS-5.
 *
 * This is educational. It does not diagnose, and it does not replace a
 * registered dietitian or a treating physician — several of these conditions
 * need bloodwork to titrate properly, and two of them give directly opposing
 * advice (see the CKD / hypertension conflict below).
 */

import type { Bi } from "./poshan-data";

export type ConditionKey =
  | "diabetes"
  | "hypertension"
  | "ckd"
  | "anaemia"
  | "hypothyroid"
  | "pcos"
  | "nafld"
  | "coeliac"
  | "dyslipidaemia"
  | "gout"
  | "lactose";

/** Attributes a dish can carry, used by the safety checker. */
export type FoodAttr =
  | "wheat"
  | "rice"
  | "millet"
  | "potato"
  | "dairy"
  | "lactose"
  | "legume"
  | "highPotassium"
  | "highPhosphorus"
  | "highPurine"
  | "fried"
  | "addedSugar"
  | "highSodium"
  | "goitrogenRaw"
  | "nuts"
  | "highFibre"
  | "lowGI"
  | "ironRich"
  | "vitaminC"
  | "leanProtein"
  | "saturatedFat"
  | "egg"
  | "fish";

export type Verdict = "good" | "caution" | "avoid";

export type Condition = {
  key: ConditionKey;
  name: Bi;
  /** Indian prevalence, so the scale is concrete rather than abstract. */
  prevalence: Bi;
  principle: Bi;
  favour: Bi[];
  limit: Bi[];
  /** The thing people actually get wrong. */
  watchOut: Bi;
  /** Adjustment to the daily target, kilocalories. */
  kcalDelta: number;
  rules: { attr: FoodAttr; verdict: Verdict; why: Bi }[];
};

export const CONDITIONS: Condition[] = [
  {
    key: "diabetes",
    name: { en: "Type 2 diabetes", hi: "टाइप 2 डायबिटीज़" },
    prevalence: {
      en: "About 101 million Indians live with diabetes, and another 136 million are pre-diabetic (ICMR-INDIAB, 2023).",
      hi: "लगभग 10.1 करोड़ भारतीय डायबिटीज़ के साथ जीते हैं, और 13.6 करोड़ प्री-डायबिटिक हैं (ICMR-INDIAB, 2023)।",
    },
    principle: {
      en: "Lower the glycaemic load of the plate, not the amount of food. Swapping polished rice for millets moves blood sugar further than any supplement.",
      hi: "थाली का ग्लाइसेमिक लोड घटाएँ, खाने की मात्रा नहीं। पॉलिश चावल की जगह बाजरा-ज्वार लेना किसी भी सप्लीमेंट से ज़्यादा असर करता है।",
    },
    favour: [
      { en: "Bajra, jowar and ragi rotis", hi: "बाजरा, ज्वार और रागी की रोटी" },
      { en: "Whole dals and rajma — protein with fibre", hi: "साबुत दाल और राजमा — प्रोटीन के साथ रेशा" },
      { en: "Methi, karela, and green leafy sabzi", hi: "मेथी, करेला और हरी पत्तेदार सब्ज़ी" },
      { en: "Dahi without sugar", hi: "बिना चीनी का दही" },
    ],
    limit: [
      { en: "White rice, maida, and refined flour breads", hi: "सफ़ेद चावल, मैदा और रिफ़ाइंड आटे की रोटी" },
      { en: "Potato, and fruit juice of any kind", hi: "आलू, और किसी भी तरह का फलों का रस" },
      { en: "Sugar, jaggery and honey — all raise glucose", hi: "चीनी, गुड़ और शहद — सभी ग्लूकोज़ बढ़ाते हैं" },
    ],
    watchOut: {
      en: "Jaggery is not a free pass. It raises blood glucose almost as fast as white sugar; the small mineral content does not offset that.",
      hi: "गुड़ छूट नहीं है। यह रक्त ग्लूकोज़ लगभग चीनी जितनी तेज़ी से बढ़ाता है; थोड़े खनिज उसकी भरपाई नहीं करते।",
    },
    kcalDelta: -200,
    rules: [
      { attr: "lowGI", verdict: "good", why: { en: "Low glycaemic load — releases glucose slowly.", hi: "कम ग्लाइसेमिक लोड — ग्लूकोज़ धीरे छोड़ता है।" } },
      { attr: "highFibre", verdict: "good", why: { en: "Fibre blunts the post-meal glucose rise.", hi: "रेशा भोजन के बाद की ग्लूकोज़ बढ़त को कम करता है।" } },
      { attr: "millet", verdict: "good", why: { en: "Millets sit far lower on the glycaemic index than rice.", hi: "बाजरा-ज्वार चावल से कहीं कम ग्लाइसेमिक इंडेक्स पर हैं।" } },
      { attr: "rice", verdict: "caution", why: { en: "Polished rice spikes glucose. Halve the portion or swap for millet.", hi: "पॉलिश चावल ग्लूकोज़ बढ़ाता है। मात्रा आधी करें या बाजरा लें।" } },
      { attr: "potato", verdict: "caution", why: { en: "Potato behaves like sugar once cooked.", hi: "पका आलू शर्करा जैसा व्यवहार करता है।" } },
      { attr: "addedSugar", verdict: "avoid", why: { en: "Added sugar or jaggery raises glucose sharply.", hi: "मिलाई गई चीनी या गुड़ ग्लूकोज़ तेज़ी से बढ़ाते हैं।" } },
    ],
  },
  {
    key: "hypertension",
    name: { en: "High blood pressure", hi: "उच्च रक्तचाप" },
    prevalence: {
      en: "Roughly one in four Indian adults is hypertensive, and fewer than half know it.",
      hi: "लगभग हर चार में एक भारतीय वयस्क को उच्च रक्तचाप है, और आधे से भी कम को इसका पता है।",
    },
    principle: {
      en: "Salt is the lever, and most of it is not in the salt shaker. WHO sets the ceiling at 5 g of salt a day — one teaspoon, everything included.",
      hi: "नमक ही असली नियंत्रण है, और उसका ज़्यादातर हिस्सा नमकदानी में नहीं होता। डब्ल्यूएचओ की सीमा है 5 ग्राम नमक प्रतिदिन — एक छोटा चम्मच, सब कुछ मिलाकर।",
    },
    favour: [
      { en: "Fresh sabzi and fruit — potassium offsets sodium", hi: "ताज़ी सब्ज़ी और फल — पोटैशियम सोडियम की भरपाई करता है" },
      { en: "Dahi and chaas without added salt", hi: "बिना नमक का दही और छाछ" },
      { en: "Whole grains and dals", hi: "साबुत अनाज और दाल" },
    ],
    limit: [
      { en: "Pickle, papad, and namkeen", hi: "अचार, पापड़ और नमकीन" },
      { en: "Packaged snacks and instant noodles", hi: "पैकेट स्नैक्स और इंस्टेंट नूडल्स" },
      { en: "Salt added at the table", hi: "खाने की मेज़ पर ऊपर से नमक" },
    ],
    watchOut: {
      en: "One papad and two spoons of pickle can carry more sodium than the rest of the day's cooking combined. This is where Indian plates quietly fail.",
      hi: "एक पापड़ और दो चम्मच अचार में पूरे दिन की बाक़ी रसोई से ज़्यादा सोडियम हो सकता है। भारतीय थाली यहीं चुपचाप चूक जाती है।",
    },
    kcalDelta: -150,
    rules: [
      { attr: "highSodium", verdict: "avoid", why: { en: "High sodium — the single strongest driver of blood pressure.", hi: "अधिक सोडियम — रक्तचाप का सबसे बड़ा कारण।" } },
      { attr: "highPotassium", verdict: "good", why: { en: "Potassium helps the body clear sodium.", hi: "पोटैशियम शरीर से सोडियम निकालने में मदद करता है।" } },
      { attr: "fried", verdict: "caution", why: { en: "Fried food usually arrives salted too.", hi: "तला खाना आमतौर पर नमकीन भी होता है।" } },
      { attr: "highFibre", verdict: "good", why: { en: "Fibre-rich eating patterns lower blood pressure.", hi: "रेशेदार आहार रक्तचाप घटाता है।" } },
    ],
  },
  {
    key: "ckd",
    name: { en: "Chronic kidney disease", hi: "दीर्घकालिक गुर्दा रोग" },
    prevalence: {
      en: "Diabetes and hypertension drive most Indian kidney disease, so it often arrives alongside both.",
      hi: "भारत में गुर्दा रोग ज़्यादातर डायबिटीज़ और उच्च रक्तचाप से आता है, इसलिए यह अक्सर दोनों के साथ ही आता है।",
    },
    principle: {
      en: "Failing kidneys cannot clear potassium, phosphorus or excess protein. This is the one condition where advice reverses: foods recommended for blood pressure can be dangerous here.",
      hi: "कमज़ोर गुर्दे पोटैशियम, फ़ॉस्फ़ोरस और अतिरिक्त प्रोटीन नहीं निकाल पाते। यही वह स्थिति है जहाँ सलाह उलट जाती है: रक्तचाप के लिए सुझाए भोजन यहाँ ख़तरनाक हो सकते हैं।",
    },
    favour: [
      { en: "Vegetables double-boiled to leach potassium", hi: "पोटैशियम निकालने को दो बार उबाली सब्ज़ियाँ" },
      { en: "Rice and refined grains — low in phosphorus", hi: "चावल और रिफ़ाइंड अनाज — फ़ॉस्फ़ोरस में कम" },
      { en: "Portion-controlled protein, as your nephrologist sets it", hi: "नियंत्रित मात्रा में प्रोटीन, जैसा आपके नेफ़्रोलॉजिस्ट कहें" },
    ],
    limit: [
      { en: "Banana, coconut water, and citrus", hi: "केला, नारियल पानी और खट्टे फल" },
      { en: "Potato and tomato unless leached", hi: "आलू और टमाटर, जब तक उबालकर न निकाला जाए" },
      { en: "Dals, nuts and dairy — high phosphorus", hi: "दाल, मेवे और दुग्ध — अधिक फ़ॉस्फ़ोरस" },
    ],
    watchOut: {
      en: "Coconut water is widely treated as harmless in India. In advanced kidney disease its potassium load can be life-threatening. Never follow generic blood-pressure advice if you have CKD — ask your nephrologist.",
      hi: "भारत में नारियल पानी को हानिरहित माना जाता है। बढ़े हुए गुर्दा रोग में इसका पोटैशियम जानलेवा हो सकता है। सीकेडी में सामान्य रक्तचाप सलाह कभी न अपनाएँ — अपने नेफ़्रोलॉजिस्ट से पूछें।",
    },
    kcalDelta: 0,
    rules: [
      { attr: "highPotassium", verdict: "avoid", why: { en: "High potassium — kidneys cannot clear it, and the heart is at risk.", hi: "अधिक पोटैशियम — गुर्दे इसे नहीं निकाल पाते, हृदय पर जोखिम।" } },
      { attr: "highPhosphorus", verdict: "avoid", why: { en: "High phosphorus damages bone and vessels in kidney disease.", hi: "अधिक फ़ॉस्फ़ोरस गुर्दा रोग में हड्डी और नसों को नुक़सान पहुँचाता है।" } },
      { attr: "legume", verdict: "caution", why: { en: "Dals carry both potassium and phosphorus — portion strictly.", hi: "दाल में पोटैशियम और फ़ॉस्फ़ोरस दोनों — मात्रा सख़्ती से रखें।" } },
      { attr: "potato", verdict: "caution", why: { en: "Only if double-boiled and the water discarded.", hi: "केवल दो बार उबालकर और पानी फेंककर।" } },
      { attr: "rice", verdict: "good", why: { en: "Low in phosphorus, unlike whole grains.", hi: "साबुत अनाज के विपरीत फ़ॉस्फ़ोरस में कम।" } },
    ],
  },
  {
    key: "anaemia",
    name: { en: "Iron deficiency anaemia", hi: "लोहे की कमी से एनीमिया" },
    prevalence: {
      en: "57% of Indian women aged 15–49 are anaemic (NFHS-5) — the single most common nutritional disorder in the country.",
      hi: "15–49 वर्ष की 57% भारतीय महिलाएँ एनीमिक हैं (NFHS-5) — देश का सबसे आम पोषण विकार।",
    },
    principle: {
      en: "Plant iron is poorly absorbed on its own. What you drink with the meal matters as much as what you eat.",
      hi: "पौधों का लोहा अकेले ठीक से अवशोषित नहीं होता। भोजन के साथ आप क्या पीते हैं, यह उतना ही मायने रखता है।",
    },
    favour: [
      { en: "Rajma, chana, palak and ragi", hi: "राजमा, चना, पालक और रागी" },
      { en: "Lemon or amla with the meal — vitamin C multiplies absorption", hi: "भोजन के साथ नींबू या आँवला — विटामिन सी अवशोषण कई गुना करता है" },
      { en: "Cooking in an iron kadhai", hi: "लोहे की कड़ाही में पकाना" },
    ],
    limit: [
      { en: "Tea and coffee within an hour of eating", hi: "खाने के एक घंटे के भीतर चाय और कॉफ़ी" },
      { en: "Calcium supplements taken with iron-rich meals", hi: "लोहे वाले भोजन के साथ कैल्शियम सप्लीमेंट" },
    ],
    watchOut: {
      en: "Chai immediately after lunch is the most common reason Indian iron levels stay low despite a decent diet — tannins can cut absorption by more than half. Move the cup an hour later.",
      hi: "दोपहर के खाने के तुरंत बाद चाय ही सबसे आम कारण है कि अच्छा खाने पर भी लोहे का स्तर कम रहता है — टैनिन अवशोषण आधे से ज़्यादा घटा देते हैं। चाय एक घंटे बाद लें।",
    },
    kcalDelta: 0,
    rules: [
      { attr: "ironRich", verdict: "good", why: { en: "Meaningful iron content.", hi: "अच्छी मात्रा में लोहा।" } },
      { attr: "vitaminC", verdict: "good", why: { en: "Vitamin C alongside iron sharply raises absorption.", hi: "लोहे के साथ विटामिन सी अवशोषण बहुत बढ़ाता है।" } },
      { attr: "legume", verdict: "good", why: { en: "Legumes are the main iron source on a vegetarian plate.", hi: "शाकाहारी थाली में दालें ही लोहे का मुख्य स्रोत हैं।" } },
      { attr: "dairy", verdict: "caution", why: { en: "Calcium competes with iron — separate them by an hour.", hi: "कैल्शियम लोहे से टकराता है — एक घंटे का अंतर रखें।" } },
    ],
  },
  {
    key: "hypothyroid",
    name: { en: "Hypothyroidism", hi: "हाइपोथायरॉइडिज़्म" },
    prevalence: {
      en: "Roughly 1 in 10 Indian adults, and far more common in women.",
      hi: "लगभग हर 10 में 1 भारतीय वयस्क, और महिलाओं में कहीं ज़्यादा आम।",
    },
    principle: {
      en: "Diet supports the thyroid; it does not replace the tablet. Timing around levothyroxine matters more than any single food.",
      hi: "आहार थायरॉइड का साथ देता है; गोली की जगह नहीं लेता। किसी भी भोजन से ज़्यादा मायने रखता है लेवोथायरोक्सिन का समय।",
    },
    favour: [
      { en: "Iodised salt in normal cooking amounts", hi: "सामान्य मात्रा में आयोडीन युक्त नमक" },
      { en: "Selenium from a few nuts or seeds daily", hi: "रोज़ कुछ मेवे या बीजों से सेलेनियम" },
      { en: "Adequate iron and zinc", hi: "पर्याप्त लोहा और ज़िंक" },
    ],
    limit: [
      { en: "Large amounts of raw cabbage, cauliflower or broccoli", hi: "बड़ी मात्रा में कच्ची पत्तागोभी, फूलगोभी या ब्रोकली" },
      { en: "Soy close to your thyroid tablet", hi: "थायरॉइड की गोली के आसपास सोया" },
    ],
    watchOut: {
      en: "Take levothyroxine on an empty stomach and wait 30–60 minutes before chai or breakfast. Calcium, iron and soy should be at least four hours apart from it. Cooking deactivates most goitrogens, so cooked gobhi is fine.",
      hi: "लेवोथायरोक्सिन खाली पेट लें और चाय या नाश्ते से 30–60 मिनट पहले। कैल्शियम, लोहा और सोया इससे कम से कम चार घंटे अलग रखें। पकाने से अधिकांश गॉइट्रोजन निष्क्रिय हो जाते हैं, इसलिए पकी गोभी ठीक है।",
    },
    kcalDelta: 0,
    rules: [
      { attr: "goitrogenRaw", verdict: "caution", why: { en: "Fine cooked, limit raw and in quantity.", hi: "पका हुआ ठीक, कच्चा और अधिक मात्रा सीमित रखें।" } },
      { attr: "nuts", verdict: "good", why: { en: "Selenium and zinc support thyroid hormone conversion.", hi: "सेलेनियम और ज़िंक थायरॉइड हार्मोन रूपांतरण में मदद करते हैं।" } },
      { attr: "ironRich", verdict: "good", why: { en: "Iron deficiency worsens thyroid symptoms.", hi: "लोहे की कमी थायरॉइड लक्षण बढ़ाती है।" } },
    ],
  },
  {
    key: "pcos",
    name: { en: "PCOS", hi: "पीसीओएस" },
    prevalence: {
      en: "Affects an estimated 1 in 5 Indian women of reproductive age.",
      hi: "प्रजनन आयु की अनुमानित हर 5 में 1 भारतीय महिला प्रभावित।",
    },
    principle: {
      en: "PCOS is largely an insulin-resistance problem. Lowering glycaemic load and adding protein does more than cutting calories alone.",
      hi: "पीसीओएस मुख्यतः इंसुलिन प्रतिरोध की समस्या है। ग्लाइसेमिक लोड घटाना और प्रोटीन बढ़ाना अकेले कैलोरी घटाने से ज़्यादा असरदार है।",
    },
    favour: [
      { en: "Millets, whole dals and paneer", hi: "बाजरा-ज्वार, साबुत दाल और पनीर" },
      { en: "Methi seeds and cinnamon", hi: "मेथी दाना और दालचीनी" },
      { en: "Protein at breakfast, not just at dinner", hi: "नाश्ते में भी प्रोटीन, सिर्फ़ रात में नहीं" },
    ],
    limit: [
      { en: "Maida, sugary chai and bakery items", hi: "मैदा, मीठी चाय और बेकरी की चीज़ें" },
      { en: "Fruit juice and sweetened drinks", hi: "फलों का रस और मीठे पेय" },
    ],
    watchOut: {
      en: "A 5–10% reduction in body weight restores ovulation for many women — a far smaller change than most crash diets aim at, and it holds.",
      hi: "शरीर के वज़न में 5–10% की कमी कई महिलाओं में ओव्यूलेशन लौटा देती है — अधिकांश क्रैश डाइट के लक्ष्य से कहीं छोटा बदलाव, और यह टिकता है।",
    },
    kcalDelta: -250,
    rules: [
      { attr: "lowGI", verdict: "good", why: { en: "Low glycaemic load eases insulin resistance.", hi: "कम ग्लाइसेमिक लोड इंसुलिन प्रतिरोध घटाता है।" } },
      { attr: "leanProtein", verdict: "good", why: { en: "Protein steadies appetite and blood sugar.", hi: "प्रोटीन भूख और रक्त शर्करा दोनों स्थिर रखता है।" } },
      { attr: "addedSugar", verdict: "avoid", why: { en: "Sugar worsens the insulin picture directly.", hi: "चीनी इंसुलिन की स्थिति सीधे बिगाड़ती है।" } },
      { attr: "highFibre", verdict: "good", why: { en: "Fibre slows glucose entry.", hi: "रेशा ग्लूकोज़ के प्रवेश को धीमा करता है।" } },
    ],
  },
  {
    key: "coeliac",
    name: { en: "Coeliac disease", hi: "सीलिएक रोग" },
    prevalence: {
      en: "Around 1 in 100, and heavily underdiagnosed — especially across the wheat-eating north.",
      hi: "लगभग 100 में 1, और बहुत कम पहचाना जाता है — ख़ासकर गेहूँ खाने वाले उत्तर भारत में।",
    },
    principle: {
      en: "This is not a preference. Any gluten damages the small intestine, whether or not symptoms follow.",
      hi: "यह पसंद का मामला नहीं है। कोई भी ग्लूटेन छोटी आंत को नुक़सान पहुँचाता है, चाहे लक्षण दिखें या नहीं।",
    },
    favour: [
      { en: "Rice, bajra, jowar and ragi", hi: "चावल, बाजरा, ज्वार और रागी" },
      { en: "Besan, makhana and all dals", hi: "बेसन, मखाना और सभी दालें" },
      { en: "Idli, dosa and curd rice", hi: "इडली, डोसा और दही चावल" },
    ],
    limit: [
      { en: "Wheat, barley and rye in every form", hi: "गेहूँ, जौ और राई हर रूप में" },
      { en: "Roti, paratha, suji, dalia and maida", hi: "रोटी, पराठा, सूजी, दलिया और मैदा" },
    ],
    watchOut: {
      en: "Hing sold in India is very often cut with wheat flour, and so is much commercial garam masala. Check the packet — this is the most common hidden source on an Indian coeliac plate.",
      hi: "भारत में बिकने वाली हींग में अक्सर गेहूँ का आटा मिलाया जाता है, और कई गरम मसालों में भी। पैकेट देखें — भारतीय सीलिएक थाली का यही सबसे आम छिपा स्रोत है।",
    },
    kcalDelta: 0,
    rules: [
      { attr: "wheat", verdict: "avoid", why: { en: "Contains gluten — damages the intestine even without symptoms.", hi: "इसमें ग्लूटेन है — बिना लक्षण के भी आंत को नुक़सान पहुँचाता है।" } },
      { attr: "millet", verdict: "good", why: { en: "Naturally gluten free.", hi: "प्राकृतिक रूप से ग्लूटेन मुक्त।" } },
      { attr: "rice", verdict: "good", why: { en: "Naturally gluten free.", hi: "प्राकृतिक रूप से ग्लूटेन मुक्त।" } },
    ],
  },
  {
    key: "dyslipidaemia",
    name: { en: "High cholesterol", hi: "उच्च कोलेस्ट्रॉल" },
    prevalence: {
      en: "Indians develop coronary disease around a decade earlier than Europeans, and at lower body weights.",
      hi: "भारतीयों में हृदय रोग यूरोपीय लोगों से लगभग एक दशक पहले और कम वज़न पर ही होता है।",
    },
    principle: {
      en: "Saturated and trans fat move cholesterol more than dietary cholesterol itself. The cooking medium matters more than the egg.",
      hi: "संतृप्त और ट्रांस वसा, आहार के कोलेस्ट्रॉल से कहीं ज़्यादा असर डालते हैं। अंडे से ज़्यादा मायने रखता है पकाने का माध्यम।",
    },
    favour: [
      { en: "Mustard, groundnut or rice bran oil", hi: "सरसों, मूँगफली या राइस ब्रान तेल" },
      { en: "Oats, ragi and whole dals for soluble fibre", hi: "घुलनशील रेशे के लिए ओट्स, रागी और साबुत दाल" },
      { en: "A small handful of nuts daily", hi: "रोज़ मुट्ठी भर मेवे" },
    ],
    limit: [
      { en: "Vanaspati and repeatedly reheated oil", hi: "वनस्पति और बार-बार गरम किया तेल" },
      { en: "Deep-fried snacks and bakery items", hi: "तले स्नैक्स और बेकरी की चीज़ें" },
      { en: "Excess ghee, butter and coconut oil", hi: "अधिक घी, मक्खन और नारियल तेल" },
    ],
    watchOut: {
      en: "Reusing frying oil generates trans fats, which raise LDL and lower HDL at the same time. This is the single worst habit in Indian home and street cooking.",
      hi: "तलने का तेल दोबारा इस्तेमाल करने से ट्रांस वसा बनती है, जो एक साथ एलडीएल बढ़ाती और एचडीएल घटाती है। भारतीय घरेलू और सड़क रसोई की यही सबसे बुरी आदत है।",
    },
    kcalDelta: -200,
    rules: [
      { attr: "fried", verdict: "avoid", why: { en: "Frying, especially in reused oil, drives LDL up.", hi: "तलना, ख़ासकर दोबारा इस्तेमाल तेल में, एलडीएल बढ़ाता है।" } },
      { attr: "saturatedFat", verdict: "caution", why: { en: "Keep ghee, butter and coconut modest.", hi: "घी, मक्खन और नारियल सीमित रखें।" } },
      { attr: "highFibre", verdict: "good", why: { en: "Soluble fibre binds cholesterol in the gut.", hi: "घुलनशील रेशा आंत में कोलेस्ट्रॉल बाँधता है।" } },
      { attr: "fish", verdict: "good", why: { en: "Omega-3 improves the lipid profile.", hi: "ओमेगा-3 लिपिड प्रोफ़ाइल सुधारता है।" } },
    ],
  },
  {
    key: "nafld",
    name: { en: "Fatty liver", hi: "फ़ैटी लिवर" },
    prevalence: {
      en: "Around a third of Indian adults, including many who are not overweight.",
      hi: "लगभग एक-तिहाई भारतीय वयस्क, जिनमें कई अधिक वज़न वाले भी नहीं हैं।",
    },
    principle: {
      en: "Fructose and refined carbohydrate load the liver directly. Losing 7–10% of body weight reverses much of the fat.",
      hi: "फ़्रक्टोज़ और रिफ़ाइंड कार्बोहाइड्रेट सीधे लिवर पर बोझ डालते हैं। शरीर का 7–10% वज़न घटाने से अधिकांश चर्बी उलट जाती है।",
    },
    favour: [
      { en: "Whole grains, dals and plenty of sabzi", hi: "साबुत अनाज, दाल और भरपूर सब्ज़ी" },
      { en: "Coffee without sugar — good liver evidence", hi: "बिना चीनी की कॉफ़ी — लिवर पर अच्छे प्रमाण" },
    ],
    limit: [
      { en: "Cold drinks, packaged juice and sweets", hi: "कोल्ड ड्रिंक, पैकेट जूस और मिठाई" },
      { en: "Fried food and vanaspati", hi: "तला खाना और वनस्पति" },
    ],
    watchOut: {
      en: "Packaged fruit juice is worse for the liver than the fruit itself — the fibre is gone and the fructose arrives all at once.",
      hi: "पैकेट का फलों का रस फल से भी बुरा है — रेशा ग़ायब है और फ़्रक्टोज़ एक साथ पहुँचता है।",
    },
    kcalDelta: -300,
    rules: [
      { attr: "addedSugar", verdict: "avoid", why: { en: "Fructose is processed straight into liver fat.", hi: "फ़्रक्टोज़ सीधे लिवर की चर्बी में बदलता है।" } },
      { attr: "fried", verdict: "avoid", why: { en: "Fried food worsens liver fat.", hi: "तला खाना लिवर की चर्बी बढ़ाता है।" } },
      { attr: "highFibre", verdict: "good", why: { en: "Fibre improves liver enzymes.", hi: "रेशा लिवर एंज़ाइम सुधारता है।" } },
      { attr: "lowGI", verdict: "good", why: { en: "Slower carbohydrate reduces liver fat build-up.", hi: "धीमा कार्बोहाइड्रेट लिवर में चर्बी जमना घटाता है।" } },
    ],
  },
  {
    key: "gout",
    name: { en: "Gout", hi: "गठिया / गाउट" },
    prevalence: {
      en: "Rising quickly in urban India alongside metabolic syndrome.",
      hi: "मेटाबॉलिक सिंड्रोम के साथ शहरी भारत में तेज़ी से बढ़ रहा है।",
    },
    principle: {
      en: "Uric acid rises with purines, alcohol and fructose. Hydration and dairy lower it.",
      hi: "यूरिक एसिड प्यूरीन, शराब और फ़्रक्टोज़ से बढ़ता है। पानी और दुग्ध इसे घटाते हैं।",
    },
    favour: [
      { en: "Plenty of water — three litres a day", hi: "भरपूर पानी — रोज़ तीन लीटर" },
      { en: "Low-fat dahi and milk", hi: "कम वसा वाला दही और दूध" },
      { en: "Vegetables and whole grains", hi: "सब्ज़ियाँ और साबुत अनाज" },
    ],
    limit: [
      { en: "Organ meat, red meat and shellfish", hi: "कलेजी, लाल मांस और शेलफ़िश" },
      { en: "Alcohol, especially beer", hi: "शराब, ख़ासकर बीयर" },
      { en: "Large dal portions during a flare", hi: "दौरे के दौरान बड़ी मात्रा में दाल" },
    ],
    watchOut: {
      en: "Plant purines from dal do not raise gout risk the way meat purines do. Do not drop dal from a vegetarian diet on this basis outside an active flare.",
      hi: "दाल के पादप प्यूरीन, मांस के प्यूरीन जितना गाउट जोखिम नहीं बढ़ाते। सक्रिय दौरे के अलावा इस आधार पर शाकाहारी आहार से दाल न हटाएँ।",
    },
    kcalDelta: -150,
    rules: [
      { attr: "highPurine", verdict: "avoid", why: { en: "High purine content raises uric acid.", hi: "अधिक प्यूरीन यूरिक एसिड बढ़ाता है।" } },
      { attr: "dairy", verdict: "good", why: { en: "Dairy is associated with lower uric acid.", hi: "दुग्ध उत्पाद यूरिक एसिड घटाने से जुड़े हैं।" } },
      { attr: "addedSugar", verdict: "caution", why: { en: "Fructose raises uric acid.", hi: "फ़्रक्टोज़ यूरिक एसिड बढ़ाता है।" } },
    ],
  },
  {
    key: "lactose",
    name: { en: "Lactose intolerance", hi: "लैक्टोज़ असहिष्णुता" },
    prevalence: {
      en: "Common across much of India, and more so in the south and east than the north.",
      hi: "भारत के बड़े हिस्से में आम, और उत्तर की तुलना में दक्षिण व पूर्व में अधिक।",
    },
    principle: {
      en: "Fermentation breaks down most of the lactose, which is why dahi is usually fine when milk is not.",
      hi: "ख़मीर उठने से अधिकांश लैक्टोज़ टूट जाता है, इसीलिए दूध न पचे तब भी दही आमतौर पर ठीक रहता है।",
    },
    favour: [
      { en: "Dahi, chaas and aged paneer", hi: "दही, छाछ और पका पनीर" },
      { en: "Coconut, groundnut and soy alternatives", hi: "नारियल, मूँगफली और सोया विकल्प" },
    ],
    limit: [
      { en: "Plain milk, especially on an empty stomach", hi: "सादा दूध, ख़ासकर खाली पेट" },
      { en: "Kheer, milk-based sweets and paneer in quantity", hi: "खीर, दूध की मिठाइयाँ और अधिक पनीर" },
    ],
    watchOut: {
      en: "Cutting dairy entirely often costs you calcium and vitamin B12 with nothing put back. Keep dahi if you tolerate it, and check both if you do not.",
      hi: "दुग्ध पूरी तरह छोड़ने से अक्सर कैल्शियम और विटामिन बी12 दोनों चले जाते हैं, बदले में कुछ नहीं आता। दही सहन हो तो रखें, न हो तो दोनों की जाँच कराएँ।",
    },
    kcalDelta: 0,
    rules: [
      { attr: "lactose", verdict: "avoid", why: { en: "Unfermented lactose — the usual trigger.", hi: "बिना ख़मीर वाला लैक्टोज़ — आम कारण।" } },
      { attr: "dairy", verdict: "caution", why: { en: "Fermented dairy such as dahi is usually tolerated.", hi: "दही जैसे ख़मीर वाले दुग्ध आमतौर पर सहन हो जाते हैं।" } },
    ],
  },
];

export const conditionByKey = (k: ConditionKey) =>
  CONDITIONS.find((c) => c.key === k)!;

/**
 * Conditions whose advice actively conflicts. Surfaced in the UI rather than
 * silently resolved, because resolving it is a clinical decision.
 */
export const CONFLICTS: { pair: [ConditionKey, ConditionKey]; note: Bi }[] = [
  {
    pair: ["ckd", "hypertension"],
    note: {
      en: "These two pull in opposite directions. Blood pressure advice pushes potassium up; kidney disease requires it kept down. If you have both, the kidney restriction takes priority — confirm with your nephrologist.",
      hi: "ये दोनों उल्टी दिशाओं में खींचते हैं। रक्तचाप की सलाह पोटैशियम बढ़ाती है; गुर्दा रोग में इसे घटाना ज़रूरी है। दोनों हों तो गुर्दे की पाबंदी प्राथमिक है — अपने नेफ़्रोलॉजिस्ट से पुष्टि करें।",
    },
  },
  {
    pair: ["ckd", "anaemia"],
    note: {
      en: "Anaemia advice favours dals and palak; both are restricted in kidney disease. Iron is usually corrected by supplement or infusion here instead of by diet.",
      hi: "एनीमिया की सलाह दाल और पालक पर ज़ोर देती है; गुर्दा रोग में दोनों सीमित हैं। यहाँ लोहा आमतौर पर आहार के बजाय सप्लीमेंट या इंफ़्यूज़न से ठीक किया जाता है।",
    },
  },
];

/* ------------------------------------------------------------------------
   Meal attributes. Additive lookup keyed by MealPlanItem.id, so the meal
   library data itself does not change.
   ------------------------------------------------------------------------ */
export const MEAL_ATTRS: Record<string, FoodAttr[]> = {
  poha: ["rice", "lowGI", "nuts"],
  "aloo-paratha": ["wheat", "potato", "dairy", "saturatedFat"],
  "rajma-chawal": ["rice", "legume", "highFibre", "ironRich", "highPotassium", "highPhosphorus"],
  "chole-roti": ["wheat", "legume", "highFibre", "ironRich", "highPotassium"],
  "palak-paneer": ["wheat", "dairy", "lactose", "ironRich", "highPotassium", "highPhosphorus", "saturatedFat", "leanProtein"],
  "moong-khichdi": ["rice", "legume", "lowGI", "highFibre"],
  "anda-bhurji": ["wheat", "egg", "leanProtein"],
  "chicken-curry-roti": ["wheat", "leanProtein", "highPurine"],
  "egg-curry-rice": ["rice", "egg", "leanProtein"],
  "keema-matar": ["wheat", "highPurine", "saturatedFat", "ironRich", "leanProtein"],
  "idli-sambar": ["rice", "legume", "lowGI", "highFibre"],
  "masala-dosa": ["rice", "potato", "legume"],
  "curd-rice": ["rice", "dairy", "lactose"],
  "rasam-rice": ["rice", "legume", "vitaminC", "lowGI"],
  "lemon-rice": ["rice", "nuts", "vitaminC"],
  "egg-dosa": ["rice", "egg", "leanProtein"],
  "meen-kuzhambu": ["rice", "fish", "leanProtein", "highPurine", "vitaminC"],
  "chicken-chettinad": ["rice", "leanProtein", "highPurine"],
  "chira-gur": ["rice", "addedSugar", "ironRich"],
  "dal-bhaat-posto": ["rice", "legume", "potato", "highPotassium"],
  khichuri: ["rice", "legume", "lowGI", "highFibre"],
  "machher-jhol": ["rice", "fish", "leanProtein", "highPurine", "potato"],
  "dimer-dalna": ["egg", "potato", "leanProtein", "highPotassium"],
  thepla: ["wheat", "dairy", "ironRich", "highFibre"],
  "dal-bhakri": ["millet", "legume", "lowGI", "highFibre", "dairy"],
  "misal-pav": ["wheat", "legume", "highFibre", "ironRich", "highSodium", "fried"],
  "khichdi-kadhi": ["rice", "legume", "dairy", "lactose"],
  "kolhapuri-chicken": ["millet", "leanProtein", "highPurine", "saturatedFat"],
  "bombil-fry": ["rice", "fish", "fried", "leanProtein", "highPurine"],

  /* The nine meals added to fill the empty filter cells. Without an entry
     here the conditions checker has nothing to judge and silently treats a
     meal as neutral — which for a CKD or gout patient is the wrong default. */
  "roasted-chana": ["legume", "highFibre", "lowGI", "ironRich", "highPotassium", "addedSugar"],
  "egg-chaat": ["egg", "leanProtein", "vitaminC"],
  sundal: ["legume", "highFibre", "lowGI", "ironRich", "highPotassium"],
  "egg-podimas": ["egg", "leanProtein"],
  "dim-toast": ["wheat", "egg", "leanProtein", "fried"],
  "muri-makha": ["rice", "lowGI"],
  "dimer-devil": ["egg", "potato", "wheat", "leanProtein", "highPotassium"],
  akuri: ["wheat", "egg", "leanProtein", "vitaminC", "saturatedFat"],
  "masala-egg-pav": ["egg", "leanProtein", "vitaminC"],
};

export type MealCheck = {
  verdict: Verdict;
  reasons: { verdict: Verdict; why: Bi }[];
};

/**
 * Check one meal against one condition. The worst verdict wins, and every
 * reason is returned so the answer can be explained rather than asserted.
 */
export function checkMeal(mealId: string, condition: ConditionKey): MealCheck {
  const attrs = MEAL_ATTRS[mealId] ?? [];
  const cond = conditionByKey(condition);
  const reasons = cond.rules
    .filter((r) => attrs.includes(r.attr))
    .map((r) => ({ verdict: r.verdict, why: r.why }));

  const worst: Verdict = reasons.some((r) => r.verdict === "avoid")
    ? "avoid"
    : reasons.some((r) => r.verdict === "caution")
      ? "caution"
      : reasons.some((r) => r.verdict === "good")
        ? "good"
        : "caution";

  return { verdict: worst, reasons };
}

/** Check a meal against several conditions at once. */
export function checkMealAll(mealId: string, conditions: ConditionKey[]) {
  const results = conditions.map((c) => ({ condition: c, ...checkMeal(mealId, c) }));
  const worst: Verdict = results.some((r) => r.verdict === "avoid")
    ? "avoid"
    : results.some((r) => r.verdict === "caution")
      ? "caution"
      : "good";
  return { worst, results };
}

export const VERDICT_LABEL: Record<Verdict, Bi> = {
  good: { en: "Good for you", hi: "आपके लिए अच्छा" },
  caution: { en: "Careful", hi: "सावधानी" },
  avoid: { en: "Avoid", hi: "बचें" },
};

/* Badge fills, not theme surfaces. They pair with white text, so they stay
   dark in both light and dark mode — see --verdict-* in globals.css. */
export const VERDICT_COLOUR: Record<Verdict, string> = {
  good: "var(--verdict-good)",
  caution: "var(--verdict-caution)",
  avoid: "var(--verdict-avoid)",
};

export const MEDICAL_DISCLAIMER: Bi = {
  en: "Poshan is educational, not a diagnosis. These plans follow ICMR-NIN and WHO guidance, but medication, blood results and the stage of your condition change what is safe for you. Confirm with your doctor or a registered dietitian before making changes — especially for kidney disease, or if you take thyroid medication or blood thinners.",
  hi: "पोषण शैक्षिक है, निदान नहीं। ये प्लान आईसीएमआर-एनआईएन और डब्ल्यूएचओ मार्गदर्शन पर आधारित हैं, पर दवाएँ, रक्त जाँच और आपकी स्थिति का चरण बदल देते हैं कि आपके लिए क्या सुरक्षित है। बदलाव से पहले अपने डॉक्टर या पंजीकृत आहार विशेषज्ञ से पुष्टि करें — ख़ासकर गुर्दा रोग में, या यदि आप थायरॉइड या ख़ून पतला करने की दवा लेते हैं।",
};
