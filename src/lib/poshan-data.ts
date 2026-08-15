/**
 * Poshan domain data.
 * BMI thresholds follow the ICMR / WHO Asia-Pacific cutoffs for Asian-Indian
 * bodies, where overweight begins at 23.0 rather than the European 25.0.
 */

export type Lang = "en" | "hi";
export type Bi = { en: string; hi: string };

export const t = (s: Bi, lang: Lang) => s[lang];

/* ------------------------------------------------------------------ bands */

export type BandKey = "under" | "normal" | "over" | "obese";

export type Band = {
  key: BandKey;
  max: number;
  name: Bi;
  range: string;
  /** Fill colour: gauge arcs, markers, swatches. Non-text, so the 3:1 bar applies. */
  color: string;
  /** Text-safe variant of the same colour, for anything that has to read as words. */
  ink: string;
  note: Bi;
};

export const BANDS: Band[] = [
  {
    key: "under",
    max: 18.5,
    range: "< 18.5",
    name: { en: "Underweight", hi: "कम वज़न" },
    color: "var(--haldi)",
    ink: "var(--haldi-ink)",
    note: {
      en: "You have room to build. Poshan adds ghee, banana and an extra roti — weight gained on home food, not powders.",
      hi: "आपके पास बढ़ने की गुंजाइश है। पोषण घी, केला और एक अतिरिक्त रोटी जोड़ता है — वज़न घर के खाने से बढ़े, पाउडर से नहीं।",
    },
  },
  {
    key: "normal",
    max: 23.0,
    range: "18.5 – 22.9",
    name: { en: "Normal", hi: "सामान्य" },
    color: "var(--elaichi)",
    ink: "var(--elaichi)",
    note: {
      en: "Hold this. Your thali stays as it is — the work now is consistency, not correction.",
      hi: "इसे बनाए रखें। आपकी थाली वैसी ही रहेगी — अब काम सुधार का नहीं, निरंतरता का है।",
    },
  },
  {
    key: "over",
    max: 25.0,
    range: "23.0 – 24.9",
    name: { en: "Overweight", hi: "अधिक वज़न" },
    color: "var(--kesar)",
    ink: "var(--kesar)",
    note: {
      en: "A Western app would call this normal. Poshan cuts the rice, keeps the dal, and doubles the sabzi.",
      hi: "कोई पश्चिमी ऐप इसे सामान्य कहता। पोषण चावल घटाता है, दाल रखता है, और सब्ज़ी दोगुनी करता है।",
    },
  },
  {
    key: "obese",
    max: 99,
    range: "≥ 25.0",
    name: { en: "Obese", hi: "मोटापा" },
    color: "var(--mirch)",
    ink: "var(--mirch)",
    note: {
      en: "Millet roti replaces wheat, rice steps aside, and sabzi leads the plate. Same kitchen, different proportions.",
      hi: "गेहूँ की जगह बाजरा-ज्वार की रोटी, चावल एक तरफ़, और थाली की अगुवाई सब्ज़ी करे। रसोई वही, अनुपात अलग।",
    },
  },
];

export const bandFor = (bmi: number): Band =>
  BANDS.find((b) => bmi < b.max) ?? BANDS[BANDS.length - 1];

/* ------------------------------------------------------------- nutrients */
/** Full forms, never abbreviations — the label is the teaching moment. */
export const NUTRIENT: Record<string, Bi> = {
  protein: { en: "Protein", hi: "प्रोटीन" },
  carbohydrate: { en: "Carbohydrate", hi: "कार्बोहाइड्रेट" },
  fat: { en: "Fat", hi: "वसा" },
  fibre: { en: "Dietary Fibre", hi: "आहारीय रेशा" },
  iron: { en: "Iron", hi: "लोहा" },
  calcium: { en: "Calcium", hi: "कैल्शियम" },
};

export type Macros = {
  protein: number;
  carbohydrate: number;
  fat: number;
  fibre: number;
};

/* ------------------------------------------------------------ base plate */

export type DishKey =
  | "dal"
  | "roti"
  | "sabzi"
  | "dahi"
  | "rice"
  | "chutney";

export type Dish = {
  key: DishKey;
  name: Bi;
  sub: Bi;
  /** Per single serving, as stated in the quantity line. */
  macros: Macros;
  /** Drop a photograph in here and the card switches from artwork to photo. */
  photo?: string;
};

export const DISHES: Dish[] = [
  {
    key: "dal",
    name: { en: "Dal", hi: "दाल" },
    sub: { en: "Toor / Moong", hi: "तूर / मूंग" },
    macros: { protein: 9, carbohydrate: 20, fat: 3, fibre: 5 },
  },
  {
    key: "roti",
    name: { en: "Roti", hi: "रोटी" },
    sub: { en: "Wheat / Pearl millet", hi: "गेहूँ / बाजरा" },
    macros: { protein: 3, carbohydrate: 15, fat: 1, fibre: 2 },
  },
  {
    key: "sabzi",
    name: { en: "Sabzi", hi: "सब्ज़ी" },
    sub: { en: "Seasonal vegetables", hi: "मौसमी सब्ज़ियाँ" },
    macros: { protein: 4, carbohydrate: 12, fat: 5, fibre: 6 },
  },
  {
    key: "dahi",
    name: { en: "Dahi", hi: "दही" },
    sub: { en: "Curd", hi: "दही" },
    macros: { protein: 6, carbohydrate: 7, fat: 4, fibre: 0 },
  },
  {
    key: "rice",
    name: { en: "Rice", hi: "चावल" },
    sub: { en: "Hand-pounded", hi: "हाथ से कूटा" },
    macros: { protein: 3, carbohydrate: 32, fat: 0, fibre: 1 },
  },
  {
    key: "chutney",
    name: { en: "Chutney", hi: "चटनी" },
    sub: { en: "Pickle / relish", hi: "अचार" },
    macros: { protein: 0, carbohydrate: 2, fat: 1, fibre: 1 },
  },
];

export type Plan = {
  /** 0–1 fill level for the four katoris on the thali. */
  fills: [number, number, number, number];
  rotis: number;
  kcal: number;
  qty: Record<DishKey, Bi>;
};

