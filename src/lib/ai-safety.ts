/**
 * The safety check that runs *after* the model has spoken.
 *
 * /api/chat's system prompts already carry strong rules — never diagnose,
 * never touch a medication dose, never read a lab value as a verdict. Those
 * rules are well written and the model follows them nearly always. But a
 * system prompt is a request, not a gate: "nearly always" is a probability,
 * and the rest of this codebase does not leave clinical safety to a
 * probability. conditions.ts#checkMealAll is a hard gate on every meal
 * plan; daily-engine.ts is rule-based specifically so its output can't
 * drift. Chat was the one path where an LLM's own compliance was the only
 * thing standing between a user and a medication instruction.
 *
 * This closes that. Generation happens, then this inspects the result, and
 * anything that reads as diagnosis, dosing or lab interpretation is
 * replaced with the redirect the system prompt asked for in the first
 * place. The model is the interface. It is not the medical authority.
 *
 * Deliberately conservative about false positives: a nutrition answer that
 * gets unnecessarily redirected to "ask your doctor" costs the user one
 * follow-up question. A dosing instruction that gets through costs
 * something that cannot be undone.
 */

export type SafetyVerdict =
  | { safe: true }
  | { safe: false; category: SafetyCategory; matched: string };

export type SafetyCategory = "dosing" | "diagnosis" | "lab_verdict" | "emergency";

/* ---------------------------------------------------------------- dosing
   Any instruction to start, stop, change or take a specific amount of a
   drug. The unit list is what Indian prescriptions actually use. Common
   drug names are included because "take 500 of it twice daily" is caught
   by the dose pattern, but "you can double your metformin" is not. */
const DRUG_NAMES =
  "metformin|insulin|glimepiride|sitagliptin|empagliflozin|atorvastatin|rosuvastatin|statin|" +
  "amlodipine|telmisartan|losartan|ramipril|thyroxine|levothyroxine|eltroxin|" +
  "aspirin|warfarin|clopidogrel|omeprazole|pantoprazole|prednisolone|steroid";

const DOSING_PATTERNS: RegExp[] = [
  /\b\d+\s?(mg|mcg|ml|iu|units?|tablets?|tabs?|capsules?)\b/i,
  new RegExp(`\\b(start|stop|increase|decrease|double|halve|reduce|raise|skip|discontinue)\\b[^.]{0,40}\\b(${DRUG_NAMES})\\b`, "i"),
  new RegExp(`\\b(${DRUG_NAMES})\\b[^.]{0,40}\\b(twice|thrice|once|daily|bd|od|tds|before meals|after meals)\\b`, "i"),
  /\byou (should|can|could|may) (take|stop|start|increase|reduce)\b[^.]{0,30}\b(medicine|medication|tablet|dose|drug)\b/i,
];

/* ------------------------------------------------------------- diagnosis
   Telling someone what they have. "You have diabetes" is a diagnosis;
   "diabetes is a condition where…" is education, and the possessive
   framing is what separates them. */
const DIAGNOSIS_PATTERNS: RegExp[] = [
  /\byou (have|are having|are suffering from|have got|are)\b[^.]{0,30}\b(diabetes|diabetic|prediabetic|pcos|pcod|hypertension|hypertensive|anaemia|anemia|anaemic|ckd|kidney disease|fatty liver|thyroid|hypothyroid|hyperthyroid|cancer)\b/i,
  /\b(this|that|it) (means|indicates|confirms|suggests) (you|your)\b[^.]{0,30}\b(have|has|are)\b/i,
  /\byou (are|have been) diagnosed\b/i,
  /\b(you|your \w+) (is|are) (definitely|clearly|certainly)\b[^.]{0,25}\b(diabetic|anaemic|hypertensive|abnormal)\b/i,
];

/* ----------------------------------------------------------- lab verdict
   Reading a number as a conclusion. Poshan's own Health Companion prompt
   forbids this explicitly; this is the enforcement. Note the deliberate
   gap: stating a reference range ("the normal range is 4–5.6%") is fine
   and is not matched — it's the *judgment about the user's own value*
   that's gated. */
