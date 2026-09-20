import type { Bi } from "./poshan-data";

/**
 * The Digital Personal Data Protection Act, 2023, as this codebase has to
 * live with it.
 *
 * One module rather than constants scattered through the routes that need
 * them, because almost every value here is one that must match something
 * else exactly: the notice version stored in a consent row has to be the
 * version of the words actually shown, the purpose strings have to match
 * the CHECK constraint in the migration, and the age threshold has to be
 * the same number in the UI gate and the server gate. Two copies of any of
 * those is a compliance bug waiting for the day they disagree.
 *
 * None of this is legal advice and none of it should be read as a claim
 * that Poshan is compliant. It is the machinery compliance needs.
 */

/**
 * Bump this whenever the *words* of the consent notice change in a way
 * that would alter what a reasonable person understood themselves to be
 * agreeing to. Fixing a typo does not count; adding a processor, a purpose
 * or a category of data does.
 *
 * Old rows keep their old version, which is the point — it is how you
 * answer "what were they actually told?" two years after the fact.
 */
export const NOTICE_VERSION = "2026-09-20.1";

/**
 * The purposes consent is recorded against. These strings are duplicated
 * in the CHECK constraint on consent_records.purpose; changing one without
 * the other fails at write time, which is the correct place to find out.
 */
export const CONSENT_PURPOSES = [
  "account_and_health_data",
  "analytics_cookies",
  "clinician_sharing",
  "family_member_data",
  "marketing_email",
] as const;

export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];

export function isConsentPurpose(v: unknown): v is ConsentPurpose {
  return typeof v === "string" && (CONSENT_PURPOSES as readonly string[]).includes(v);
}

/** s.9 applies below this age. Not a tunable — it is the statute. */
export const MINOR_AGE = 18;

/**
 * The itemised notice required by s.5, as data rather than as prose in a
 * component.
 *
 * s.5(1) wants the categories of personal data and the purpose of each;
 * s.5(2) wants the manner of exercising rights and of complaining to the
 * Board; s.5(3) wants all of it available in English or any of the
 * twenty-two Eighth Schedule languages. Poshan already carries Hindi
 * throughout, so the notice is bilingual for the same reason the rest of
 * the app is: the people most likely to be reading carefully are not
 * necessarily reading in English.
 */
export type NoticeItem = {
  what: Bi;
  why: Bi;
};

export const NOTICE_ITEMS: NoticeItem[] = [
  {
    what: { en: "Your email address", hi: "आपका ईमेल पता" },
    why: {
      en: "To sign you in. It is the only way we identify your account.",
      hi: "आपको साइन इन करने के लिए। आपका खाता पहचानने का यही एक तरीका है।",
    },
  },
  {
    what: {
      en: "Height, weight, age, sex, activity level",
      hi: "कद, वज़न, उम्र, लिंग, गतिविधि स्तर",
    },
    why: {
      en: "To calculate your energy and protein needs. Without these the plan is a guess.",
      hi: "आपकी ऊर्जा और प्रोटीन ज़रूरत निकालने के लिए। इनके बिना योजना सिर्फ़ अनुमान है।",
    },
  },
  {
    what: {
      en: "Health conditions and biomarker readings",
      hi: "स्वास्थ्य स्थितियाँ और बायोमार्कर रीडिंग",
    },
    why: {
      en: "To adjust your plan for your condition, and to show your own trend over time. Nothing else.",
      hi: "आपकी स्थिति के अनुसार योजना बदलने और समय के साथ आपका रुझान दिखाने के लिए। और कुछ नहीं।",
    },
  },
  {
    what: { en: "Meals you log and plates you scan", hi: "आपके दर्ज भोजन और स्कैन की गई थालियाँ" },
    why: {
      en: "To track the day against your targets. Photographs are discarded after the dishes are identified — the image is never stored.",
      hi: "दिन को आपके लक्ष्य के विरुद्ध देखने के लिए। व्यंजन पहचानने के बाद तस्वीर हटा दी जाती है — छवि कभी संग्रहीत नहीं होती।",
    },
  },
  {
    what: { en: "Payment records, if you subscribe", hi: "भुगतान रिकॉर्ड, यदि आप सदस्यता लेते हैं" },
    why: {
      en: "To keep your subscription active. Card details go straight to Razorpay — we never see or store them.",
      hi: "आपकी सदस्यता सक्रिय रखने के लिए। कार्ड विवरण सीधे Razorpay को जाता है — हम उसे कभी नहीं देखते या रखते।",
    },
  },
];