export const PLANS: Record<BandKey, Plan> = {
  under: {
    fills: [1, 0.75, 0.9, 0.5],
    rotis: 4,
    kcal: 2400,
    qty: {
      dal: { en: "2 katori", hi: "2 कटोरी" },
      roti: { en: "4 pieces", hi: "4 रोटी" },
      sabzi: { en: "1 katori", hi: "1 कटोरी" },
      dahi: { en: "1 katori", hi: "1 कटोरी" },
      rice: { en: "1.5 katori", hi: "1.5 कटोरी" },
      chutney: { en: "1 tablespoon", hi: "1 बड़ा चम्मच" },
    },
  },
  normal: {
    fills: [0.8, 0.8, 0.75, 0.4],
    rotis: 3,
    kcal: 2000,
    qty: {
      dal: { en: "1.5 katori", hi: "1.5 कटोरी" },
      roti: { en: "3 pieces", hi: "3 रोटी" },
      sabzi: { en: "1.5 katori", hi: "1.5 कटोरी" },
      dahi: { en: "1 katori", hi: "1 कटोरी" },
      rice: { en: "1 katori", hi: "1 कटोरी" },
      chutney: { en: "1 tablespoon", hi: "1 बड़ा चम्मच" },
    },
  },
  over: {
    fills: [0.75, 1, 0.7, 0.35],
    rotis: 2,
    kcal: 1700,
    qty: {
      dal: { en: "1.5 katori", hi: "1.5 कटोरी" },
      roti: { en: "2 pieces", hi: "2 रोटी" },
      sabzi: { en: "2 katori", hi: "2 कटोरी" },
      dahi: { en: "1 katori", hi: "1 कटोरी" },
      rice: { en: "½ katori", hi: "½ कटोरी" },
      chutney: { en: "1 teaspoon", hi: "1 छोटा चम्मच" },
    },
  },
  obese: {
    fills: [0.7, 1, 0.65, 0.25],
    rotis: 2,
    kcal: 1500,
    qty: {
      dal: { en: "1.5 katori", hi: "1.5 कटोरी" },
      roti: { en: "2 pearl millet", hi: "2 बाजरा" },
      sabzi: { en: "2.5 katori", hi: "2.5 कटोरी" },
      dahi: { en: "1 katori", hi: "1 कटोरी" },
      rice: { en: "Not today", hi: "आज नहीं" },
      chutney: { en: "1 teaspoon", hi: "1 छोटा चम्मच" },
    },
  },
};

export const isDropped = (q: Bi) => q.en === "Not today";

/* ----------------------------------------------------------- biomarkers */

export type Biomarker = {
  short: string;
  /** The expansion. Requirement: never ship a bare abbreviation. */
  full: Bi;
  unit: Bi;
  value: string;
  healthy: boolean;
  status: Bi;
  why: Bi;
  points: number[];
};

export const BIOMARKERS: Biomarker[] = [
  {
    short: "Vitamin D",
    full: { en: "25-hydroxyvitamin D (Cholecalciferol)", hi: "25-हाइड्रॉक्सीविटामिन डी (कोलेकैल्सिफ़ेरॉल)" },
    unit: { en: "nanograms per millilitre", hi: "नैनोग्राम प्रति मिलीलीटर" },
    value: "18.4",
    healthy: false,
    status: { en: "Low — very common", hi: "कम — बहुत आम" },
    why: {
      en: "Around three in four Indians run deficient, indoors and out. Poshan schedules sun and fortified dahi.",
      hi: "लगभग हर चार में तीन भारतीयों में कमी रहती है, घर के अंदर हो या बाहर। पोषण धूप और फ़ोर्टिफ़ाइड दही तय करता है।",
    },
    points: [14, 15, 16, 15, 17, 18, 18.4],
  },
  {
    short: "Vitamin B12",
    full: { en: "Cobalamin", hi: "कोबालामिन" },
    unit: { en: "picograms per millilitre", hi: "पिकोग्राम प्रति मिलीलीटर" },
    value: "212",
    healthy: false,
    status: { en: "Low — vegetarian risk", hi: "कम — शाकाहारी जोखिम" },
    why: {
      en: "A vegetarian plate rarely reaches it. Dahi, paneer and fortified milk do most of the lifting.",
      hi: "शाकाहारी थाली इस तक कम ही पहुँचती है। दही, पनीर और फ़ोर्टिफ़ाइड दूध ही असल काम करते हैं।",
    },
    points: [168, 175, 182, 190, 198, 206, 212],
  },
  {
    short: "HbA1c",
    full: { en: "Glycated Haemoglobin", hi: "ग्लाइकेटेड हीमोग्लोबिन" },
    unit: { en: "percent, three-month average", hi: "प्रतिशत, तीन माह का औसत" },
    value: "5.4",
    healthy: true,
    status: { en: "Normal", hi: "सामान्य" },
    why: {
      en: "India is the diabetes capital. This is the number your rice portion moves fastest.",
      hi: "भारत डायबिटीज़ की राजधानी है। चावल की मात्रा इसी आँकड़े को सबसे तेज़ी से हिलाती है।",
    },
    points: [6.2, 6.0, 5.9, 5.7, 5.6, 5.5, 5.4],
  },
  {
    short: "Ferritin",
    full: { en: "Ferritin — the iron storage protein", hi: "फ़ेरिटिन — लोहा संचय प्रोटीन" },
    unit: { en: "nanograms per millilitre", hi: "नैनोग्राम प्रति मिलीलीटर" },
    value: "34",
    healthy: true,
    status: { en: "Rising", hi: "बढ़ रहा है" },
    why: {
      en: "Anaemia affects over half of Indian women. Rajma, palak and a squeeze of lemon raise absorption.",
      hi: "आधे से ज़्यादा भारतीय महिलाएँ एनीमिया से जूझती हैं। राजमा, पालक और नींबू की कुछ बूँदें अवशोषण बढ़ाती हैं।",
    },
    points: [19, 21, 24, 26, 29, 31, 34],
  },
];

/* -------------------------------------------------- premium: Poshan Home */

export const PREMIUM = {
  name: { en: "Poshan Home", hi: "पोषण घर" },
  monthly: 299,
  yearly: 2499,
  trialDays: 7,
  /** 12 × 299 = 3588, so the annual plan saves 1089. */
  get saved() {
    return this.monthly * 12 - this.yearly;
  },
  get savedPercent() {
    return Math.round((this.saved / (this.monthly * 12)) * 100);
  },
};

/* ---------------------------------------- clinical: Poshan for Clinics
   Founding-partner pricing, held for 12 months. Deliberately below what a
   mature product would charge: today this is manual report entry with no
   ABDM certification, and pricing the destination rather than the thing
   that ships slows adoption exactly when learning velocity matters most.
   Says so on the page, so raising it later for new customers is honest. */

export type ClinicTierKey = "practitioner" | "clinic" | "hospital" | "enterprise";

export type ClinicTier = {
  key: ClinicTierKey;
  name: Bi;
  /** null = quoted, not self-serve. Hospitals buy on PO, not by card. */
  monthly: number | null;
  yearly: number | null;
  seats: Bi;
  patients: Bi;
  /** Self-serve through Razorpay, or a sales conversation. */
  selfServe: boolean;
  best?: boolean;
  features: Bi[];
};

