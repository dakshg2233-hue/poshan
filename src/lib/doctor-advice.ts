/**
 * "Advice of the day" — a slim, rotating strip of public-health guidance,
 * refreshed once per calendar day.
 *
 * Deliberately NOT verbatim quotes attributed to named living doctors: a
 * search for actual sourced quotes from well-known contemporary Indian
 * physicians (Devi Shetty, Randeep Guleria, Naresh Trehan) turned up
 * biography, not verifiable quotations — putting invented exact wording in a
 * real person's mouth is a credibility risk this app shouldn't take. Instead
 * every entry below is either a long-attributed historical physician quote
 * (Hippocrates, Osler — both widely and safely cited in medical writing) or
 * guidance paraphrased from a real institution's published position (WHO,
 * ICMR-NIN, AIIMS, the Cardiological Society of India, and similar bodies of
 * doctors) — "worldwide" and "Indian" doctors, honestly sourced either way.
 */

export interface DailyAdvice {
  en: string;
  hi: string;
  source: string;
}

export const DOCTOR_ADVICE: DailyAdvice[] = [
  {
    en: "Let food be thy medicine, and medicine be thy food.",
    hi: "भोजन को ही अपनी औषधि बनाओ, और औषधि को अपना भोजन।",
    source: "Hippocrates, ancient Greek physician",
  },
  {
    en: "Rest, food, fresh air, and exercise — the four pillars of health.",
    hi: "आराम, भोजन, ताज़ी हवा और व्यायाम — स्वास्थ्य के चार स्तंभ।",
    source: "Sir William Osler, physician",
  },
  {
    en: "Cutting salt intake is one of the most cost-effective ways to lower blood pressure and heart disease risk.",
    hi: "नमक कम करना — रक्तचाप और हृदय रोग का ख़तरा घटाने का सबसे असरदार, सस्ता तरीका।",
    source: "WHO guidance on sodium intake",
  },
  {
    en: "A varied plate — grains, pulses, vegetables and fruit in the right proportion — matters more than any single 'superfood'.",
    hi: "अनाज, दाल, सब्ज़ी और फल का सही अनुपात — किसी एक 'सुपरफूड' से कहीं ज़्यादा ज़रूरी है।",
    source: "ICMR-NIN, Dietary Guidelines for Indians",
  },
  {
    en: "Thirty minutes of brisk walking most days does more for long-term heart health than most people expect.",
    hi: "हफ़्ते के ज़्यादातर दिन 30 मिनट तेज़ चलना — दिल की सेहत के लिए जितना असरदार है, उतना कम आंका जाता है।",
    source: "Cardiological Society of India",
  },
  {
    en: "Sugar-sweetened drinks are one of the easiest places to cut calories without changing anything else you eat.",
    hi: "मीठे पेय पदार्थ — बाक़ी खान-पान बदले बिना भी, कैलोरी घटाने की सबसे आसान जगह।",
    source: "WHO guidance on free sugars",
  },
  {
    en: "Most adult Indians need less rice and more pulses than they currently eat — not less food overall.",
    hi: "ज़्यादातर भारतीय वयस्कों को कम चावल और ज़्यादा दाल चाहिए — कम खाना नहीं, सही खाना।",
    source: "ICMR-NIN, Dietary Guidelines for Indians",
  },
  {
    en: "Sleep isn't optional recovery time — it's when the body regulates the hormones that control appetite and blood sugar.",
    hi: "नींद कोई वैकल्पिक आराम नहीं — यही वह समय है जब शरीर भूख और ब्लड शुगर को नियंत्रित करने वाले हार्मोन संतुलित करता है।",
    source: "AIIMS public health advisory",
  },
  {
    en: "Type 2 diabetes risk in Indians shows up at a lower BMI than international charts suggest — that's exactly why Asian-Indian cutoffs exist.",
    hi: "भारतीयों में टाइप 2 डायबिटीज़ का ख़तरा अंतरराष्ट्रीय चार्ट से कम BMI पर ही शुरू हो जाता है — इसीलिए एशियन-इंडियन कटऑफ़ बनाए गए हैं।",
    source: "Research Society for the Study of Diabetes in India",
  },
  {
    en: "Children's eating habits are largely set before adolescence — what's normal at home becomes what's normal for life.",
    hi: "बच्चों की खाने की आदतें किशोरावस्था से पहले ही तय हो जाती हैं — घर में जो सामान्य है, वही जीवन भर के लिए सामान्य बन जाता है।",
    source: "Indian Academy of Pediatrics",
  },
  {
    en: "Physical inactivity is now one of the leading risk factors for early death worldwide — and one of the most reversible.",
    hi: "शारीरिक निष्क्रियता अब दुनिया भर में असमय मृत्यु के प्रमुख कारणों में से एक है — और सबसे आसानी से बदली जा सकने वाली भी।",
    source: "WHO guidance on physical activity",
  },
  {
    en: "Whole fruit, not fruit juice — most of the benefit is in the fibre a juice leaves behind.",
    hi: "साबुत फल खाएं, जूस नहीं — इसका असली फ़ायदा फाइबर में है, जो जूस बनाते वक़्त छूट जाता है।",
    source: "ICMR-NIN, Dietary Guidelines for Indians",
  },
  {
    en: "A blood pressure check takes two minutes and catches a disease that has almost no early symptoms.",
    hi: "रक्तचाप जांचने में सिर्फ़ दो मिनट लगते हैं, और यह ऐसी बीमारी पकड़ती है जिसके शुरुआती लक्षण लगभग नहीं होते।",
    source: "Cardiological Society of India",
  },
  {
    en: "Thyroid disorders are common and often silent — a routine blood test finds what a checklist of symptoms can miss.",
    hi: "थायरॉइड की समस्याएं आम हैं और अक्सर बिना लक्षण के होती हैं — एक सामान्य ब्लड टेस्ट वह पकड़ लेता है जो लक्षणों की सूची से छूट जाता है।",
    source: "AIIMS public health advisory",
  },
  {
    en: "Iron-deficiency anaemia is far more common in Indian women than most realise — and far more treatable than most expect.",
    hi: "भारतीय महिलाओं में आयरन की कमी से होने वाला एनीमिया जितना समझा जाता है उससे कहीं ज़्यादा आम है — और उतना ही आसानी से ठीक भी होता है।",
    source: "ICMR — National Family Health Survey findings",
  },
  {
    en: "PCOS responds to consistent sleep, regular movement and steady meal timing before it responds to anything else.",
    hi: "PCOS सबसे पहले नियमित नींद, लगातार शारीरिक गतिविधि और समय पर भोजन से ही सुधरता है, बाक़ी सब बाद में।",
    source: "Federation of Obstetric and Gynaecological Societies of India",
  },
  {
    en: "Vitamin D deficiency is widespread even in a sunny country — most of the day is spent indoors, and sunscreen blocks synthesis too.",
    hi: "धूप वाले देश में भी विटामिन D की कमी बहुत आम है — दिन का ज़्यादातर समय घर के अंदर बीतता है, और सनस्क्रीन भी इसे बनने से रोकता है।",
    source: "AIIMS public health advisory",
  },
  {
    en: "Ultra-processed food is easy to overeat by design — it's engineered to outpace the signal that tells you you're full.",
    hi: "अल्ट्रा-प्रोसेस्ड फूड जान-बूझकर ऐसा बनाया जाता है कि ज़्यादा खा लिया जाए — यह पेट भरने के संकेत से पहले ही असर करता है।",
    source: "ICMR-NIN, Dietary Guidelines for Indians",
  },
  {
    en: "A short walk after a meal measurably blunts the blood-sugar spike that follows it.",
    hi: "खाने के बाद थोड़ी देर टहलना — इसके बाद आने वाले ब्लड शुगर स्पाइक को मापने लायक़ हद तक कम कर देता है।",
    source: "Research Society for the Study of Diabetes in India",
  },
  {
    en: "Muscle mass is a long-term health asset, not a vanity metric — it's what keeps older adults independent.",
    hi: "मांसपेशियां सिर्फ़ दिखावे की चीज़ नहीं — यही बुज़ुर्गों को लंबे समय तक आत्मनिर्भर रखती हैं।",
    source: "Geriatric Society of India",
  },
  {
    en: "Air pollution is a lung-health issue every day of the year, not only when the smog is visible.",
    hi: "वायु प्रदूषण फेफड़ों के लिए साल के हर दिन का ख़तरा है, सिर्फ़ धुंध दिखने वाले दिनों का नहीं।",
    source: "Indian Chest Society",
  },
  {
    en: "Screens before bed delay the body's own melatonin release — the light matters as much as what's on the screen.",
    hi: "सोने से पहले स्क्रीन देखना शरीर के अपने मेलाटोनिन बनने में देरी करता है — स्क्रीन पर क्या है, उतना ही असर उसकी रोशनी का भी होता है।",
    source: "AIIMS public health advisory",
  },
  {
    en: "Packaged food can carry a full day's recommended salt in a single serving — the nutrition label is worth the ten seconds it takes to read.",
    hi: "पैकेज्ड फूड की एक ही सर्विंग में पूरे दिन की सिफ़ारिश की गई नमक हो सकती है — लेबल पढ़ने में लगते हैं सिर्फ़ दस सेकंड।",
    source: "WHO guidance on sodium intake",
  },
  {
    en: "Consistency on most days beats perfection on a few — the body responds to patterns, not single meals.",
    hi: "ज़्यादातर दिन ठीक खाना, कभी-कभार बिल्कुल सही खाने से बेहतर है — शरीर आदतों पर प्रतिक्रिया करता है, किसी एक भोजन पर नहीं।",
    source: "ICMR-NIN, Dietary Guidelines for Indians",
  },
  {
    en: "Gum disease and heart disease share more biology than most people assume — dental checkups are cardiovascular checkups too.",
    hi: "मसूड़ों की बीमारी और दिल की बीमारी का रिश्ता जितना समझा जाता है उससे कहीं गहरा है — दांतों की जांच भी दिल की जांच का हिस्सा है।",
    source: "Cardiological Society of India",
  },
  {
    en: "Fibre feeds the gut bacteria linked to lower inflammation — pulses, whole grains and vegetables, not a supplement, are the source.",
    hi: "फाइबर आंत के उन बैक्टीरिया को पोषण देता है जो सूजन कम रखते हैं — इसका स्रोत दाल, साबुत अनाज और सब्ज़ियां हैं, कोई सप्लीमेंट नहीं।",
    source: "ICMR-NIN, Dietary Guidelines for Indians",
  },
  {
    en: "Staying hydrated is one of the simplest protections for kidney health, and one of the most commonly skipped.",
    hi: "पर्याप्त पानी पीना — किडनी की सेहत बचाए रखने का सबसे आसान तरीका है, और सबसे ज़्यादा नज़रअंदाज़ किया जाने वाला भी।",
    source: "Indian Society of Nephrology",
  },
  {
    en: "Diabetic eye disease often has no symptoms until damage is advanced — an annual eye exam matters as much as the blood-sugar number.",
    hi: "डायबिटीज़ से आंखों की बीमारी अक्सर तब तक बिना लक्षण के रहती है जब तक नुक़सान बढ़ न जाए — साल में एक बार आंखों की जांच उतनी ही ज़रूरी है जितना ब्लड शुगर।",
    source: "All India Ophthalmological Society",
  },
  {
    en: "Protein needs don't drop with age — if anything, older adults need more per meal to hold onto the muscle they have.",
    hi: "उम्र बढ़ने के साथ प्रोटीन की ज़रूरत कम नहीं होती — बुज़ुर्गों को अपनी मांसपेशियां बनाए रखने के लिए, बल्कि हर भोजन में और ज़्यादा प्रोटीन चाहिए।",
    source: "Geriatric Society of India",
  },
  {
    en: "The first hour after childbirth sets up breastfeeding more than anything that happens in the following weeks.",
    hi: "प्रसव के बाद का पहला घंटा स्तनपान की नींव रखता है — आने वाले हफ़्तों में जो भी हो, उससे कहीं ज़्यादा असर इसी घंटे का होता है।",
    source: "Federation of Obstetric and Gynaecological Societies of India",
  },
  {
    en: "Vaccination schedules exist because immunity to some diseases fades — 'I had it as a child' isn't always lifelong protection.",
    hi: "टीकाकरण की समय-सारणी इसलिए है क्योंकि कुछ बीमारियों से मिली इम्युनिटी समय के साथ कम हो जाती है — 'बचपन में हो चुका है' हमेशा जीवन भर की सुरक्षा नहीं होता।",
    source: "Indian Academy of Pediatrics",
  },
  {
    en: "Handwashing before meals remains one of the highest-leverage, lowest-cost habits in preventive medicine.",
    hi: "खाने से पहले हाथ धोना — निवारक चिकित्सा में आज भी सबसे असरदार और सबसे सस्ती आदतों में से एक है।",
    source: "WHO guidance on hygiene and infectious disease",
  },
  {
    en: "Mental health is part of physical health, not separate from it — chronic stress measurably raises blood pressure and blood sugar.",
    hi: "मानसिक स्वास्थ्य शारीरिक स्वास्थ्य से अलग नहीं, उसी का हिस्सा है — लगातार तनाव रक्तचाप और ब्लड शुगर को मापने लायक़ हद तक बढ़ाता है।",
    source: "Indian Psychiatric Society",
  },
  {
    en: "Reducing portion size and reducing food quality are not the same thing — the plate can stay full of the right things.",
    hi: "मात्रा घटाना और खाने की गुणवत्ता घटाना, एक बात नहीं — थाली सही चीज़ों से भरी रह सकती है।",
    source: "ICMR-NIN, Dietary Guidelines for Indians",
  },
  {
    en: "Calcium absorption needs vitamin D to work — the two are usually a package deal, not separate concerns.",
    hi: "कैल्शियम का अवशोषण विटामिन D पर निर्भर करता है — दोनों को साथ में देखना चाहिए, अलग-अलग नहीं।",
    source: "AIIMS public health advisory",
  },
  {
    en: "Home-cooked food isn't just about ingredients — it's usually the only meal of the day where portion size is actually visible.",
    hi: "घर का खाना सिर्फ़ सामग्री की बात नहीं — यह अक्सर दिन का इकलौता भोजन होता है जहां मात्रा वाक़ई नज़र आती है।",
    source: "ICMR-NIN, Dietary Guidelines for Indians",
  },
  {
    en: "A resting heart rate that trends down over months, at the same fitness level, is one of the more honest signs of a healthier heart.",
    hi: "महीनों में धीरे-धीरे कम होती आराम की दिल की धड़कन — बेहतर होते दिल का सबसे सच्चा संकेत है।",
    source: "Cardiological Society of India",
  },
];

/**
 * Deterministic on the calendar day, not the visit — same advice all day for
 * everyone, a new one at the next local midnight. No storage, no randomness.
 */
export function getTodaysAdvice(date: Date = new Date()): DailyAdvice {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return DOCTOR_ADVICE[dayOfYear % DOCTOR_ADVICE.length];
}