const LAB_VERDICT_PATTERNS: RegExp[] = [
  /\byour\b[^.]{0,25}\b(hba1c|a1c|sugar|glucose|creatinine|egfr|haemoglobin|hemoglobin|ldl|hdl|cholesterol|triglycerides|tsh|vitamin d|b12|ferritin)\b[^.]{0,40}\b(is|are|looks?|seems?|indicates?)\b[^.]{0,30}\b(dangerous|alarming|critical|severe|fine|normal|healthy|nothing to worry|no cause for concern|not a concern)\b/i,
  /\b(don'?t|do not|no need to) worry\b[^.]{0,40}\b(hba1c|sugar|glucose|creatinine|egfr|cholesterol|ldl|reading|result|value|level)\b/i,
  /\byour (results?|reports?|values?|levels?|numbers?) (are|look|seem)\b[^.]{0,20}\b(fine|normal|good|healthy|okay|ok|bad|dangerous|concerning)\b/i,
];

/* ------------------------------------------------------------- emergency
   Not a rule violation — the opposite. If the conversation contains signs
   of an acute event, no nutrition answer is the right answer, and the
   redirect is more urgent than the one for the other categories. */
const EMERGENCY_PATTERNS: RegExp[] = [
  /\b(chest pain|crushing chest|can'?t breathe|cannot breathe|breathless at rest|unconscious|fainted|passed out|seizure|fitting)\b/i,
  /* `blood in my stool` is how a person writes this; `blood in stool` is
     how a textbook does. The possessive was missing and the textbook
     phrasing was the only one matched. */
  /\b(blood in (my |the )?(stool|vomit|urine)|vomiting blood|coughing blood)\b/i,
  /\b(sugar|glucose)\b[^.]{0,20}\b(below 50|under 50|40 mg|30 mg)\b/i,
  /* The -ing forms matter more here than anywhere else in this file.
     "thoughts of harming myself" is the commonest way someone raises this
     and it did not match `harm myself`; of every false negative in this
     module that is the one with the worst consequence, so the verbs are
     deliberately over-inclusive. A nutrition question wrongly answered
     with the Tele-MANAS number costs a follow-up; the reverse does not
     have a price worth naming. */
  /\b(suicidal|kill(ing)? myself|end(ing)? my life|harm(ing)? myself|hurt(ing)? myself|self.harm)\b/i,
];

const CATEGORIES: { category: SafetyCategory; patterns: RegExp[] }[] = [
  { category: "emergency", patterns: EMERGENCY_PATTERNS },
  { category: "dosing", patterns: DOSING_PATTERNS },
  { category: "diagnosis", patterns: DIAGNOSIS_PATTERNS },
  { category: "lab_verdict", patterns: LAB_VERDICT_PATTERNS },
];

/**
 * What Poshan says instead. Each one names the boundary rather than
 * refusing blankly — a user told only "I can't help with that" will ask
 * the same question somewhere with fewer scruples.
 */
export const SAFE_REPLACEMENT: Record<SafetyCategory, { en: string; hi: string }> = {
  emergency: {
    en: "What you've described needs medical attention now, not a nutrition answer. Please contact a doctor or your nearest emergency department straight away. In India you can call 108 for an ambulance, or 112 for emergency services. If this is about thoughts of harming yourself, Tele-MANAS is available free on 14416, any time.",
    hi: "आपने जो बताया है उसके लिए अभी चिकित्सकीय सहायता चाहिए, पोषण संबंधी सलाह नहीं। कृपया तुरंत डॉक्टर या नज़दीकी आपातकालीन विभाग से संपर्क करें। भारत में एम्बुलेंस के लिए 108, आपातकालीन सेवाओं के लिए 112। यदि यह स्वयं को नुकसान पहुँचाने के विचारों के बारे में है, तो टेली-मानस 14416 पर निःशुल्क उपलब्ध है, किसी भी समय।",
  },
  dosing: {
    en: "I can't advise on medication — starting, stopping or changing a dose is your doctor's call, and getting it wrong from an app is genuinely dangerous. I can help with the food side of the same question, though: tell me what you're trying to manage and I'll work with that.",
    hi: "मैं दवा के बारे में सलाह नहीं दे सकता — कोई दवा शुरू करना, बंद करना या मात्रा बदलना आपके डॉक्टर का निर्णय है, और ऐप से यह ग़लत होना वाक़ई ख़तरनाक है। लेकिन उसी सवाल के भोजन वाले पक्ष में मैं मदद कर सकता हूँ: बताइए आप क्या संभालना चाह रहे हैं।",
  },
  diagnosis: {
    en: "I'm not able to tell you what you have — that needs a doctor who can examine you and see your full history. What I can do is explain what a condition involves and what eating for it looks like, if that's useful.",
    hi: "मैं यह नहीं बता सकता कि आपको क्या है — इसके लिए डॉक्टर चाहिए जो आपकी जाँच कर सकें और पूरा इतिहास देख सकें। हाँ, कोई स्थिति क्या होती है और उसमें कैसा खानपान होता है, यह मैं समझा सकता हूँ।",
  },
  lab_verdict: {
    en: "I'd rather not read your results as good or bad — that judgment belongs with the doctor who ordered them and knows the rest of your picture. What I can tell you is what a marker measures and which foods affect it. Want me to do that instead?",
    hi: "मैं आपकी रिपोर्ट को अच्छा या बुरा कहना नहीं चाहूँगा — वह निर्णय उस डॉक्टर का है जिन्होंने जाँच कराई और आपकी पूरी स्थिति जानते हैं। हाँ, कोई मार्कर क्या मापता है और कौन-से भोजन उसे प्रभावित करते हैं, यह बता सकता हूँ।",
  },
};

/** Inspect generated text. Emergency wins, then dosing, then the rest. */
export function checkAiSafety(text: string): SafetyVerdict {
  for (const { category, patterns } of CATEGORIES) {
    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) return { safe: false, category, matched: match[0] };
    }
  }
  return { safe: true };
}

/**
 * The whole gate in one call: returns what should actually be sent.
 *
 * `userMessage` is scanned too, and only for the emergency patterns — if
 * someone opens with "I have chest pain", the right response does not
 * depend on what the model happened to reply. The other three categories
 * are checked on output only: a user is allowed to *ask* about their
 * metformin, they just can't be *told* what to do about it.
 */
export function gateAiReply(
  reply: string,
  userMessage: string,
  lang: "en" | "hi" = "en"
): { text: string; gated: SafetyCategory | null } {
  for (const pattern of EMERGENCY_PATTERNS) {
    if (pattern.test(userMessage)) {
      return { text: SAFE_REPLACEMENT.emergency[lang], gated: "emergency" };
    }
  }

  const verdict = checkAiSafety(reply);
  if (verdict.safe) return { text: reply, gated: null };

  return { text: SAFE_REPLACEMENT[verdict.category][lang], gated: verdict.category };
}