export const CLINIC_TIERS: ClinicTier[] = [
  {
    key: "practitioner",
    name: { en: "Practitioner", hi: "प्रैक्टिशनर" },
    monthly: 999,
    yearly: 9999,
    seats: { en: "1 clinician", hi: "1 चिकित्सक" },
    patients: { en: "Up to 40 active patients", hi: "40 सक्रिय मरीज़ तक" },
    selfServe: true,
    features: [
      { en: "Patient-linked accounts — the patient grants you access and can revoke it any time", hi: "मरीज़ से जुड़े खाते — मरीज़ आपको पहुँच देता है और कभी भी वापस ले सकता है" },
      { en: "Enter lab values by hand: HbA1c, creatinine, eGFR, haemoglobin, lipids", hi: "जाँच के मान हाथ से भरें: HbA1c, क्रिएटिनिन, eGFR, हीमोग्लोबिन, लिपिड" },
      { en: "Auto-drafted meal plans from those values, across all 38 meals", hi: "उन मानों से अपने आप बने मील प्लान, सभी 38 भोजनों में से" },
      { en: "You approve every plan before the patient ever sees it", hi: "हर प्लान मरीज़ तक पहुँचने से पहले आपकी मंज़ूरी से गुज़रता है" },
      { en: "Sign-off logged with your registration number and timestamp", hi: "मंज़ूरी आपके पंजीकरण नंबर और समय के साथ दर्ज" },
      { en: "The 11-condition safety checker on every plan you send", hi: "हर भेजे प्लान पर 11 स्थितियों की सुरक्षा जाँच" },
      { en: "Patients get the plan in English or Hindi", hi: "मरीज़ों को प्लान अंग्रेज़ी या हिंदी में" },
    ],
  },
  {
    key: "clinic",
    name: { en: "Clinic", hi: "क्लिनिक" },
    monthly: 3999,
    yearly: 39999,
    seats: { en: "Up to 5 clinicians", hi: "5 चिकित्सक तक" },
    patients: { en: "Up to 200 active patients", hi: "200 सक्रिय मरीज़ तक" },
    selfServe: true,
    best: true,
    features: [
      { en: "Everything in Practitioner", hi: "प्रैक्टिशनर की हर सुविधा" },
      { en: "Shared patient list across the practice, with per-clinician permissions", hi: "पूरे क्लिनिक में साझा मरीज़ सूची, हर चिकित्सक के लिए अलग अनुमति" },
      { en: "CSV bulk upload of lab results", hi: "जाँच परिणामों का CSV बल्क अपलोड" },
      { en: "Reassign a patient when a clinician is away", hi: "चिकित्सक की अनुपस्थिति में मरीज़ किसी और को सौंपें" },
      { en: "Plan templates your practice can reuse", hi: "आपके क्लिनिक के दोबारा इस्तेमाल लायक प्लान टेम्पलेट" },
      { en: "Adherence view: who opened their plan, who did not", hi: "पालन की दृष्टि: किसने प्लान खोला, किसने नहीं" },
      { en: "Your clinic's name and logo on patient-facing plans", hi: "मरीज़ के प्लान पर आपके क्लिनिक का नाम और लोगो" },
      { en: "Export a patient's history as PDF for their file", hi: "मरीज़ का इतिहास PDF में निर्यात करें" },
    ],
  },
  {
    key: "hospital",
    name: { en: "Hospital", hi: "अस्पताल" },
    monthly: 14999,
    yearly: 149999,
    seats: { en: "Unlimited clinicians", hi: "असीमित चिकित्सक" },
    patients: { en: "Up to 750 active patients", hi: "750 सक्रिय मरीज़ तक" },
    selfServe: false,
    features: [
      { en: "Everything in Clinic", hi: "क्लिनिक की हर सुविधा" },
      { en: "Departments — dietetics, endocrinology, nephrology kept separate", hi: "विभाग — आहार, अंतःस्रावी, वृक्क अलग-अलग" },
      { en: "Invoiced annually against a purchase order", hi: "वार्षिक बिल, परचेज़ ऑर्डर के विरुद्ध" },
      { en: "Full audit trail: who read what, who approved what, when", hi: "पूरा ऑडिट रिकॉर्ड: किसने क्या देखा, किसने क्या मंज़ूर किया, कब" },
      { en: "Discharge diet sheets, printed in the patient's language", hi: "छुट्टी की आहार शीट, मरीज़ की भाषा में छपी" },
      { en: "Data Processing Agreement and named point of contact", hi: "डेटा प्रोसेसिंग अनुबंध और नामित संपर्क व्यक्ति" },
      { en: "Onboarding and training for your dietetics team", hi: "आपकी आहार टीम के लिए प्रशिक्षण" },
    ],
  },
  {
    key: "enterprise",
    name: { en: "Enterprise", hi: "एंटरप्राइज़" },
    monthly: null,
    yearly: null,
    seats: { en: "Multi-site", hi: "कई शाखाएँ" },
    patients: { en: "Unlimited", hi: "असीमित" },
    selfServe: false,
    features: [
      { en: "Everything in Hospital", hi: "अस्पताल की हर सुविधा" },
      { en: "ABDM / ABHA integration once our certification completes", hi: "प्रमाणन पूरा होने पर ABDM / ABHA एकीकरण" },
      { en: "HL7-FHIR feed into your existing HIS or EMR", hi: "आपके मौजूदा HIS या EMR में HL7-FHIR फ़ीड" },
      { en: "Single sign-on against your hospital directory", hi: "आपकी अस्पताल निर्देशिका से सिंगल साइन-ऑन" },
      { en: "Uptime SLA and a named support engineer", hi: "अपटाइम SLA और नामित सहायता इंजीनियर" },
      { en: "Security review and data-residency commitments", hi: "सुरक्षा समीक्षा और डेटा-निवास प्रतिबद्धताएँ" },
    ],
  },
];

/** Honest about what is not built yet — shown under the clinic tiers. */
export const CLINIC_ROADMAP: Bi[] = [
  { en: "ABDM / ABHA integration is in certification, not live yet", hi: "ABDM / ABHA एकीकरण प्रमाणन में है, अभी चालू नहीं" },
  { en: "Lab reports are entered by hand or by CSV today; PDF parsing is not built", hi: "अभी जाँच रिपोर्ट हाथ से या CSV से भरी जाती है; PDF पढ़ना अभी नहीं बना" },
  { en: "Founding-partner pricing is held for 12 months from signup", hi: "फ़ाउंडिंग-पार्टनर मूल्य साइनअप से 12 महीने तक स्थिर" },
];

export const FREE_FEATURES: Bi[] = [
  { en: "Body Mass Index on Asian-Indian cutoffs", hi: "एशियाई-भारतीय मानकों पर बॉडी मास इंडेक्स" },
  { en: "Standard thali for your band", hi: "आपके वर्ग के लिए मानक थाली" },
  { en: "Log four biomarkers by hand", hi: "चार बायोमार्कर हाथ से दर्ज करें" },
  { en: "Hindi and English", hi: "हिंदी और अंग्रेज़ी" },
];

