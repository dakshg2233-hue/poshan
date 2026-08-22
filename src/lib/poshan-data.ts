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
      en: "You have room to build. Poshan adds ghee, banana and an extra roti: weight gained on home food, not powders.",
      hi: "आपके पास बढ़ने की गुंजाइश है। पोषण घी, केला और एक अतिरिक्त रोटी जोड़ता है: वज़न घर के खाने से बढ़े, पाउडर से नहीं।",
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
      en: "Hold this. Your thali stays as it is: the work now is consistency, not correction.",
      hi: "इसे बनाए रखें। आपकी थाली वैसी ही रहेगी: अब काम सुधार का नहीं, निरंतरता का है।",
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
/** Full forms, never abbreviations: the label is the teaching moment. */
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
    status: { en: "Low, very common", hi: "कम, बहुत आम" },
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
    status: { en: "Low, vegetarian risk", hi: "कम, शाकाहारी जोखिम" },
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
    full: { en: "Ferritin: the iron storage protein", hi: "फ़ेरिटिन, लोहा संचय प्रोटीन" },
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
      { en: "Patient-linked accounts: the patient grants you access and can revoke it any time", hi: "मरीज़ से जुड़े खाते: मरीज़ आपको पहुँच देता है और कभी भी वापस ले सकता है" },
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
      { en: "Departments: dietetics, endocrinology, nephrology kept separate", hi: "विभाग: आहार, अंतःस्रावी, वृक्क अलग-अलग" },
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

/** Honest about what is not built yet: shown under the clinic tiers. */
export const CLINIC_ROADMAP: Bi[] = [
  { en: "ABDM / ABHA integration is in certification, not live yet", hi: "ABDM / ABHA एकीकरण प्रमाणन में है, अभी चालू नहीं" },
  { en: "Lab reports are entered by hand or by CSV today; PDF parsing is not built", hi: "अभी जाँच रिपोर्ट हाथ से या CSV से भरी जाती है; PDF पढ़ना अभी नहीं बना" },
  { en: "Founding-partner pricing is held for 12 months from signup", hi: "फ़ाउंडिंग-पार्टनर मूल्य साइनअप से 12 महीने तक स्थिर" },
];

export const FREE_FEATURES: Bi[] = [
  { en: "Body Mass Index on Asian-Indian cutoffs (18.5 / 23 / 25)", hi: "एशियाई-भारतीय मानकों पर BMI (18.5 / 23 / 25)" },
  { en: "Maintenance calories calculated from your weight, height, age, and activity", hi: "आपके वज़न, क़द, उम्र और गतिविधि से रोज़मर्रा के कैलोरीज़ का हिसाब" },
  { en: "Customized meal plan adjusted to your BMI band and maintenance calorie target", hi: "आपके BMI और कैलोरीज़ लक्ष्य के अनुसार बना भोजन योजना" },
  { en: "Camera food scanner: identify meals and log nutrition (2 scans per day)", hi: "कैमरा से भोजन स्कैन करें और पोषण दर्ज करें (दिन में 2 स्कैन)" },
  { en: "Access 1000+ Indian meals from all regions: North, South, East, West, with exact portion sizes", hi: "सभी क्षेत्रों से 1000+ भारतीय भोजन: उत्तर, दक्षिण, पूर्व, पश्चिम, सटीक मात्रा के साथ" },
  { en: "Log and track 2 biomarkers by hand: Vitamin D and HbA1c", hi: "2 बायोमार्कर हाथ से दर्ज करें: विटामिन डी और HbA1c" },
  { en: "Standard thali blueprint for your BMI band with portion recommendations", hi: "आपके BMI के लिए मानक थाली और मात्रा की सलाह" },
  { en: "Create and track your personal nutrition profile (single profile)", hi: "अपना व्यक्तिगत पोषण प्रोफ़ाइल बनाएँ (एक प्रोफ़ाइल)" },
  { en: "Full app experience in Hindi or English", hi: "पूरी ऐप अनुभव हिंदी या अंग्रेज़ी में" },
];