/**
 * Who your data reaches, and where they are.
 *
 * s.16 currently permits transfer outside India except to countries the
 * Central Government restricts by notification, so this is a disclosure
 * obligation rather than a prohibition — but it is only a disclosure if
 * someone can actually read it, which is why location is stated per
 * processor rather than as a footnote saying "we may use global vendors".
 */
export type Processor = {
  name: string;
  does: Bi;
  where: Bi;
};

export const PROCESSORS: Processor[] = [
  {
    name: "Supabase",
    does: { en: "Database, sign-in and file storage", hi: "डेटाबेस, साइन-इन और फ़ाइल भंडारण" },
    where: { en: "Outside India", hi: "भारत के बाहर" },
  },
  {
    name: "Anthropic",
    does: {
      en: "Powers Ask Poshan and Health Companion. Your message and any conditions you have selected are sent to generate a reply.",
      hi: "Ask Poshan और Health Companion चलाता है। उत्तर बनाने के लिए आपका संदेश और चुनी गई स्थितियाँ भेजी जाती हैं।",
    },
    where: { en: "United States", hi: "संयुक्त राज्य अमेरिका" },
  },
  {
    name: "OpenAI",
    does: {
      en: "Identifies dishes in a scanned plate photograph",
      hi: "स्कैन की गई थाली की तस्वीर में व्यंजन पहचानता है",
    },
    where: { en: "United States", hi: "संयुक्त राज्य अमेरिका" },
  },
  {
    name: "Razorpay",
    does: { en: "Payments", hi: "भुगतान" },
    where: { en: "India", hi: "भारत" },
  },
  {
    name: "Resend",
    does: {
      en: "Sends clinic enquiry notifications and guardian-consent emails",
      hi: "क्लिनिक पूछताछ सूचनाएँ और अभिभावक-सहमति ईमेल भेजता है",
    },
    where: { en: "United States", hi: "संयुक्त राज्य अमेरिका" },
  },
];

/**
 * Age from a date of birth, in whole years.
 *
 * Written out rather than pulled from a date library because this is the
 * calculation an age gate turns on, and "today minus birthday, divided by
 * 365.25" is wrong for anyone born on 29 February and wrong by a day for
 * a great many more. Comparing month and day directly is not clever, and
 * it does not need to be.
 */
export function ageFromDob(dob: string | Date, now: Date = new Date()): number | null {
  const d = typeof dob === "string" ? new Date(dob) : dob;
  if (Number.isNaN(d.getTime())) return null;

  let years = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) years--;

  /* A date of birth in the future is a typo, not a negative age. */
  if (years < 0) return null;
  return years;
}

/**
 * Is this person a child under s.9?
 *
 * Mirrors the SQL is_minor(): null means "we do not know", and a caller
 * must handle that explicitly rather than letting an unknown collapse into
 * a permissive false. The two implementations exist because the gate has
 * to hold in the browser (to not show a child a tracking feature) and in
 * the database (to not let a crafted request past the browser), and
 * neither can be the single source for the other.
 */
export function isMinor(input: {
  dateOfBirth?: string | null;
  age?: number | null;
}): boolean | null {
  if (input.dateOfBirth) {
    const years = ageFromDob(input.dateOfBirth);
    if (years !== null) return years < MINOR_AGE;
  }
  if (typeof input.age === "number" && Number.isFinite(input.age)) {
    return input.age < MINOR_AGE;
  }
  return null;
}

/**
 * Features s.9(3) forbids for children: tracking, behavioural monitoring,
 * and targeted advertising.
 *
 * Streaks, badges and the leaderboard are behavioural monitoring by any
 * reading — they exist specifically to observe and shape repeat behaviour.
 * Analytics is tracking. Both are switched off for a minor regardless of
 * what the account's own preference says, because s.9(3) is not a
 * preference and a child cannot consent their way out of it.
 *
 * Returns true when the feature must be withheld. Unknown age is treated
 * as a minor here — the one place in this file where unknown fails to the
 * restrictive side, because showing a tracking feature to a child is the
 * harm the section exists to prevent.
 */
export function mustWithholdTracking(input: {
  dateOfBirth?: string | null;
  age?: number | null;
}): boolean {
  const minor = isMinor(input);
  return minor === null ? true : minor;
}