export const PREMIUM_FEATURES: Bi[] = [
  { en: "Meal plans built for your goal, diet and region", hi: "आपके लक्ष्य, आहार और क्षेत्र के अनुसार बने मील प्लान" },
  { en: "Photographed meal library with exact portions", hi: "सटीक मात्रा के साथ फ़ोटो मील लाइब्रेरी" },
  { en: "Biomarker trends read against your plate", hi: "आपकी थाली के सापेक्ष बायोमार्कर रुझान" },
  { en: "Condition support: diabetes, PCOS, thyroid, anaemia", hi: "स्थिति सहायता: डायबिटीज़, पीसीओएस, थायरॉइड, एनीमिया" },
  { en: "Up to six family profiles on one plan", hi: "एक ही प्लान पर छह तक पारिवारिक प्रोफ़ाइल" },
  { en: "A registered dietitian reviews your plan monthly", hi: "पंजीकृत आहार विशेषज्ञ हर माह आपका प्लान देखता है" },
];

/* ------------------------------------------- premium: the plan customiser */

export type GoalKey = "loss" | "muscle" | "diabetes" | "pcos" | "thyroid";
export type DietKey = "veg" | "nonveg" | "vegan" | "jain";
export type RegionKey = "north" | "south" | "east" | "west";

export const GOALS: { key: GoalKey; label: Bi; kcal: number; focus: Bi }[] = [
  { key: "loss", label: { en: "Weight loss", hi: "वज़न घटाना" }, kcal: -400, focus: { en: "Dietary Fibre and Protein", hi: "आहारीय रेशा और प्रोटीन" } },
  { key: "muscle", label: { en: "Muscle gain", hi: "मांसपेशी बढ़ाना" }, kcal: 300, focus: { en: "Protein at every meal", hi: "हर भोजन में प्रोटीन" } },
  { key: "diabetes", label: { en: "Blood sugar", hi: "रक्त शर्करा" }, kcal: -200, focus: { en: "Low glycaemic load", hi: "कम ग्लाइसेमिक लोड" } },
  { key: "pcos", label: { en: "PCOS", hi: "पीसीओएस" }, kcal: -250, focus: { en: "Low glycaemic load and Protein", hi: "कम ग्लाइसेमिक लोड और प्रोटीन" } },
  { key: "thyroid", label: { en: "Thyroid", hi: "थायरॉइड" }, kcal: 0, focus: { en: "Iodine, Selenium and Iron", hi: "आयोडीन, सेलेनियम और लोहा" } },
];

export const DIETS: { key: DietKey; label: Bi }[] = [
  { key: "veg", label: { en: "Vegetarian", hi: "शाकाहारी" } },
  { key: "nonveg", label: { en: "Non-vegetarian", hi: "मांसाहारी" } },
  { key: "vegan", label: { en: "Vegan", hi: "वीगन" } },
  { key: "jain", label: { en: "Jain", hi: "जैन" } },
];

export const REGIONS: { key: RegionKey; label: Bi }[] = [
  { key: "north", label: { en: "North", hi: "उत्तर" } },
  { key: "south", label: { en: "South", hi: "दक्षिण" } },
  { key: "east", label: { en: "East", hi: "पूर्व" } },
  { key: "west", label: { en: "West", hi: "पश्चिम" } },
];

type DayMeals = { breakfast: Bi; lunch: Bi; dinner: Bi };

const KITCHEN: Record<RegionKey, Record<DietKey, DayMeals>> = {
  north: {
    veg: {
      breakfast: { en: "Poha with peanuts", hi: "मूंगफली वाला पोहा" },
      lunch: { en: "Dal, roti, lauki sabzi, dahi", hi: "दाल, रोटी, लौकी सब्ज़ी, दही" },
      dinner: { en: "Moong dal khichdi", hi: "मूंग दाल खिचड़ी" },
    },
    nonveg: {
      breakfast: { en: "Anda bhurji with roti", hi: "अंडा भुर्जी के साथ रोटी" },
      lunch: { en: "Chicken curry, roti, salad", hi: "चिकन करी, रोटी, सलाद" },
      dinner: { en: "Egg curry with rice", hi: "अंडा करी के साथ चावल" },
    },
    vegan: {
      breakfast: { en: "Poha with peanuts", hi: "मूंगफली वाला पोहा" },
      lunch: { en: "Chana masala, roti, salad", hi: "चना मसाला, रोटी, सलाद" },
      dinner: { en: "Dal khichdi", hi: "दाल खिचड़ी" },
    },
    jain: {
      breakfast: { en: "Poha, no onion", hi: "पोहा, बिना प्याज़" },
      lunch: { en: "Moong dal, roti, lauki sabzi", hi: "मूंग दाल, रोटी, लौकी सब्ज़ी" },
      dinner: { en: "Khichdi with dahi", hi: "खिचड़ी के साथ दही" },
    },
  },
  south: {
    veg: {
      breakfast: { en: "Idli with sambar", hi: "इडली के साथ सांबर" },
      lunch: { en: "Rice, rasam, poriyal, curd", hi: "चावल, रसम, पोरियल, दही" },
      dinner: { en: "Curd rice with pickle", hi: "दही चावल के साथ अचार" },
    },
    nonveg: {
      breakfast: { en: "Egg dosa", hi: "अंडा डोसा" },
      lunch: { en: "Fish curry with rice", hi: "मछली करी के साथ चावल" },
      dinner: { en: "Chicken pepper fry, rice", hi: "चिकन पेपर फ़्राई, चावल" },
    },
    vegan: {
      breakfast: { en: "Idli with sambar", hi: "इडली के साथ सांबर" },
      lunch: { en: "Rice, rasam, poriyal", hi: "चावल, रसम, पोरियल" },
      dinner: { en: "Lemon rice with peanuts", hi: "नींबू चावल के साथ मूंगफली" },
    },
    jain: {
      breakfast: { en: "Idli, sambar without onion", hi: "इडली, बिना प्याज़ सांबर" },
      lunch: { en: "Rice, rasam, cabbage poriyal", hi: "चावल, रसम, पत्तागोभी पोरियल" },
      dinner: { en: "Curd rice", hi: "दही चावल" },
    },
  },
  east: {
    veg: {
      breakfast: { en: "Chira with jaggery", hi: "गुड़ के साथ चिड़ा" },
      lunch: { en: "Dal, bhaat, aloo posto", hi: "दाल, भात, आलू पोस्तो" },
      dinner: { en: "Khichuri with begun bhaja", hi: "खिचुड़ी के साथ बेगुन भाजा" },
    },
    nonveg: {
      breakfast: { en: "Egg curry with ruti", hi: "अंडा करी के साथ रुटी" },
      lunch: { en: "Machher jhol with bhaat", hi: "माछेर झोल के साथ भात" },
      dinner: { en: "Chicken jhol, rice", hi: "चिकन झोल, चावल" },
    },
    vegan: {
      breakfast: { en: "Muri with chana", hi: "मुड़ी के साथ चना" },
      lunch: { en: "Dal, bhaat, aloo posto", hi: "दाल, भात, आलू पोस्तो" },
      dinner: { en: "Khichuri", hi: "खिचुड़ी" },
    },
    jain: {
      breakfast: { en: "Chira with jaggery", hi: "गुड़ के साथ चिड़ा" },
      lunch: { en: "Dal, bhaat, lauki tarkari", hi: "दाल, भात, लौकी तरकारी" },
      dinner: { en: "Khichuri, no root vegetables", hi: "खिचुड़ी, बिना कंद" },
    },
  },
  west: {
    veg: {
      breakfast: { en: "Thepla with dahi", hi: "थेपला के साथ दही" },
      lunch: { en: "Dal, bhakri, sabzi, chaas", hi: "दाल, भाकरी, सब्ज़ी, छाछ" },
      dinner: { en: "Khichdi with kadhi", hi: "खिचड़ी के साथ कढ़ी" },
    },
    nonveg: {
      breakfast: { en: "Anda ghotala", hi: "अंडा घोटाला" },
      lunch: { en: "Chicken curry with bhakri", hi: "चिकन करी के साथ भाकरी" },
      dinner: { en: "Fish curry with rice", hi: "मछली करी के साथ चावल" },
    },
    vegan: {
      breakfast: { en: "Thepla with peanut chutney", hi: "थेपला के साथ मूंगफली चटनी" },
      lunch: { en: "Dal, bhakri, sabzi", hi: "दाल, भाकरी, सब्ज़ी" },
      dinner: { en: "Khichdi with peanuts", hi: "खिचड़ी के साथ मूंगफली" },
    },
    jain: {
      breakfast: { en: "Thepla, no potato", hi: "थेपला, बिना आलू" },
      lunch: { en: "Dal, bhakri, Jain sabzi", hi: "दाल, भाकरी, जैन सब्ज़ी" },
      dinner: { en: "Khichdi with kadhi", hi: "खिचड़ी के साथ कढ़ी" },
    },
  },
};