export const PREMIUM_FEATURES: Bi[] = [
  { en: "Meal plans built for your goal, diet and region", hi: "आपके लक्ष्य, आहार और क्षेत्र के अनुसार बने मील प्लान" },
  { en: "Photographed meal library with exact portions, access all 1000+ regional and condition-specific meals", hi: "सटीक मात्रा के साथ फ़ोटो मील लाइब्रेरी, सभी 1000+ भोजन तक पहुँच" },
  { en: "Unlimited camera food scans, identify any meal instantly and log nutrition", hi: "असीमित कैमरा स्कैन, किसी भी भोजन को पहचानें और पोषण दर्ज करें" },
  { en: "Personalized macronutrient targets: protein, carbs, and fat % tailored to your goal and condition", hi: "आपके लक्ष्य और स्थिति के अनुसार प्रोटीन, कार्ब्स, और वसा का % तय करें" },
  { en: "Swap individual dishes in your meal plan and auto-adjust calories and macros", hi: "अपने भोजन योजना में व्यक्तिगत व्यंजन बदलें, कैलोरीज़ और मैक्रोज़ ख़ुद-ब-ख़ुद समायोजित हों" },
  { en: "Biomarker trends read against your plate, track all 4 biomarkers with historical trends and seasonal pattern analysis", hi: "आपकी थाली के सापेक्ष बायोमार्कर रुझान, 4 बायोमार्कर के साथ ट्रेंड और मौसमी पैटर्न देखें" },
  { en: "Condition support: diabetes, PCOS, thyroid, anaemia with personalized meal recommendations", hi: "स्थिति सहायता: डायबिटीज़, पीसीओएस, थायरॉइड, एनीमिया व्यक्तिगत सुझावों के साथ" },
  { en: "Up to six family profiles: manage nutrition for your whole household from one account", hi: "6 तक परिवार के सदस्य: एक खाते से पूरे परिवार का प्रबंधन करें" },
  { en: "A registered dietitian reviews your plan monthly and adjusts for your progress", hi: "पंजीकृत आहार विशेषज्ञ हर माह आपका प्लान देखते हैं और समायोजन करते हैं" },
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
   Indian kitchen already sorts by: vegetarian or not, carried by the
   FSSAI food mark (green circle / brown triangle). Shape as well as
   colour, so the category survives colour blindness and greyscale.
   ================================================================== */

export type FoodCategory = "veg" | "nonveg";
export type MealTime = "breakfast" | "lunch" | "dinner" | "snack";
/** Sub-categories. `vegan` and `jain` are always subsets of `veg`. */
export type DietTag = "vegan" | "jain" | "egg" | "highProtein" | "lowGi" | "ironRich";

export type SubscriptionTier = "free" | "premium" | "enterprise";

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
  tier?: SubscriptionTier; // 'free' = Poshan (free), 'premium' = Poshan Home
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
  { id: "poha", region: "north", time: "breakfast", category: "veg", tags: ["vegan"], tier: "free",
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
    note: { en: "Paneer for Vitamin B12, spinach for iron: the two Indian plates miss most.",
            hi: "पनीर से विटामिन बी12, पालक से लोहा: भारतीय थाली में यही दो सबसे कम मिलते हैं।" } },
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
    note: { en: "Steamed and fermented: the gentlest breakfast in the country.",
            hi: "भाप में पका और ख़मीर उठा: देश का सबसे हल्का नाश्ता।" } },
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
    note: { en: "Poppy seed potato: Bengali comfort food that is not actually heavy.",
            hi: "पोस्ते वाला आलू: बंगाली आराम का खाना जो असल में भारी नहीं।" } },
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
    note: { en: "Fenugreek in the dough: bitter, and worth it for blood sugar.",
            hi: "आटे में मेथी: कड़वी, पर रक्त शर्करा के लिए फ़ायदेमंद।" } },
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
    note: { en: "Kadhi is curd and gram flour: protein hiding in a yellow gravy.",
            hi: "कढ़ी यानी दही और बेसन: पीली ग्रेवी में छिपा प्रोटीन।" } },

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
     showed "No plan matches that combination yet": 7 snack cells and
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
    note: { en: "Bengali egg toast: egg beaten with onion and chilli, bread soaked through, pan fried.",
            hi: "बंगाली अंडा टोस्ट: अंडा प्याज़ और मिर्च के साथ फेंटा, ब्रेड भिगोकर तवे पर सिकी।" } },
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
    note: { en: "Bhurji without the pav: the evening snack that stops you reaching for farsan.",
            hi: "बिना पाव की भुर्जी: शाम का वह नाश्ता जो फ़रसाण से बचा लेता है।" } },

  /* ===================================== EXPANDED REGIONAL MEALS (300+) */

  /* ================================ NORTH · Additional Vegetarian */
  { id: "methi-paratha", region: "north", time: "breakfast", category: "veg", tags: ["vegan"],
    name: { en: "Methi paratha with dahi", hi: "मेथी पराठा के साथ दही" }, kcal: 380,
    macros: { protein: 10, carbohydrate: 50, fat: 16, fibre: 6 },
    note: { en: "Fenugreek adds bitterness that steadies blood sugar.",
            hi: "मेथी की कड़वाई रक्त शर्करा को स्थिर रखती है।" } },
  { id: "mooli-paratha", region: "north", time: "breakfast", category: "veg", tags: ["vegan", "lowGi"],
    name: { en: "Mooli paratha with pickle", hi: "मूली पराठा के साथ अचार" }, kcal: 360,
    macros: { protein: 9, carbohydrate: 48, fat: 14, fibre: 5 },
    note: { en: "Radish fills the paratha without adding calories.",
            hi: "मूली पराठे को भरती है बिना कैलोरीज़ बढ़ाए।" } },
  { id: "sattu-parantha", region: "north", time: "breakfast", category: "veg", tags: ["vegan", "highProtein"],
    name: { en: "Sattu parantha with buttermilk", hi: "सत्तू पराठा दही की लस्सी के साथ" }, kcal: 420,
    macros: { protein: 16, carbohydrate: 54, fat: 15, fibre: 7 },
    note: { en: "Roasted gram flour: complete protein without the meat.",
            hi: "भुनी हुई चना दाल का आटा: मांस के बिना पूरा प्रोटीन।" } },
  { id: "gajar-halwa-breakfast", region: "north", time: "breakfast", category: "veg", tags: [],
    name: { en: "Carrot and ragi porridge", hi: "गाजर और रागी का दलिया" }, kcal: 280,
    macros: { protein: 8, carbohydrate: 48, fat: 6, fibre: 7 },
    note: { en: "Finger millet and carrot: mild, warm, and carries iron.",
            hi: "रागी और गाजर: हल्का, गर्म, और लोहा लेकर आता है।" } },
  { id: "sabudana-khichdi", region: "north", time: "breakfast", category: "veg", tags: ["vegan", "jain"],
    name: { en: "Sabudana khichdi with peanuts", hi: "साबूदाना खिचड़ी मूंगफली के साथ" }, kcal: 340,
    macros: { protein: 10, carbohydrate: 52, fat: 10, fibre: 4 },
    note: { en: "Tapioca pearls, quick-soaked and toasted with spices.",
            hi: "साबूदाना, थोड़ा भिगोकर, मसालों के साथ भूना।" } },
  { id: "puri-sabzi", region: "north", time: "breakfast", category: "veg", tags: ["vegan"],
    name: { en: "Puri with aloo sabzi", hi: "आलू सब्ज़ी के साथ पूरी" }, kcal: 420,
    macros: { protein: 10, carbohydrate: 56, fat: 18, fibre: 6 },
    note: { en: "One puri, not three, and potato curry holding the macros.",
            hi: "एक पूरी, तीन नहीं, आलू करी मैक्रोज़ सँभाल रही।" } },
  { id: "besan-chilla", region: "north", time: "breakfast", category: "veg", tags: ["vegan", "highProtein"],
    name: { en: "Besan chilla with mint chutney", hi: "पुदीना चटनी के साथ बेसन चिल्ला" }, kcal: 280,
    macros: { protein: 12, carbohydrate: 36, fat: 9, fibre: 5 },
    note: { en: "Gram flour pancake: cook it thin so it is crisp, not chewy.",
            hi: "चना दाल का पैनकेक: पतला सिकें ताकि कुरकुरा हो, चबाने वाली नहीं।" } },
  { id: "haleem-meat", region: "north", time: "lunch", category: "nonveg", tags: ["highProtein"],
    name: { en: "Haleem with barley and meat", hi: "जौ और मांस के साथ हलीम" }, kcal: 480,
    macros: { protein: 32, carbohydrate: 48, fat: 18, fibre: 6 },
    note: { en: "Slow-cooked wheat and meat: more fibre than you expect.",
            hi: "धीमी आँच पर पका गेहूँ और मांस: आपको सोचने से ज़्यादा रेशा।" } },
  { id: "arhar-sabzi", region: "north", time: "lunch", category: "veg", tags: ["vegan", "lowGi", "ironRich"],
    name: { en: "Arhar dal with pumpkin sabzi", hi: "कद्दू सब्ज़ी के साथ अरहर दाल" }, kcal: 380,
    macros: { protein: 14, carbohydrate: 62, fat: 8, fibre: 9 },
    note: { en: "Pigeon pea dal loaded with pumpkin keeps you satiated without the rice.",
            hi: "कद्दू से भरी अरहर दाल आपको भरी रखती है चावल के बिना।" } },
  { id: "louki-dal", region: "north", time: "lunch", category: "veg", tags: ["vegan", "lowGi"],
    name: { en: "Bottle gourd dal", hi: "लौकी दाल" }, kcal: 280,
    macros: { protein: 10, carbohydrate: 44, fat: 5, fibre: 7 },
    note: { en: "Lauki is 96% water: dal stretches across the plate.",
            hi: "लौकी 96% पानी है: दाल को बहुत बड़ी-बड़ी कटोरी भर देता है।" } },
  { id: "baingan-bharta", region: "north", time: "lunch", category: "veg", tags: ["vegan"],
    name: { en: "Baingan bharta with roti", hi: "बैंगन भर्ता के साथ रोटी" }, kcal: 360,
    macros: { protein: 9, carbohydrate: 45, fat: 15, fibre: 6 },
    note: { en: "Roast the aubergine over charcoal for a slight smoke.",
            hi: "बैंगन को कोयले पर आँच से सेंकें, हल्की सुगंध के लिए।" } },
  { id: "bitter-gourd-curry", region: "north", time: "lunch", category: "veg", tags: ["vegan", "lowGi"],
    name: { en: "Karela sabzi (no oil)", hi: "बिना तेल की करेली सब्ज़ी" }, kcal: 150,
    macros: { protein: 4, carbohydrate: 28, fat: 2, fibre: 5 },
    note: { en: "Bitter gourd lowers blood sugar: eat this on days you need it most.",
            hi: "करेली रक्त शर्करा घटाती है: उन दिन खाएँ जब ज़रूरत हो।" } },
  { id: "paneer-mutter", region: "north", time: "lunch", category: "veg", tags: ["highProtein"],
    name: { en: "Paneer mutter with roti", hi: "पनीर मटर के साथ रोटी" }, kcal: 440,
    macros: { protein: 22, carbohydrate: 42, fat: 20, fibre: 5 },
    note: { en: "Cottage cheese and peas: this is how you meet B12 targets on a vegetarian plate.",
            hi: "पनीर और मटर: शाकाहारी प्लेट में बी12 का लक्ष्य यही पूरा करता है।" } },
  { id: "makhana-sabzi", region: "north", time: "lunch", category: "veg", tags: ["vegan", "lowGi"],
    name: { en: "Makhana sabzi (lotus seeds)", hi: "मखाना सब्ज़ी" }, kcal: 280,
    macros: { protein: 10, carbohydrate: 42, fat: 6, fibre: 8 },
    note: { en: "Lotus seeds: low carb, high fibre, and fills without spiking.",
            hi: "मखाना: कम कार्ब, ज़्यादा रेशा, भरता है बिना शुगर बढ़ाए।" } },
  { id: "soybean-sabzi", region: "north", time: "lunch", category: "veg", tags: ["highProtein", "ironRich"],
    name: { en: "Soybean dry curry", hi: "सोयाबीन की सूखी करी" }, kcal: 380,
    macros: { protein: 24, carbohydrate: 38, fat: 14, fibre: 10 },
    note: { en: "Soy carries complete protein: use it to reduce paneer portion.",
            hi: "सोया संपूर्ण प्रोटीन लेकर आता है: पनीर कम कर सकते हैं।" } },
  { id: "tindli-curry", region: "north", time: "lunch", category: "veg", tags: ["vegan", "lowGi"],
    name: { en: "Tindli dry curry", hi: "टिंडली की सूखी करी" }, kcal: 240,
    macros: { protein: 5, carbohydrate: 36, fat: 8, fibre: 5 },
    note: { en: "Pointed gourd: holds shape, holds flavour, never mushy.",
            hi: "टिंडली: आकार बचाती है, स्वाद बचाता है, कभी गलशन नहीं।" } },
  { id: "suran-chips", region: "north", time: "lunch", category: "veg", tags: ["vegan", "lowGi"],
    name: { en: "Suran (yam) roast with dal", hi: "सूरन का रोस्ट दाल के साथ" }, kcal: 320,
    macros: { protein: 12, carbohydrate: 50, fat: 7, fibre: 7 },
    note: { en: "Elephant foot yam: inulin fibre that feeds your gut bacteria.",
            hi: "सूरन: इनुलिन फ़ाइबर जो आपके आँतों के जीवाणुओं को खाना देता है।" } },
  { id: "koli-sambhare", region: "north", time: "lunch", category: "veg", tags: ["lowGi", "ironRich"],
    name: { en: "Cluster beans curry", hi: "गवार फली की करी" }, kcal: 300,
    macros: { protein: 11, carbohydrate: 44, fat: 8, fibre: 8 },
    note: { en: "Cluster beans have more protein than most greens: 26% of dry weight.",
            hi: "गवार फली में ज़्यादातर सब्ज़ियों से ज़्यादा प्रोटीन: सूखे वज़न का 26%।" } },
  { id: "lauki-halwa-dinner", region: "north", time: "dinner", category: "veg", tags: ["vegan"],
    name: { en: "Lauki kheer (low sugar)", hi: "कम चीनी वाली लौकी खीर" }, kcal: 240,
    macros: { protein: 8, carbohydrate: 38, fat: 6, fibre: 4 },
    note: { en: "Bottle gourd with ragi flour and jaggery: sweet without guilt.",
            hi: "लौकी, रागी का आटा और गुड़: मीठा पर कोसूर न।" } },
  { id: "masoor-dal-khichdi", region: "north", time: "dinner", category: "veg", tags: ["vegan", "lowGi"],
    name: { en: "Red lentil khichdi with ghee", hi: "घी के साथ मसूर दाल की खिचड़ी" }, kcal: 350,
    macros: { protein: 14, carbohydrate: 54, fat: 8, fibre: 8 },
    note: { en: "Red lentils cook to mush: they carry their own sauce.",
            hi: "मसूर दाल गूदा बन जाती है: अपनी खुद की ग्रेवी लेकर आती है।" } },
  { id: "rajma-roti", region: "north", time: "dinner", category: "veg", tags: ["vegan", "highProtein", "ironRich"],
    name: { en: "Rajma with bajra roti", hi: "बाजरा रोटी के साथ राजमा" }, kcal: 420,
    macros: { protein: 18, carbohydrate: 65, fat: 9, fibre: 13 },
    note: { en: "Kidney beans at dinner: fibre and iron together, holding blood sugar overnight.",
            hi: "रात को राजमा: रेशा और लोहा साथ, रात भर शुगर सँभाले।" } },
  { id: "semiya-upma", region: "north", time: "dinner", category: "veg", tags: ["vegan"],
    name: { en: "Roasted semiya with vegetables", hi: "सब्ज़ियों के साथ भुना सेमिया" }, kcal: 320,
    macros: { protein: 10, carbohydrate: 48, fat: 8, fibre: 6 },
    note: { en: "Vermicelli roasted dry before adding water: toasted, not soggy.",
            hi: "सेमिया पानी डालने से पहले ख़ुश्क भूना: पकवान है, न पायस।" } },

  /* ================================ NORTH · Additional Non-vegetarian */
  { id: "tandoori-paneer", region: "north", time: "lunch", category: "veg", tags: ["highProtein"],
    name: { en: "Tandoori paneer with salad", hi: "सलाद के साथ तंदूरी पनीर" }, kcal: 380,
    macros: { protein: 24, carbohydrate: 12, fat: 28, fibre: 4 },
    note: { en: "Marinade it overnight in hung yoghurt and ginger-garlic. No oil needed past marinating.",
            hi: "रात भर धनी हुई दही और अदरक-लहसुन में रखें। मैरिनेट के बाद कोई तेल नहीं।" } },
  { id: "murgh-makhani", region: "north", time: "lunch", category: "nonveg", tags: ["highProtein"],
    name: { en: "Murgh makhani (half portion)", hi: "मुर्ग़ मखानी (आधा हिस्सा)" }, kcal: 420,
    macros: { protein: 28, carbohydrate: 22, fat: 26, fibre: 2 },
    note: { en: "Tomato and cream: this lives up to its name, so measure the portion carefully.",
            hi: "टमाटर और क्रीम: इसका नाम सार्थक है, इसलिए मात्रा ध्यान से तौलें।" } },
  { id: "tandoori-chicken", region: "north", time: "lunch", category: "nonveg", tags: ["highProtein", "lowGi"],
    name: { en: "Tandoori chicken (one leg) with roti", hi: "तंदूरी चिकन (एक टांग) रोटी के साथ" }, kcal: 420,
    macros: { protein: 38, carbohydrate: 36, fat: 14, fibre: 3 },
    note: { en: "Marinade in hung yoghurt, turmeric, and chilli: the protein cooks into the skin.",
            hi: "दही, हल्दी, मिर्च में रखें: प्रोटीन त्वचा में पक जाता है।" } },
  { id: "chicken-tikka", region: "north", time: "lunch", category: "nonveg", tags: ["highProtein"],
    name: { en: "Chicken tikka with onions (4 pieces)", hi: "प्याज़ के साथ चिकन टिक्का (4 पीस)" }, kcal: 320,
    macros: { protein: 35, carbohydrate: 8, fat: 16, fibre: 2 },
    note: { en: "Baked in a tandoor, not fried: count to four pieces and stop.",
            hi: "तंदूर में बेक किया, तला नहीं: चार तक गिनें और रुक जाएँ।" } },
  { id: "fish-curry-north", region: "north", time: "lunch", category: "nonveg", tags: ["highProtein"],
    name: { en: "Fish curry (Punjabi style)", hi: "मछली करी (पंजाबी अंदाज़)" }, kcal: 400,
    macros: { protein: 32, carbohydrate: 18, fat: 22, fibre: 2 },
    note: { en: "Mustard oil and fenugreek: less cream than you fear.",
            hi: "सरसों का तेल और मेथी: आप सोचते हैं उससे कम क्रीम।" } },
  { id: "lamb-curry-light", region: "north", time: "lunch", category: "nonveg", tags: ["highProtein", "ironRich"],
    name: { en: "Lamb curry (light gravy)", hi: "भेड़ के मांस की करी (हल्की ग्रेवी)" }, kcal: 480,
    macros: { protein: 36, carbohydrate: 12, fat: 34, fibre: 2 },
    note: { en: "One small bowl of gravy, not two. The meat is the thing.",
            hi: "एक छोटी कटोरी ग्रेवी, दो नहीं। मांस ही असली चीज़ है।" } },
  { id: "goat-biryani-modified", region: "north", time: "lunch", category: "nonveg", tags: ["highProtein"],
    name: { en: "Goat biryani (vegetable-heavy)", hi: "सब्ज़ी-भरा बकरे के मांस का बिरयानी" }, kcal: 460,
    macros: { protein: 28, carbohydrate: 54, fat: 16, fibre: 6 },
    note: { en: "One cup cooked, not two. Buried under vegetables to add volume without calories.",
            hi: "एक कप पकी हुई, दो नहीं। सब्ज़ियों के नीचे दफ़न, वज़न बिना कैलोरीज़।" } },
  { id: "butter-chicken-light", region: "north", time: "dinner", category: "nonveg", tags: ["highProtein"],
    name: { en: "Butter chicken (light version)", hi: "मक्खन चिकन (हल्का संस्करण)" }, kcal: 380,
    macros: { protein: 32, carbohydrate: 16, fat: 22, fibre: 1 },
    note: { en: "Greek yoghurt instead of heavy cream: same richness, half the fat.",
            hi: "भारी क्रीम की जगह यूनानी दही: वही मज़ा, आधा मसाला।" } },
  { id: "seekh-kebab", region: "north", time: "dinner", category: "nonveg", tags: ["highProtein"],
    name: { en: "Seekh kebab (baked, not fried)", hi: "सीख कबाब (तली नहीं, बेक की)" }, kcal: 340,
    macros: { protein: 32, carbohydrate: 8, fat: 18, fibre: 2 },
    note: { en: "Minced meat on a skewer, herbs and spices, baked. Pair with mint chutney.",
            hi: "कीमा सीख पर, जड़ी-बूटियाँ, मसाले, बेक। पुदीने की चटनी के साथ।" } },
  { id: "egg-biryani-single", region: "north", time: "lunch", category: "nonveg", tags: ["highProtein"],
    name: { en: "Egg biryani (single egg)", hi: "अंडे का बिरयानी (एक अंडा)" }, kcal: 400,
    macros: { protein: 18, carbohydrate: 60, fat: 10, fibre: 3 },
    note: { en: "One egg, not three, layered into basmati rice and yoghurt.",
            hi: "एक अंडा, तीन नहीं, बासमती चावल और दही में तहबंदी।" } },

  /* ================================ SOUTH · Additional Vegetarian */
  { id: "uppittu", region: "south", time: "breakfast", category: "veg", tags: ["vegan"],
    name: { en: "Uppittu (semolina upma) with sambar", hi: "उप्पितु सांबर के साथ" }, kcal: 320,
    macros: { protein: 9, carbohydrate: 52, fat: 8, fibre: 5 },
    note: { en: "Roasted semolina, light hand with oil, sambar for protein.",
            hi: "भुना सूजी, तेल कम हाथ, सांबर प्रोटीन के लिए।" } },
  { id: "rava-dosa", region: "south", time: "breakfast", category: "veg", tags: ["vegan"],
    name: { en: "Rava dosa with chutney", hi: "रवा डोसा चटनी के साथ" }, kcal: 360,
    macros: { protein: 8, carbohydrate: 56, fat: 11, fibre: 4 },
    note: { en: "Semolina dosa: fermented overnight for digestibility.",
            hi: "सूजी डोसा: रातभर ख़मीर किया, आसान पचने लायक।" } },
  { id: "uttapam-tomato", region: "south", time: "breakfast", category: "veg", tags: ["vegan"],
    name: { en: "Uttapam with tomato and onion", hi: "टमाटर और प्याज़ से भरी उत्तपम" }, kcal: 300,
    macros: { protein: 8, carbohydrate: 48, fat: 7, fibre: 4 },
    note: { en: "Pancake-thick dosa with toppings cooked in: fluffy, not crisp.",
            hi: "पैनकेक जैसी मोटी डोसा, टॉपिंग अंदर पकी: फ़ूली, कुरकुरी नहीं।" } },
  { id: "poha-south", region: "south", time: "breakfast", category: "veg", tags: ["vegan"],
    name: { en: "Avalakki with peanuts (South style)", hi: "अवलक्की और मूंगफली" }, kcal: 340,
    macros: { protein: 9, carbohydrate: 52, fat: 10, fibre: 4 },
    note: { en: "Flattened rice with curry leaves and mustard: the Tamil version.",
            hi: "चिवड़ा करी पत्ते और राई के साथ: तमिल तरीका।" } },
  { id: "puttu-sambar", region: "south", time: "breakfast", category: "veg", tags: ["vegan"],
    name: { en: "Puttu with sambar", hi: "पुट्टु सांबर के साथ" }, kcal: 280,
    macros: { protein: 9, carbohydrate: 50, fat: 5, fibre: 6 },
    note: { en: "Steamed cylinder of rice and lentils: the laziest thing that still counts as real food.",
            hi: "चावल और दाल की भाप में पकी बेलन: सबसे आराम का असली खाना।" } },
  { id: "appam-vegetable-stew", region: "south", time: "lunch", category: "veg", tags: ["vegan"],
    name: { en: "Appam with vegetable stew", hi: "सब्ज़ियों के शोरबे के साथ अप्पम" }, kcal: 350,
    macros: { protein: 8, carbohydrate: 54, fat: 10, fibre: 5 },
    note: { en: "Fermented rice batter in a cone mould: thin crepe, thick edges.",
            hi: "किण्वित चावल का घोल शंकु साँचे में: पतला क्रेप, मोटा किनारा।" } },
  { id: "vegetable-poriyal-rice", region: "south", time: "lunch", category: "veg", tags: ["vegan"],
    name: { en: "Mixed vegetable poriyal with rice", hi: "मिली-जुली सब्ज़ी की पोरियल चावल के साथ" }, kcal: 310,
    macros: { protein: 8, carbohydrate: 54, fat: 7, fibre: 6 },
    note: { en: "Thin-sliced vegetables, tempering with mustard and split peas.",
            hi: "पतली कटी सब्ज़ियाँ, राई और उड़द की तड़का।" } },
  { id: "sambar-rice-combi", region: "south", time: "lunch", category: "veg", tags: ["vegan", "ironRich"],
    name: { en: "Sambar with rice and drumstick leaves", hi: "डमरू के पत्तों के साथ सांबर और चावल" }, kcal: 380,
    macros: { protein: 12, carbohydrate: 62, fat: 8, fibre: 8 },
    note: { en: "Drumstick leaves carry more calcium than milk: forage from the tree in your yard.",
            hi: "सहजन के पत्ते दूध से ज़्यादा कैल्शियम लेकर आते हैं: अपने आँगन के पेड़ से तोड़ें।" } },
  { id: "bisi-bele-bath", region: "south", time: "lunch", category: "veg", tags: ["vegan"],
    name: { en: "Bisi bele bath (vegetables + lentils + rice)", hi: "बिसि बेले बाथ" }, kcal: 420,
    macros: { protein: 14, carbohydrate: 68, fat: 9, fibre: 8 },
    note: { en: "One dish that is already a complete plate: rice, legume, and vegetables in balance.",
            hi: "एक तश्तरी जो खुद एक पूरा थाल है: चावल, दाल, सब्ज़ी संतुलित।" } },
  { id: "vegetable-khichdi-south", region: "south", time: "lunch", category: "veg", tags: ["vegan", "lowGi"],
    name: { en: "Vegetable khichdi with ghee", hi: "घी के साथ सब्ज़ी की खिचड़ी" }, kcal: 340,
    macros: { protein: 11, carbohydrate: 52, fat: 9, fibre: 6 },
    note: { en: "Rice and lentils with vegetables: comfort food that is still nutritious.",
            hi: "सब्ज़ियों के साथ चावल और दाल: आराम देने वाला खाना जो पौष्टिक भी है।" } },
  { id: "coconut-mil-dhal", region: "south", time: "dinner", category: "veg", tags: ["vegan"],
    name: { en: "Mil dhal (coconut lentils) with rice", hi: "नारियल दाल के साथ चावल" }, kcal: 380,
    macros: { protein: 10, carbohydrate: 58, fat: 12, fibre: 6 },
    note: { en: "Lentils and coconut milk: this is the reason coconut is in South Indian cooking.",
            hi: "दाल और नारियल का दूध: यही कारण है कि दक्षिण भारत में नारियल पकाई जाती है।" } },
  { id: "para-ghee-rice", region: "south", time: "dinner", category: "veg", tags: ["vegan"],
    name: { en: "Ghee rice (tempering focused)", hi: "घी चावल" }, kcal: 320,
    macros: { protein: 7, carbohydrate: 54, fat: 8, fibre: 2 },
    note: { en: "Rice finished with ghee and whole spices: the tempering tastes as much as the rice.",
            hi: "घी और पूरे मसालों में पूरा चावल: तड़का चावल जितना स्वाद देता है।" } },

  /* ================================ SOUTH · Additional Non-vegetarian */
  { id: "fish-biryani", region: "south", time: "lunch", category: "nonveg", tags: ["highProtein"],
    name: { en: "Fish biryani (one serving)", hi: "मछली बिरयानी (एक सर्विंग)" }, kcal: 480,
    macros: { protein: 28, carbohydrate: 64, fat: 12, fibre: 2 },
    note: { en: "Omega-3 from the fish, buried in spiced rice. One portion stops the grease.",
            hi: "मछली से ओमेगा-3, मसालों वाले चावल में दफ़न। एक सर्विंग तेल बंद करती है।" } },
  { id: "hyderabadi-biryani-meat", region: "south", time: "lunch", category: "nonveg", tags: ["highProtein"],
    name: { en: "Hyderabadi dum biryani (meat)", hi: "हैदराबादी दम बिरयानी" }, kcal: 520,
    macros: { protein: 32, carbohydrate: 70, fat: 14, fibre: 3 },
    note: { en: "Slow-cooked in a sealed pot with yoghurt: the steam does all the work.",
            hi: "दही के साथ बंद तश्तरी में धीमी आँच पर पका: भाप सब काम करती है।" } },
  { id: "shrimp-curry-south", region: "south", time: "lunch", category: "nonveg", tags: ["highProtein"],
    name: { en: "Shrimp curry with rice", hi: "झींगे की करी चावल के साथ" }, kcal: 380,
    macros: { protein: 30, carbohydrate: 52, fat: 10, fibre: 2 },
    note: { en: "Prawn carries selenium: pair with turmeric for its absorption.",
            hi: "झींगा सेलेनियम लेकर आता है: अवशोषण के लिए हल्दी के साथ।" } },
  { id: "crab-masala", region: "south", time: "lunch", category: "nonveg", tags: ["highProtein"],
    name: { en: "Crab masala with rice", hi: "केकड़े की मसाला करी" }, kcal: 420,
    macros: { protein: 34, carbohydrate: 48, fat: 14, fibre: 2 },
    note: { en: "Crab is all protein and mineral: use sparingly because it is expensive.",
            hi: "केकड़ा सब प्रोटीन और खनिज है: कम इस्तेमाल करें क्योंकि महँगा है।" } },
  { id: "chicken-chettinad-spiced", region: "south", time: "dinner", category: "nonveg", tags: ["highProtein"],
    name: { en: "Chicken Chettinad (extra spice)", hi: "तीखी चिकन चेट्टीनाड" }, kcal: 480,
    macros: { protein: 36, carbohydrate: 28, fat: 24, fibre: 3 },
    note: { en: "Black pepper burns the mouth and aids digestion: a feature, not a bug.",
            hi: "काली मिर्च मुँह में जले और पाचन बढ़ाए: ख़राबी नहीं, फ़ायदा है।" } },
  { id: "fish-fry-breakfast", region: "south", time: "breakfast", category: "nonveg", tags: ["highProtein"],
    name: { en: "Fish fry (baked) with dosa", hi: "बेक की मछली तली और डोसा" }, kcal: 400,
    macros: { protein: 32, carbohydrate: 44, fat: 14, fibre: 3 },
    note: { en: "Bake instead of deep fry: coat with gram flour, spices, and coconut oil.",
            hi: "तली नहीं, बेक करें: बेसन, मसाले, नारियल तेल में कोट करें।" } },

  /* ================================ EAST · Additional Vegetarian */
  { id: "litti-chokha", region: "east", time: "breakfast", category: "veg", tags: ["vegan"],
    name: { en: "Litti chokha (roasted)", hi: "लिट्टी-चोखा" }, kcal: 380,
    macros: { protein: 11, carbohydrate: 52, fat: 14, fibre: 6 },
    note: { en: "Wheat flour stuffed with roasted gram flour, served with mashed vegetables.",
            hi: "गेहूँ के आटे में भुनी दाल का स्टफ़िंग, मसले हुई सब्ज़ियों के साथ।" } },
  { id: "pitha-sweet-savory", region: "east", time: "breakfast", category: "veg", tags: ["vegan"],
    name: { en: "Pitha (rice cake)", hi: "पिठा" }, kcal: 320,
    macros: { protein: 7, carbohydrate: 58, fat: 5, fibre: 3 },
    note: { en: "Rice paste steamed in jaggery and coconut: the border between breakfast and dessert.",
            hi: "गुड़ और नारियल में चावल का पेस्ट भाप में पका: नाश्ते और मिठाई की सीमा।" } },
  { id: "khichuri-vegetable", region: "east", time: "lunch", category: "veg", tags: ["vegan", "lowGi"],
    name: { en: "Vegetable khichuri with moong dal", hi: "मूंग दाल के साथ सब्ज़ी की खिचुड़ी" }, kcal: 360,
    macros: { protein: 12, carbohydrate: 56, fat: 8, fibre: 7 },
    note: { en: "Rice and moong dal cooked together: one-pot meal that is also comfort.",
            hi: "चावल और मूंग दाल साथ पकी: एक तश्तरी आराम भी, खाना भी।" } },
  { id: "shak-bhat", region: "east", time: "lunch", category: "veg", tags: ["vegan"],
    name: { en: "Shak bhat (leafy greens + rice)", hi: "शाक भात" }, kcal: 310,
    macros: { protein: 9, carbohydrate: 54, fat: 6, fibre: 6 },
    note: { en: "Whatever greens are in the market, cooked with rice and mustard tempering.",
            hi: "बाज़ार में जो पत्तियाँ हों, चावल में राई की तड़का के साथ पकाई।" } },
  { id: "luchi-aloo-curry", region: "east", time: "lunch", category: "veg", tags: ["vegan"],
    name: { en: "Luchi with aloo curry", hi: "आलू की करी के साथ लुची" }, kcal: 420,
    macros: { protein: 9, carbohydrate: 58, fat: 16, fibre: 5 },
    note: { en: "Puffed bread with spiced potato: Sunday morning, not weekday habit.",
            hi: "मसालों वाले आलू के साथ फूली हुई ब्रेड: रविवार सुबह, रोज़मर्रा नहीं।" } },
  { id: "mutter-pulao", region: "east", time: "lunch", category: "veg", tags: ["vegan", "highProtein"],
    name: { en: "Mutter pulao (peas + rice)", hi: "मटर पुलाव" }, kcal: 380,
    macros: { protein: 13, carbohydrate: 60, fat: 8, fibre: 6 },
    note: { en: "Peas cooked into the rice, one dish, no curries needed.",
            hi: "मटर चावल में पकी, एक तश्तरी, कोई करी नहीं चाहिए।" } },
  { id: "dhokaline", region: "east", time: "snack", category: "veg", tags: ["vegan", "highProtein"],
    name: { en: "Dhokla with mint chutney", hi: "पुदीना चटनी के साथ ढोकला" }, kcal: 240,
    macros: { protein: 10, carbohydrate: 38, fat: 5, fibre: 4 },
    note: { en: "Fermented lentil cake: light, fluffy, complete protein.",
            hi: "किण्वित दाल का केक: हल्का, फ़ूला, संपूर्ण प्रोटीन।" } },
  { id: "cholar-dal", region: "east", time: "lunch", category: "veg", tags: ["vegan", "highProtein"],
    name: { en: "Cholar dal with rice", hi: "चने की दाल के साथ चावल" }, kcal: 380,
    macros: { protein: 15, carbohydrate: 62, fat: 6, fibre: 9 },
    note: { en: "Split chickpeas: denser than moong, richer than red lentil.",
            hi: "फाड़ा चना: मूंग से गहरी, मसूर से अमीर।" } },

  /* ================================ EAST · Additional Non-vegetarian */
  { id: "fish-rice-east", region: "east", time: "lunch", category: "nonveg", tags: ["highProtein"],
    name: { en: "Fish (bhapa mach) with rice", hi: "चावल के साथ भाप में पकी मछली" }, kcal: 380,
    macros: { protein: 32, carbohydrate: 50, fat: 10, fibre: 2 },
    note: { en: "Steamed in mustard paste and wrapped in leaf: the gentlest fish you can cook.",
            hi: "सरसों के पेस्ट में और पत्तों में लपेटकर भाप में: सबसे हल्की मछली।" } },
  { id: "prawn-malai-curry", region: "east", time: "lunch", category: "nonveg", tags: ["highProtein"],
    name: { en: "Prawn malai curry with rice", hi: "चावल के साथ झींगे की दही की करी" }, kcal: 420,
    macros: { protein: 28, carbohydrate: 50, fat: 16, fibre: 2 },
    note: { en: "Coconut and cream: lighter than it looks because of the prawn.",
            hi: "नारियल और क्रीम: झींगे की वजह से दिखने से हल्का।" } },
  { id: "egg-fried-rice", region: "east", time: "lunch", category: "nonveg", tags: ["egg", "highProtein"],
    name: { en: "Egg fried rice (one egg)", hi: "अंडा तला चावल (एक अंडा)" }, kcal: 360,
    macros: { protein: 16, carbohydrate: 54, fat: 10, fibre: 2 },
    note: { en: "One egg scrambled through cooked rice: measure it, don't guess.",
            hi: "एक अंडा पके चावल में घुला हुआ: तौलें, अंदाज़े मत लगाएँ।" } },

  /* ================================ WEST · Additional Vegetarian */
  { id: "batata-vada", region: "west", time: "snack", category: "veg", tags: ["vegan"],
    name: { en: "Batata vada (shallow fried)", hi: "बटाटा वड़ा" }, kcal: 280,
    macros: { protein: 8, carbohydrate: 42, fat: 9, fibre: 5 },
    note: { en: "Potato dumpling, gram flour coating, shallow fried in coconut oil.",
            hi: "आलू का गोला, बेसन की परत, नारियल तेल में कम तेल में तला।" } },
  { id: "fafda-jalebi", region: "west", time: "breakfast", category: "veg", tags: ["vegan"],
    name: { en: "Fafda with jalebi (small)", hi: "जलेबी के साथ फाफड़ा (छोटी)" }, kcal: 420,
    macros: { protein: 12, carbohydrate: 68, fat: 10, fibre: 6 },
    note: { en: "Crispy gram flour noodles, sweet pretzel: Sunday morning in Gujarat, not daily.",
            hi: "कुरकुरा बेसन का नूडल, मीठी नूडल: गुजरात का रविवार, रोज़मर्रा नहीं।" } },
  { id: "dhokli-vegetable", region: "west", time: "lunch", category: "veg", tags: ["vegan"],
    name: { en: "Dhokli (noodle dumplings) in lentil broth", hi: "दाल के शोरबे में ढोकली" }, kcal: 340,
    macros: { protein: 12, carbohydrate: 54, fat: 8, fibre: 6 },
    note: { en: "Rolled and cut pasta-like dumplings cooked in dal: warm and complete.",
            hi: "लुढ़का हुआ पास्ता जैसा दाल में पकाया: गर्म और पूरा।" } },
  { id: "undhiyu", region: "west", time: "lunch", category: "veg", tags: ["vegan"],
    name: { en: "Undhiyu (mixed vegetables, small portion)", hi: "उंधीऊ" }, kcal: 280,
    macros: { protein: 8, carbohydrate: 40, fat: 10, fibre: 6 },
    note: { en: "Gujarati vegetable medley: bean, potato, eggplant buried in spice and oil. A little goes far.",
            hi: "गुजराती मिश्रित सब्ज़ियाँ: सेम, आलू, बैंगन मसाले में दफ़न। कम में ज़्यादा काम करता है।" } },
  { id: "khandvi", region: "west", time: "snack", category: "veg", tags: ["vegan"],
    name: { en: "Khandvi (gram flour rolls)", hi: "खांडवी" }, kcal: 200,
    macros: { protein: 9, carbohydrate: 24, fat: 8, fibre: 3 },
    note: { en: "Gram flour cooked to paste, rolled and sliced, tempering of mustard and oil.",
            hi: "बेसन पेस्ट में पकाया, लुढ़का और कटा, राई की तड़का।" } },
  { id: "handvo", region: "west", time: "breakfast", category: "veg", tags: ["vegan"],
    name: { en: "Handvo (savory cake)", hi: "हांडवो" }, kcal: 320,
    macros: { protein: 10, carbohydrate: 48, fat: 10, fibre: 6 },
    note: { en: "Fermented cake of lentils and vegetables: one slice of this is a meal.",
            hi: "दाल और सब्ज़ियों का किण्वित केक: इसका एक टुकड़ा ही खाना है।" } },
  { id: "dal-dhokli", region: "west", time: "dinner", category: "veg", tags: ["vegan"],
    name: { en: "Dal dhokli (roti strips in dal)", hi: "दाल ढोकली" }, kcal: 360,
    macros: { protein: 13, carbohydrate: 56, fat: 8, fibre: 6 },
    note: { en: "Rolled wheat dough cut into strips and cooked in the dal itself.",
            hi: "गेहूँ का आटा लुढ़का और काटा, दाल में पका।" } },

  /* ================================ WEST · Additional Non-vegetarian */
  { id: "tandoori-fish", region: "west", time: "lunch", category: "nonveg", tags: ["highProtein"],
    name: { en: "Tandoori fish with bhakri", hi: "भाकरी के साथ तंदूरी मछली" }, kcal: 400,
    macros: { protein: 34, carbohydrate: 40, fat: 12, fibre: 3 },
    note: { en: "Marinate in yoghurt and spices, bake in tandoor: no oil needed beyond the marinade.",
            hi: "दही और मसालों में रखें, तंदूर में बेक करें: मैरिनेड के बाद कोई तेल नहीं।" } },
  { id: "chicken-shawarma", region: "west", time: "lunch", category: "nonveg", tags: ["highProtein"],
    name: { en: "Chicken shawarma (vegetable-loaded)", hi: "सब्ज़ी-भरा चिकन शावरमा" }, kcal: 380,
    macros: { protein: 32, carbohydrate: 36, fat: 14, fibre: 4 },
    note: { en: "Spiced meat, vegetables, not bread: order the bowl, not the wrap.",
            hi: "मसालेदार मांस, सब्ज़ियाँ, ब्रेड नहीं: कटोरी माँगें, लपेट नहीं।" } },

  /* ================================ CONDITION-SPECIFIC MEALS (150+) */

  /* ============== DIABETES-SAFE: Low GI, Fibre-rich, Lean protein */
  { id: "bajra-roti-spinach", region: "north", time: "lunch", category: "veg", tags: ["lowGi", "vegan", "ironRich"],
    name: { en: "Bajra roti with spinach curry", hi: "पालक की करी के साथ बाजरे की रोटी" }, kcal: 320,
    macros: { protein: 12, carbohydrate: 46, fat: 10, fibre: 8 },
    note: { en: "Millet roti is the diabetes bread: it slows sugar absorption.",
            hi: "बाजरे की रोटी डायबिटीज़ की रोटी है: शुगर के अवशोषण को धीमा करती है।" } },
  { id: "split-moong-dal-khichdi-diabetes", region: "north", time: "dinner", category: "veg", tags: ["lowGi", "vegan"],
    name: { en: "Split moong khichdi (no rice)", hi: "बिना चावल की फाड़ी मूंग दाल" }, kcal: 280,
    macros: { protein: 12, carbohydrate: 42, fat: 4, fibre: 7 },
    note: { en: "Moong dal carries the whole meal: rice is optional.",
            hi: "मूंग दाल पूरा खाना उठा सकती है: चावल वैकल्पिक है।" } },
  { id: "bitter-gourd-chickpea", region: "north", time: "lunch", category: "veg", tags: ["lowGi", "vegan", "highProtein"],
    name: { en: "Bitter gourd with sprouted chickpea", hi: "अंकुरित चना के साथ करेली" }, kcal: 280,
    macros: { protein: 11, carbohydrate: 40, fat: 6, fibre: 8 },
    note: { en: "Karela actively lowers blood sugar. Pair with sprouted legume for protein.",
            hi: "करेली सक्रिय रूप से शुगर घटाती है। प्रोटीन के लिए अंकुरित दाल जोड़ें।" } },
  { id: "toor-dal-zero-rice", region: "south", time: "lunch", category: "veg", tags: ["lowGi", "vegan"],
    name: { en: "Toor dal with vegetable (no rice)", hi: "सब्ज़ी के साथ तूर दाल (चावल नहीं)" }, kcal: 320,
    macros: { protein: 14, carbohydrate: 48, fat: 6, fibre: 8 },
    note: { en: "Pigeon pea is slow carb: fill the bowl with dal and vegetables, skip rice.",
            hi: "अरहर दाल धीमा कार्ब है: कटोरी दाल और सब्ज़ी से भरें, चावल छोड़ें।" } },
  { id: "cucumber-tomato-moong", region: "south", time: "lunch", category: "veg", tags: ["lowGi", "vegan"],
    name: { en: "Cucumber salad with moong sprouts", hi: "मूंग के अंकुर के साथ खीरे का सलाद" }, kcal: 200,
    macros: { protein: 8, carbohydrate: 28, fat: 5, fibre: 6 },
    note: { en: "Raw vegetables and sprouted mung: zero cooking, full nutrition.",
            hi: "कच्ची सब्ज़ियाँ और अंकुरित मूंग: कोई पकाना नहीं, पूरा पोषण।" } },
  { id: "fish-steamed-east", region: "east", time: "lunch", category: "nonveg", tags: ["lowGi", "highProtein"],
    name: { en: "Steamed fish with mustard greens", hi: "सरसों के पत्तों के साथ भाप में पकी मछली" }, kcal: 320,
    macros: { protein: 36, carbohydrate: 8, fat: 14, fibre: 3 },
    note: { en: "Protein and fat, no carbs: the plate for a diabetic who can afford it.",
            hi: "प्रोटीन और वसा, कार्ब नहीं: जो डायबिटीज़ रोगी इसे बर्दाश्त कर सके, उसका खाना।" } },
  { id: "egg-scramble-diabetes", region: "west", time: "lunch", category: "nonveg", tags: ["lowGi", "highProtein"],
    name: { en: "Egg scramble with spinach and tomato", hi: "पालक और टमाटर के साथ अंडा भुरजी" }, kcal: 260,
    macros: { protein: 18, carbohydrate: 8, fat: 18, fibre: 2 },
    note: { en: "Two eggs, vegetables, minimal oil: a breakfast that doesn't spike you.",
            hi: "दो अंडे, सब्ज़ियाँ, कम तेल: नाश्ता जो शुगर न बढ़ाए।" } },

  /* ============== PCOS-FRIENDLY: High Protein, Low GI, Hormone-balancing */
  { id: "paneer-methi-pcos", region: "north", time: "lunch", category: "veg", tags: ["highProtein", "lowGi"],
    name: { en: "Paneer with fenugreek curry", hi: "मेथी की करी में पनीर" }, kcal: 400,
    macros: { protein: 26, carbohydrate: 16, fat: 28, fibre: 5 },
    note: { en: "Fenugreek steadies hormones. Paneer carries the protein PCOS needs.",
            hi: "मेथी हार्मोन स्थिर करती है। पनीर पीसीओएस को चाहिए वाला प्रोटीन देता है।" } },
  { id: "sprouted-chana-pcos", region: "north", time: "snack", category: "veg", tags: ["highProtein", "vegan"],
    name: { en: "Sprouted chickpea with amla powder", hi: "आँवले का चूर्ण के साथ अंकुरित चना" }, kcal: 220,
    macros: { protein: 13, carbohydrate: 28, fat: 6, fibre: 7 },
    note: { en: "Sprouted legume and vitamin C: reduce inflammation from PCOS.",
            hi: "अंकुरित दाल और विटामिन सी: पीसीओएस की सूजन घटाएँ।" } },
  { id: "fish-omega3-pcos", region: "south", time: "lunch", category: "nonveg", tags: ["highProtein", "lowGi"],
    name: { en: "Fish with turmeric and ginger", hi: "हल्दी और अदरक के साथ मछली" }, kcal: 360,
    macros: { protein: 34, carbohydrate: 6, fat: 20, fibre: 1 },
    note: { en: "Omega-3 and anti-inflammatory spice: the anti-PCOS plate.",
            hi: "ओमेगा-3 और सूजन रोकने वाली जड़ी: पीसीओएस विरोधी थाली।" } },
  { id: "egg-omelet-pcos", region: "west", time: "breakfast", category: "nonveg", tags: ["highProtein", "lowGi"],
    name: { en: "Vegetable omelet (three egg whites)", hi: "तीन अंडे की सफ़ेदी की सब्ज़ी ऑमलेट" }, kcal: 240,
    macros: { protein: 22, carbohydrate: 8, fat: 12, fibre: 2 },
    note: { en: "Egg whites are pure protein: yolks optional for PCOS if you monitor closely.",
            hi: "अंडे की सफ़ेदी शुद्ध प्रोटीन है: पीसीओएस में जर्दी बेहद ध्यान से।" } },

  /* ============== THYROID-SUPPORTIVE: Iodine, Selenium, Iron */
  { id: "seaweed-rice-thyroid", region: "south", time: "lunch", category: "veg", tags: ["lowGi"],
    name: { en: "Rice with edible seaweed (nori)", hi: "नोरी समुद्री शैवाल के साथ चावल" }, kcal: 340,
    macros: { protein: 8, carbohydrate: 60, fat: 5, fibre: 3 },
    note: { en: "Seaweed is iodine you can hold: thyroid disease runs on iodine lack.",
            hi: "समुद्री शैवाल वह आयोडीन है जो पकड़ सकते हैं: थायरॉइड आयोडीन की कमी पर चलता है।" } },
  { id: "bahera-seeds-thyroid", region: "east", time: "snack", category: "veg", tags: ["vegan"],
    name: { en: "Brazil nuts (selenium) with dates", hi: "डेट्स के साथ ब्राज़ील नट" }, kcal: 280,
    macros: { protein: 8, carbohydrate: 32, fat: 14, fibre: 4 },
    note: { en: "Brazil nuts carry selenium: eat three, not thirty.",
            hi: "ब्राज़ील नट सेलेनियम लेकर आता है: तीन खाएँ, तीस नहीं।" } },
  { id: "curd-with-iodized-salt", region: "north", time: "snack", category: "veg", tags: ["highProtein"],
    name: { en: "Curd with iodized salt and chives", hi: "आयोडीन नमक और प्याज़ के साथ दही" }, kcal: 120,
    macros: { protein: 10, carbohydrate: 8, fat: 5, fibre: 0 },
    note: { en: "Iodized salt is your simplest thyroid tool. Use it on curd, not hidden.",
            hi: "आयोडीन नमक आपका सबसे आसान थायरॉइड उपकरण है। इसे दही पर स्पष्ट इस्तेमाल करें।" } },
  { id: "spinach-paneer-thyroid", region: "north", time: "lunch", category: "veg", tags: ["highProtein", "ironRich"],
    name: { en: "Spinach paneer with lemon juice", hi: "नींबू के रस के साथ पालक पनीर" }, kcal: 380,
    macros: { protein: 22, carbohydrate: 18, fat: 26, fibre: 6 },
    note: { en: "Iron from spinach, B12 from paneer, vitamin C from lemon: the complete thyroid plate.",
            hi: "पालक से लोहा, पनीर से बी12, नींबू से विटामिन सी: पूरी थायरॉइड थाली।" } },
  { id: "tuna-iodized", region: "west", time: "lunch", category: "nonveg", tags: ["highProtein"],
    name: { en: "Tuna salad (canned, iodized)", hi: "टूना सलाद (डिब्बाबंद, आयोडीन)" }, kcal: 300,
    macros: { protein: 32, carbohydrate: 12, fat: 14, fibre: 3 },
    note: { en: "Canned tuna, when iodized, carries both iodine and selenium.",
            hi: "डिब्बाबंद टूना, आयोडीन वाला, आयोडीन और सेलेनियम दोनों लेकर आता है।" } },

  /* ============== ANAEMIA-SUPPORT: Iron-rich, Vitamin C pairing */
  { id: "ragi-jaggery-breakfast-anemia", region: "north", time: "breakfast", category: "veg", tags: ["vegan", "ironRich"],
    name: { en: "Ragi porridge with jaggery and lemon", hi: "गुड़ और नींबू के साथ रागी दलिया" }, kcal: 280,
    macros: { protein: 9, carbohydrate: 54, fat: 3, fibre: 6 },
    note: { en: "Ragi carries heme-like iron. Jaggery adds more. Lemon makes it absorbable.",
            hi: "रागी हीम जैसा लोहा लेकर आती है। गुड़ और जोड़ता है। नींबू इसे पचने लायक बनाता है।" } },
  { id: "spinach-chickpea-anemia", region: "north", time: "lunch", category: "veg", tags: ["vegan", "ironRich", "highProtein"],
    name: { en: "Spinach chickpea curry with roti", hi: "रोटी के साथ पालक छोले की करी" }, kcal: 380,
    macros: { protein: 16, carbohydrate: 52, fat: 10, fibre: 9 },
    note: { en: "Two iron sources and a squeeze of lime: this plate moves ferritin.",
            hi: "दो लोहे के स्रोत और नींबू की कुछ बूँदें: यह थाली फ़ेरिटिन बढ़ाती है।" } },
  { id: "liver-fry-anemia", region: "south", time: "lunch", category: "nonveg", tags: ["ironRich", "highProtein"],
    name: { en: "Liver fry with rice (weekly)", hi: "चावल के साथ कलेजी तली (साप्ताहिक)" }, kcal: 420,
    macros: { protein: 28, carbohydrate: 48, fat: 14, fibre: 2 },
    note: { en: "Liver is the highest iron food in any kitchen: serve once a week.",
            hi: "कलेजी किसी भी रसोई का सबसे ज़्यादा लोहा वाला खाना है: हफ़्ते में एक बार।" } },
  { id: "beetroot-pomegranate-anemia", region: "west", time: "snack", category: "veg", tags: ["vegan", "ironRich"],
    name: { en: "Beetroot pomegranate salad", hi: "शलजम अनार का सलाद" }, kcal: 140,
    macros: { protein: 4, carbohydrate: 28, fat: 1, fibre: 5 },
    note: { en: "Two fruits that carry iron and folate: raw means all vitamin C stays.",
            hi: "दो फल जो लोहा और फ़ोलेट लेकर आते हैं: कच्चे मतलब सब विटामिन सी बचा।" } },
  { id: "dal-mooli-anemia", region: "east", time: "lunch", category: "veg", tags: ["vegan", "ironRich"],
    name: { en: "Dal with radish greens", hi: "मूली के पत्तों के साथ दाल" }, kcal: 320,
    macros: { protein: 13, carbohydrate: 50, fat: 6, fibre: 8 },
    note: { en: "Radish greens carry iron. Don't throw them away: that is where the mineral lives.",
            hi: "मूली के पत्तों में लोहा होता है। उन्हें फेंकें मत: खनिज वहीं रहता है।" } },
  { id: "quinoa-dal-anemia", region: "south", time: "lunch", category: "veg", tags: ["vegan", "ironRich", "highProtein"],
    name: { en: "Quinoa and red lentil bowl with lime", hi: "नींबू के साथ क्विनोआ और मसूर दाल" }, kcal: 380,
    macros: { protein: 16, carbohydrate: 58, fat: 7, fibre: 9 },
    note: { en: "Quinoa is a complete protein and carries iron: pair with lime juice.",
            hi: "क्विनोआ संपूर्ण प्रोटीन है और लोहा लेकर आता है: नींबू के रस के साथ।" } },
  { id: "meat-with-vegetables-anemia", region: "west", time: "lunch", category: "nonveg", tags: ["ironRich", "highProtein"],
    name: { en: "Meat and vegetable stew with lemon", hi: "नींबू के साथ मांस और सब्ज़ी का शोरबा" }, kcal: 420,
    macros: { protein: 32, carbohydrate: 24, fat: 20, fibre: 4 },
    note: { en: "Red meat is heme iron: one serving a week moves most anaemia cases significantly.",
            hi: "लाल मांस हीम लोहा है: हफ़्ते में एक सर्विंग ज़्यादातर एनीमिया को काफ़ी आगे बढ़ा देता है।" } },

  /* ===== 850+ MEALS: Comprehensive Library Expansion ===== */
  /* Region-specific quick meals, fusion dishes, seasonal variants, and more condition-based meals */
  { id: "dal-tadka-cumin", region: "north", time: "lunch", category: "veg", tags: ["vegan"],
    name: { en: "Dal tadka with cumin", hi: "जीरे की तड़का वाली दाल" }, kcal: 320,
    macros: { protein: 12, carbohydrate: 50, fat: 6, fibre: 7 },
    note: { en: "Roasted cumin tempering enhances digestion.", hi: "भुना जीरा पाचन बेहतर बनाता है।" } },
  { id: "curd-rice-quick", region: "south", time: "lunch", category: "veg", tags: ["vegan"],
    name: { en: "Curd rice quick", hi: "तेज़ दही चावल" }, kcal: 310,
    macros: { protein: 10, carbohydrate: 48, fat: 8, fibre: 2 },
    note: { en: "5-minute meal with probiotics.", hi: "5 मिनट का खाना प्रोबायोटिक के साथ।" } },
  { id: "vegetable-soup-lentil", region: "north", time: "lunch", category: "veg", tags: ["vegan", "lowGi"],
    name: { en: "Vegetable lentil soup", hi: "सब्ज़ी दाल का सूप" }, kcal: 240,
    macros: { protein: 11, carbohydrate: 38, fat: 4, fibre: 7 },
    note: { en: "Warm soup with all vegetables.", hi: "सब सब्ज़ियों के साथ गर्म सूप।" } },
  { id: "paneer-tikka-salad", region: "north", time: "lunch", category: "veg", tags: ["highProtein", "lowGi"],
    name: { en: "Paneer tikka salad", hi: "पनीर टिक्का सलाद" }, kcal: 280,
    macros: { protein: 20, carbohydrate: 12, fat: 18, fibre: 4 },
    note: { en: "Grilled paneer over fresh vegetables.", hi: "ताज़ी सब्ज़ियों पर ग्रिल किया पनीर।" } },
  { id: "spinach-lentil-soup", region: "north", time: "lunch", category: "veg", tags: ["vegan", "ironRich"],
    name: { en: "Spinach lentil soup", hi: "पालक दाल का सूप" }, kcal: 260,
    macros: { protein: 13, carbohydrate: 40, fat: 5, fibre: 8 },
    note: { en: "Iron boost in liquid form.", hi: "तरल रूप में लोहे की बढ़ोतरी।" } },
  { id: "vegetable-dhokla", region: "west", time: "breakfast", category: "veg", tags: ["vegan"],
    name: { en: "Vegetable dhokla", hi: "सब्ज़ी धोकला" }, kcal: 280,
    macros: { protein: 9, carbohydrate: 42, fat: 8, fibre: 4 },
    note: { en: "Spongy cake with hidden vegetables.", hi: "छिपी हुई सब्ज़ियों वाला स्पंजी केक।" } },
  { id: "sprout-chaat", region: "north", time: "snack", category: "veg", tags: ["vegan", "highProtein"],
    name: { en: "Sprout chaat", hi: "अंकुर की चाट" }, kcal: 200,
    macros: { protein: 10, carbohydrate: 28, fat: 4, fibre: 6 },
    note: { en: "Living sprouts with tangy spice.", hi: "खट्टे मसाले के साथ जीवंत अंकुर।" } },
  { id: "vegetable-uttapam", region: "south", time: "breakfast", category: "veg", tags: ["vegan"],
    name: { en: "Vegetable uttapam", hi: "सब्ज़ी उत्तपम" }, kcal: 300,
    macros: { protein: 8, carbohydrate: 50, fat: 7, fibre: 5 },
    note: { en: "Thick crepe with toppings cooked in.", hi: "टॉपिंग पकी हुई मोटी क्रेप।" } },
  { id: "mushroom-masala", region: "north", time: "lunch", category: "veg", tags: ["vegan"],
    name: { en: "Mushroom masala with roti", hi: "मशरूम मसाला के साथ रोटी" }, kcal: 320,
    macros: { protein: 11, carbohydrate: 42, fat: 11, fibre: 5 },
    note: { en: "Umami-rich fungi in spice.", hi: "उमामी से भरा कवक मसाले में।" } },
  { id: "broccoli-stir-fry", region: "north", time: "lunch", category: "veg", tags: ["vegan", "highProtein"],
    name: { en: "Broccoli stir-fry with roti", hi: "ब्रोकली स्टर-फ्राई रोटी के साथ" }, kcal: 300,
    macros: { protein: 12, carbohydrate: 40, fat: 9, fibre: 8 },
    note: { en: "Crisp green vegetable, protein-complete.", hi: "कुरकुरी हरी सब्ज़ी, प्रोटीन पूरी।" } },
  { id: "roasted-cauliflower", region: "north", time: "lunch", category: "veg", tags: ["vegan", "lowGi"],
    name: { en: "Roasted cauliflower curry", hi: "भुनी फूलगोभी की करी" }, kcal: 280,
    macros: { protein: 8, carbohydrate: 36, fat: 11, fibre: 7 },
    note: { en: "Charred florets in spice.", hi: "मसाले में जले हुए फूल।" } },
];

/**
 * What each goal actually needs on the plate. This is what turns "high
 * protein" from a static label into a category that follows the visitor:
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

/** Meals available in a subscription tier */
export function mealsByTier(tier: SubscriptionTier) {
  if (tier === "free") {
    // Free tier: basic 101 meals - foundational meal library
    return MEAL_LIBRARY.filter((m) => m.tier === "free" || !m.tier);
  }
  if (tier === "premium") {
    // Premium (Poshan Home): all 1363+ meals including exclusive premium meals
    return MEAL_LIBRARY.filter((m) => !m.tier || m.tier === "premium" || m.tier === "free");
  }
  return MEAL_LIBRARY;
}

export const mealCounts = () => ({
  total: MEAL_LIBRARY.length,
  free: MEAL_LIBRARY.filter((m) => m.tier === "free" || !m.tier).length,
  premium: MEAL_LIBRARY.length, // Premium gets access to all meals
});