export function buildPlan(
  region: RegionKey,
  diet: DietKey,
  goal: GoalKey,
  baseKcal: number
) {
  const meals = KITCHEN[region][diet];
  const g = GOALS.find((x) => x.key === goal)!;
  return {
    meals,
    kcal: Math.max(1200, baseKcal + g.kcal),
    focus: g.focus,
    goalLabel: g.label,
  };
}

/* ==================================================================
   MEAL LIBRARY
   Categorisation is the point here. The primary axis is the one every
   Indian kitchen already sorts by — vegetarian or not — carried by the
   FSSAI food mark (green circle / brown triangle). Shape as well as
   colour, so the category survives colour blindness and greyscale.
   ================================================================== */

export type FoodCategory = "veg" | "nonveg";
export type MealTime = "breakfast" | "lunch" | "dinner" | "snack";
/** Sub-categories. `vegan` and `jain` are always subsets of `veg`. */
export type DietTag = "vegan" | "jain" | "egg" | "highProtein" | "lowGi" | "ironRich";

export type MealPlanItem = {
  id: string;
  name: Bi;
  region: RegionKey;
  time: MealTime;
  category: FoodCategory;
  tags: DietTag[];
  kcal: number;
  macros: Macros;
  note: Bi;
  photo?: string;
};

export const CATEGORY_LABEL: Record<FoodCategory, Bi> = {
  veg: { en: "Vegetarian", hi: "शाकाहारी" },
  nonveg: { en: "Non-vegetarian", hi: "मांसाहारी" },
};

export const TAG_LABEL: Record<DietTag, Bi> = {
  vegan: { en: "Vegan", hi: "वीगन" },
  jain: { en: "Jain", hi: "जैन" },
  egg: { en: "Contains egg", hi: "अंडा शामिल" },
  highProtein: { en: "High protein", hi: "उच्च प्रोटीन" },
  lowGi: { en: "Low glycaemic", hi: "कम ग्लाइसेमिक" },
  ironRich: { en: "Iron rich", hi: "लोहा भरपूर" },
};

export const MEAL_TIME_LABEL: Record<MealTime, Bi> = {
  breakfast: { en: "Breakfast", hi: "नाश्ता" },
  lunch: { en: "Lunch", hi: "दोपहर का खाना" },
  dinner: { en: "Dinner", hi: "रात का खाना" },
  snack: { en: "Snack", hi: "नाश्ता / स्नैक" },
};

export const MEAL_LIBRARY: MealPlanItem[] = [
  /* ---------------------------------------------------- NORTH · veg */
  { id: "poha", region: "north", time: "breakfast", category: "veg", tags: ["vegan"],
    name: { en: "Poha with peanuts", hi: "मूंगफली वाला पोहा" }, kcal: 350,
    macros: { protein: 8, carbohydrate: 55, fat: 11, fibre: 4 },
    note: { en: "Flattened rice, turmeric, curry leaves. Light enough to work before a commute.",
            hi: "चिवड़ा, हल्दी, करी पत्ता। सफ़र से पहले खाने लायक हल्का।" } },
  { id: "aloo-paratha", region: "north", time: "breakfast", category: "veg", tags: [],
    name: { en: "Aloo paratha with dahi", hi: "आलू पराठा के साथ दही" }, kcal: 450,
    macros: { protein: 12, carbohydrate: 58, fat: 18, fibre: 5 },
    note: { en: "One paratha, not three, and curd instead of extra ghee.",
            hi: "एक पराठा, तीन नहीं, और अतिरिक्त घी की जगह दही।" } },
  { id: "rajma-chawal", region: "north", time: "lunch", category: "veg", tags: ["vegan", "ironRich"],
    name: { en: "Rajma chawal", hi: "राजमा चावल" }, kcal: 480,
    macros: { protein: 16, carbohydrate: 78, fat: 10, fibre: 12 },
    note: { en: "Kidney beans carry iron and fibre. Squeeze lemon to lift absorption.",
            hi: "राजमा में लोहा और रेशा। अवशोषण बढ़ाने को नींबू निचोड़ें।" } },
  { id: "chole-roti", region: "north", time: "lunch", category: "veg", tags: ["vegan", "ironRich"],
    name: { en: "Chole with roti", hi: "छोले के साथ रोटी" }, kcal: 430,
    macros: { protein: 15, carbohydrate: 62, fat: 12, fibre: 11 },
    note: { en: "Chickpeas at lunch keep the afternoon slump away.",
            hi: "दोपहर में चना खाने से बाद की सुस्ती नहीं आती।" } },
  { id: "palak-paneer", region: "north", time: "dinner", category: "veg", tags: ["highProtein", "ironRich"],
    name: { en: "Palak paneer with roti", hi: "पालक पनीर के साथ रोटी" }, kcal: 460,
    macros: { protein: 20, carbohydrate: 40, fat: 24, fibre: 6 },
    note: { en: "Paneer for Vitamin B12, spinach for iron — the two Indian plates miss most.",
            hi: "पनीर से विटामिन बी12, पालक से लोहा — भारतीय थाली में यही दो सबसे कम मिलते हैं।" } },
  { id: "moong-khichdi", region: "north", time: "dinner", category: "veg", tags: ["vegan", "jain", "lowGi"],
    name: { en: "Moong dal khichdi", hi: "मूंग दाल खिचड़ी" }, kcal: 320,
    macros: { protein: 13, carbohydrate: 52, fat: 6, fibre: 7 },
    note: { en: "The plainest thing in this library, and the one bodies recover on.",
            hi: "इस सूची की सबसे सादी चीज़, और वही जिस पर शरीर सुधरता है।" } },

  /* ------------------------------------------------- NORTH · nonveg */
  { id: "anda-bhurji", region: "north", time: "breakfast", category: "nonveg", tags: ["egg", "highProtein"],
    name: { en: "Anda bhurji with roti", hi: "अंडा भुर्जी के साथ रोटी" }, kcal: 380,
    macros: { protein: 20, carbohydrate: 34, fat: 18, fibre: 3 },
    note: { en: "Two eggs cover a fifth of a day's protein before you leave the house.",
            hi: "दो अंडे घर से निकलने से पहले ही दिन का पाँचवाँ हिस्सा प्रोटीन दे देते हैं।" } },
  { id: "chicken-curry-roti", region: "north", time: "lunch", category: "nonveg", tags: ["highProtein"],
    name: { en: "Chicken curry with roti", hi: "चिकन करी के साथ रोटी" }, kcal: 480,
    macros: { protein: 34, carbohydrate: 38, fat: 20, fibre: 4 },
    note: { en: "Home-style curry, not restaurant cream. The gravy is onion and tomato.",
            hi: "घर जैसी करी, रेस्तराँ वाली क्रीम नहीं। ग्रेवी प्याज़ और टमाटर की।" } },
  { id: "egg-curry-rice", region: "north", time: "dinner", category: "nonveg", tags: ["egg"],
    name: { en: "Egg curry with rice", hi: "अंडा करी के साथ चावल" }, kcal: 450,
    macros: { protein: 20, carbohydrate: 55, fat: 16, fibre: 3 },
    note: { en: "Cheapest complete protein in any Indian market.",
            hi: "किसी भी भारतीय बाज़ार का सबसे सस्ता संपूर्ण प्रोटीन।" } },
  { id: "keema-matar", region: "north", time: "dinner", category: "nonveg", tags: ["highProtein", "ironRich"],
    name: { en: "Keema matar with roti", hi: "कीमा मटर के साथ रोटी" }, kcal: 520,
    macros: { protein: 32, carbohydrate: 40, fat: 25, fibre: 5 },
    note: { en: "Heavy. Best on a day you actually trained.",
            hi: "भारी। उसी दिन ठीक जब आपने सच में कसरत की हो।" } },

  /* ---------------------------------------------------- SOUTH · veg */
  { id: "idli-sambar", region: "south", time: "breakfast", category: "veg", tags: ["vegan", "lowGi"],
    name: { en: "Idli with sambar", hi: "इडली के साथ सांबर" }, kcal: 300,
    macros: { protein: 10, carbohydrate: 55, fat: 4, fibre: 6 },
    note: { en: "Steamed and fermented — the gentlest breakfast in the country.",
            hi: "भाप में पका और ख़मीर उठा — देश का सबसे हल्का नाश्ता।" } },
  { id: "masala-dosa", region: "south", time: "breakfast", category: "veg", tags: ["vegan"],
    name: { en: "Masala dosa with coconut chutney", hi: "मसाला डोसा के साथ नारियल चटनी" }, kcal: 390,
    macros: { protein: 8, carbohydrate: 60, fat: 13, fibre: 5 },
    note: { en: "One dosa, chutney on the side rather than poured over.",
            hi: "एक डोसा, चटनी ऊपर डालने की जगह किनारे।" } },
  { id: "curd-rice", region: "south", time: "lunch", category: "veg", tags: ["jain"],
    name: { en: "Curd rice with pickle", hi: "दही चावल के साथ अचार" }, kcal: 310,
    macros: { protein: 10, carbohydrate: 48, fat: 8, fibre: 2 },
    note: { en: "Probiotics and starch. What South Indian summers run on.",
            hi: "प्रोबायोटिक और स्टार्च। दक्षिण भारत की गर्मियाँ इसी पर चलती हैं।" } },
  { id: "rasam-rice", region: "south", time: "lunch", category: "veg", tags: ["vegan", "lowGi"],
    name: { en: "Rasam rice with poriyal", hi: "रसम चावल के साथ पोरियल" }, kcal: 330,
    macros: { protein: 9, carbohydrate: 56, fat: 7, fibre: 6 },
    note: { en: "Tamarind and pepper. Light on the stomach, heavy on flavour.",
            hi: "इमली और काली मिर्च। पेट पर हल्का, स्वाद में भारी।" } },
  { id: "lemon-rice", region: "south", time: "dinner", category: "veg", tags: ["vegan"],
    name: { en: "Lemon rice with peanuts", hi: "नींबू चावल के साथ मूंगफली" }, kcal: 360,
    macros: { protein: 8, carbohydrate: 58, fat: 11, fibre: 3 },
    note: { en: "Peanuts turn a plain rice dish into something with protein in it.",
            hi: "मूंगफली सादे चावल को प्रोटीन वाली चीज़ बना देती है।" } },

  /* ------------------------------------------------- SOUTH · nonveg */
  { id: "egg-dosa", region: "south", time: "breakfast", category: "nonveg", tags: ["egg", "highProtein"],
    name: { en: "Egg dosa", hi: "अंडा डोसा" }, kcal: 400,
    macros: { protein: 16, carbohydrate: 52, fat: 14, fibre: 4 },
    note: { en: "The egg goes on the batter while it cooks, so nothing is fried twice.",
            hi: "अंडा घोल पर तभी डाला जाता है जब वह सिक रहा हो, दोबारा तलना नहीं पड़ता।" } },
  { id: "meen-kuzhambu", region: "south", time: "lunch", category: "nonveg", tags: ["highProtein"],
    name: { en: "Fish curry with rice", hi: "मछली करी के साथ चावल" }, kcal: 440,
    macros: { protein: 30, carbohydrate: 52, fat: 12, fibre: 3 },
    note: { en: "Tamarind fish curry. Omega-3 without a supplement bottle.",
            hi: "इमली वाली मछली करी। बिना किसी सप्लीमेंट के ओमेगा-3।" } },
  { id: "chicken-chettinad", region: "south", time: "dinner", category: "nonveg", tags: ["highProtein"],
    name: { en: "Chicken Chettinad with rice", hi: "चिकन चेट्टीनाड के साथ चावल" }, kcal: 520,
    macros: { protein: 36, carbohydrate: 54, fat: 18, fibre: 4 },
    note: { en: "Black pepper and roasted spice rather than cream.",
            hi: "क्रीम की जगह काली मिर्च और भुने मसाले।" } },

  /* ----------------------------------------------------- EAST · veg */
  { id: "chira-gur", region: "east", time: "breakfast", category: "veg", tags: ["vegan"],
    name: { en: "Chira with jaggery", hi: "गुड़ के साथ चिड़ा" }, kcal: 280,
    macros: { protein: 5, carbohydrate: 58, fat: 3, fibre: 3 },
    note: { en: "Jaggery instead of sugar keeps a little iron in the bowl.",
            hi: "चीनी की जगह गुड़ कटोरी में थोड़ा लोहा बचा रखता है।" } },
  { id: "dal-bhaat-posto", region: "east", time: "lunch", category: "veg", tags: ["vegan"],
    name: { en: "Dal, bhaat, aloo posto", hi: "दाल, भात, आलू पोस्तो" }, kcal: 420,
    macros: { protein: 14, carbohydrate: 68, fat: 10, fibre: 8 },
    note: { en: "Poppy seed potato — Bengali comfort food that is not actually heavy.",
            hi: "पोस्ते वाला आलू — बंगाली आराम का खाना जो असल में भारी नहीं।" } },
  { id: "khichuri", region: "east", time: "dinner", category: "veg", tags: ["vegan", "lowGi"],
    name: { en: "Khichuri with begun bhaja", hi: "खिचुड़ी के साथ बेगुन भाजा" }, kcal: 380,
    macros: { protein: 12, carbohydrate: 58, fat: 11, fibre: 7 },
    note: { en: "Rice and lentils cooked together make a complete protein.",
            hi: "चावल और दाल साथ पकें तो संपूर्ण प्रोटीन बनता है।" } },

  /* -------------------------------------------------- EAST · nonveg */
  { id: "machher-jhol", region: "east", time: "lunch", category: "nonveg", tags: ["highProtein"],
    name: { en: "Machher jhol with bhaat", hi: "माछेर झोल के साथ भात" }, kcal: 430,
    macros: { protein: 30, carbohydrate: 55, fat: 10, fibre: 2 },
    note: { en: "A thin fish stew, not a fried fish. Far less oil than it looks.",
            hi: "पतला मछली शोरबा, तली मछली नहीं। दिखने से कहीं कम तेल।" } },
  { id: "dimer-dalna", region: "east", time: "dinner", category: "nonveg", tags: ["egg"],
    name: { en: "Dim'er dalna", hi: "डिमेर डालना" }, kcal: 390,
    macros: { protein: 18, carbohydrate: 34, fat: 20, fibre: 3 },
    note: { en: "Bengali egg curry with potato. One egg each, not two.",
            hi: "आलू वाली बंगाली अंडा करी। एक-एक अंडा, दो नहीं।" } },

  /* ----------------------------------------------------- WEST · veg */
  { id: "thepla", region: "west", time: "breakfast", category: "veg", tags: ["ironRich"],
    name: { en: "Thepla with dahi", hi: "थेपला के साथ दही" }, kcal: 360,
    macros: { protein: 11, carbohydrate: 48, fat: 14, fibre: 6 },
    note: { en: "Fenugreek in the dough — bitter, and worth it for blood sugar.",
            hi: "आटे में मेथी — कड़वी, पर रक्त शर्करा के लिए फ़ायदेमंद।" } },
  { id: "dal-bhakri", region: "west", time: "lunch", category: "veg", tags: ["vegan", "lowGi"],
    name: { en: "Dal, bhakri, sabzi, chaas", hi: "दाल, भाकरी, सब्ज़ी, छाछ" }, kcal: 400,
    macros: { protein: 14, carbohydrate: 60, fat: 11, fibre: 9 },
    note: { en: "Millet bhakri instead of wheat drops the glycaemic load sharply.",
            hi: "गेहूँ की जगह बाजरे की भाकरी ग्लाइसेमिक लोड तेज़ी से घटाती है।" } },
  { id: "misal-pav", region: "west", time: "snack", category: "veg", tags: ["vegan", "ironRich", "highProtein"],
    name: { en: "Misal pav", hi: "मिसळ पाव" }, kcal: 420,
    macros: { protein: 16, carbohydrate: 55, fat: 15, fibre: 11 },
    note: { en: "Sprouted moth beans. One pav, and skip the farsan on top.",
            hi: "अंकुरित मटकी। एक पाव, और ऊपर का फ़रसाण छोड़ दें।" } },
  { id: "khichdi-kadhi", region: "west", time: "dinner", category: "veg", tags: ["jain"],
    name: { en: "Khichdi with kadhi", hi: "खिचड़ी के साथ कढ़ी" }, kcal: 370,
    macros: { protein: 13, carbohydrate: 56, fat: 10, fibre: 6 },
    note: { en: "Kadhi is curd and gram flour — protein hiding in a yellow gravy.",
            hi: "कढ़ी यानी दही और बेसन — पीली ग्रेवी में छिपा प्रोटीन।" } },

  /* -------------------------------------------------- WEST · nonveg */
  { id: "kolhapuri-chicken", region: "west", time: "dinner", category: "nonveg", tags: ["highProtein"],
    name: { en: "Kolhapuri chicken with bhakri", hi: "कोल्हापुरी चिकन के साथ भाकरी" }, kcal: 540,
    macros: { protein: 35, carbohydrate: 45, fat: 24, fibre: 6 },
    note: { en: "Fierce. Pair it with millet bhakri, not rice, to balance the load.",
            hi: "तीखा। भार संतुलित रखने को चावल नहीं, बाजरे की भाकरी लें।" } },
  { id: "bombil-fry", region: "west", time: "lunch", category: "nonveg", tags: ["highProtein"],
    name: { en: "Bombil fry with rice", hi: "बोंबिल फ़्राई के साथ चावल" }, kcal: 420,
    macros: { protein: 28, carbohydrate: 50, fat: 12, fibre: 2 },
    note: { en: "Bombay duck, semolina crust, shallow fried. Coastal weekday food.",
            hi: "बॉम्बे डक, सूजी की परत, कम तेल में तली। तटीय इलाक़ों का रोज़ का खाना।" } },

  /* ================================================================
     Filling the empty filter combinations. Before these, 9 of the 32
     region × time × category cells had nothing in them and the library
     showed "No plan matches that combination yet" — 7 snack cells and
     the two non-veg breakfasts. Lunch and dinner were already complete.
     ================================================================ */

  /* ------------------------------------------------- NORTH · snacks */
  { id: "roasted-chana", region: "north", time: "snack", category: "veg", tags: ["vegan", "highProtein", "ironRich"],
    name: { en: "Roasted chana with jaggery", hi: "भुना चना और गुड़" }, kcal: 180,
    macros: { protein: 10, carbohydrate: 26, fat: 3, fibre: 8 },
    note: { en: "The four-o'clock snack that does not spike you. Iron from the chana, and the jaggery carries a little more.",
            hi: "चार बजे का नाश्ता जो शुगर नहीं बढ़ाता। चने से लोहा, और गुड़ से थोड़ा और।" } },
  { id: "egg-chaat", region: "north", time: "snack", category: "nonveg", tags: ["egg", "highProtein"],
    name: { en: "Boiled egg chaat", hi: "उबले अंडे की चाट" }, kcal: 200,
    macros: { protein: 14, carbohydrate: 12, fat: 11, fibre: 2 },
    note: { en: "Two eggs, onion, lemon, chaat masala. Protein that actually holds until dinner.",
            hi: "दो अंडे, प्याज़, नींबू, चाट मसाला। ऐसा प्रोटीन जो रात के खाने तक टिकता है।" } },

  /* ------------------------------------------------- SOUTH · snacks */
  { id: "sundal", region: "south", time: "snack", category: "veg", tags: ["vegan", "highProtein", "ironRich"],
    name: { en: "Chana sundal", hi: "चना सुंडल" }, kcal: 190,
    macros: { protein: 11, carbohydrate: 28, fat: 4, fibre: 9 },
    note: { en: "Steamed chickpeas, coconut, curry leaf. Temple food that happens to be a near-perfect snack.",
            hi: "उबले चने, नारियल, करी पत्ता। मंदिर का प्रसाद, जो बेहतरीन नाश्ता भी है।" } },
  { id: "egg-podimas", region: "south", time: "snack", category: "nonveg", tags: ["egg", "highProtein"],
    name: { en: "Egg podimas", hi: "अंडा पोडिमास" }, kcal: 210,
    macros: { protein: 15, carbohydrate: 8, fat: 14, fibre: 1 },
    note: { en: "Scrambled with mustard, turmeric and curry leaf. Eaten by the spoon, not in a roll.",
            hi: "राई, हल्दी और करी पत्ते के साथ भुरजी। चम्मच से खाई जाती है, रोल में नहीं।" } },

  /* -------------------------------------- EAST · breakfast + snacks */
  { id: "dim-toast", region: "east", time: "breakfast", category: "nonveg", tags: ["egg", "highProtein"],
    name: { en: "Dim toast", hi: "डिम टोस्ट" }, kcal: 330,
    macros: { protein: 17, carbohydrate: 32, fat: 15, fibre: 3 },
    note: { en: "Bengali egg toast — egg beaten with onion and chilli, bread soaked through, pan fried.",
            hi: "बंगाली अंडा टोस्ट — अंडा प्याज़ और मिर्च के साथ फेंटा, ब्रेड भिगोकर तवे पर सिकी।" } },
  { id: "muri-makha", region: "east", time: "snack", category: "veg", tags: ["vegan"],
    name: { en: "Muri makha", hi: "मूड़ी मাখा" }, kcal: 160,
    macros: { protein: 5, carbohydrate: 30, fat: 3, fibre: 3 },
    note: { en: "Puffed rice tossed with mustard oil, onion and green chilli. Almost no fat, and it fills the gap.",
            hi: "मुरमुरे सरसों तेल, प्याज़ और हरी मिर्च के साथ। वसा नाममात्र, पर पेट भर जाता है।" } },
  { id: "dimer-devil", region: "east", time: "snack", category: "nonveg", tags: ["egg", "highProtein"],
    name: { en: "Egg devil, baked", hi: "अंडा डेविल, बेक किया" }, kcal: 240,
    macros: { protein: 16, carbohydrate: 18, fat: 12, fibre: 2 },
    note: { en: "The Kolkata street classic, baked instead of deep fried. Same egg, a third of the oil.",
            hi: "कोलकाता की मशहूर चीज़, तली नहीं बेक की। अंडा वही, तेल एक-तिहाई।" } },

  /* -------------------------------------- WEST · breakfast + snacks */
  { id: "akuri", region: "west", time: "breakfast", category: "nonveg", tags: ["egg", "highProtein"],
    name: { en: "Akuri on pav", hi: "पाव के साथ अकूरी" }, kcal: 380,
    macros: { protein: 18, carbohydrate: 36, fat: 18, fibre: 3 },
    note: { en: "Parsi soft-scrambled eggs, tomato and coriander. Rich, so one pav rather than two.",
            hi: "पारसी नरम अंडा भुरजी, टमाटर और धनिया। भारी है, इसलिए दो नहीं एक पाव।" } },
  { id: "masala-egg-pav", region: "west", time: "snack", category: "nonveg", tags: ["egg", "highProtein"],
    name: { en: "Masala egg bhurji cup", hi: "मसाला अंडा भुर्जी कप" }, kcal: 220,
    macros: { protein: 15, carbohydrate: 10, fat: 13, fibre: 2 },
    note: { en: "Bhurji without the pav — the evening snack that stops you reaching for farsan.",
            hi: "बिना पाव की भुर्जी — शाम का वह नाश्ता जो फ़रसाण से बचा लेता है।" } },
];

/**
 * What each goal actually needs on the plate. This is what turns "high
 * protein" from a static label into a category that follows the visitor —
 * pick Muscle gain and the library re-sorts around protein.
 */
export const GOAL_TAGS: Record<GoalKey, DietTag[]> = {
  muscle: ["highProtein"],
  loss: ["lowGi", "highProtein"],
  diabetes: ["lowGi"],
  pcos: ["lowGi", "highProtein"],
  thyroid: ["ironRich"],
};

/** Meals that serve a goal, richest match first. */
export function mealsForGoal(goal: GoalKey) {
  const wanted = GOAL_TAGS[goal];
  return MEAL_LIBRARY.filter((m) => m.tags.some((t) => wanted.includes(t))).sort(
    (a, b) =>
      b.tags.filter((t) => wanted.includes(t)).length -
        a.tags.filter((t) => wanted.includes(t)).length ||
      b.macros.protein - a.macros.protein
  );
}

/** Filter the library. `category: null` means "show both". */
export function filterMeals(opts: {
  category?: FoodCategory | null;
  region?: RegionKey | null;
  time?: MealTime | null;
  tag?: DietTag | null;
  /** When set, keep only meals whose tags serve this goal. */
  goal?: GoalKey | null;
}) {
  const goalTags = opts.goal ? GOAL_TAGS[opts.goal] : null;
  return MEAL_LIBRARY.filter(
    (m) =>
      (!opts.category || m.category === opts.category) &&
      (!opts.region || m.region === opts.region) &&
      (!opts.time || m.time === opts.time) &&
      (!opts.tag || m.tags.includes(opts.tag)) &&
      (!goalTags || m.tags.some((t) => goalTags.includes(t)))
  );
}

export const countByCategory = () => ({
  veg: MEAL_LIBRARY.filter((m) => m.category === "veg").length,
  nonveg: MEAL_LIBRARY.filter((m) => m.category === "nonveg").length,
});
