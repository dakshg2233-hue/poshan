import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ, Poshan",
  description:
    "Answers on Asian-Indian BMI cutoffs, the food scanner, Poshan Home pricing, and how your health data is handled.",
};

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is Poshan?",
    a: "A nutrition tool built for Indian bodies and Indian kitchens. It reads your Body Mass Index against Asian-Indian cutoffs, then turns that into a thali: quantities of dal, roti, sabzi, dahi, rice and chutney sized to you, drawn from a library of over 1,100 home-cooked meals.",
  },
  {
    q: "Why does Poshan use different BMI cutoffs?",
    a: "Indians develop insulin resistance and carry visceral fat at a lower Body Mass Index than the WHO's general cutoffs assume. The Indian Council of Medical Research and the WHO's own Asia-Pacific thresholds account for this: 23 already counts as overweight, and 25 as obese, well below the 25/30 most fitness apps still use.",
  },
  {
    q: "Do I need an account to use it?",
    a: "No. Your height, weight, goal, diet and region stay in your browser's local storage and are never sent to us unless you sign in. Creating an account only exists to sync your plan, biomarkers and conditions across devices.",
  },
  {
    q: "What does the food scanner do?",
    a: "Point your camera at a plate or a packaged label and Poshan matches it against the meal library to estimate what's on it, so it can be checked against your health conditions and added to your log. Like any photo-based estimate, it will occasionally get a dish wrong — treat the read as a starting point, not a lab result.",
  },
  {
    q: "How does Poshan know a food is safe for my condition?",
    a: "Pick your conditions under Biomarkers, and every meal in the library is checked against condition-specific rules — sodium for blood pressure, glycaemic load for diabetes, potassium for kidney disease, and so on — and marked good, careful, or avoid, with the reason shown, not just a colour.",
  },
  {
    q: "What's in Poshan Home?",
    a: "Poshan Home is ₹299 a month (₹2,499 a year). It unfolds the full meal library instead of a preview, personalises macros to your goal, and adds the clinic-facing tools. The BMI tool, your thali, and the condition checker are free without it.",
  },
  {
    q: "Is my health data safe?",
    a: "Health conditions and biomarkers are sensitive personal data, and are stored only so your plan persists across your devices. Every table is protected by row-level security, so a query can only ever return rows belonging to your own signed-in account. We don't sell it and don't share it with advertisers. Full detail is in the Privacy policy.",
  },
  {
    q: "Is this medical advice?",
    a: "No. Poshan gives general nutrition information based on published BMI cutoffs and food-safety rules. It doesn't diagnose or treat anything. If you're pregnant, managing a diagnosed condition, or on prescribed medication, talk to your doctor before changing what you eat.",
  },
  {
    q: "How do I cancel Poshan Home or delete my data?",
    a: "Cancel any time from your account — you keep access until the period you already paid for ends. To delete your account and everything attached to it, write to the address on the Privacy page and we'll action it.",
  },
];

/**
 * Same principle as /privacy and /terms: every answer here is a fact this
 * codebase already states elsewhere (BMI cutoffs in sections.tsx, pricing in
 * poshan-data.ts's PREMIUM, storage claims in the privacy page) rather than
 * boilerplate FAQ copy, so this page can't drift into promising something the
 * product doesn't do.
 */
export default function Faq() {
  return (
    <main className="mx-auto w-[min(72ch,100%-2.5rem)] py-16" style={{ color: "var(--ink)" }}>
      <Link href="/" className="text-[0.85rem] no-underline" style={{ color: "var(--kesar)" }}>
        ← Poshan
      </Link>
      <h1 className="mt-6 text-[2.4rem]" style={{ fontFamily: "var(--font-display)" }}>
        Frequently asked
      </h1>
      <p className="mt-2 text-[0.95rem]" style={{ color: "var(--ink-soft)" }}>
        On the BMI cutoffs, the scanner, pricing, and your data. For the legal detail, see{" "}
        <Link href="/privacy" style={{ color: "var(--kesar)" }}>Privacy</Link>
        {" "}and{" "}
        <Link href="/terms" style={{ color: "var(--kesar)" }}>Terms</Link>.
      </p>

      <section className="mt-10 grid">
        {FAQS.map((item, i) => (
          <details
            key={item.q}
            className="group py-5"
            style={{ borderTop: i === 0 ? "1px solid var(--line)" : undefined, borderBottom: "1px solid var(--line)" }}
          >
            <summary
              className="flex items-center justify-between gap-4 cursor-pointer list-none text-[1.05rem] font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {item.q}
              <span
                aria-hidden
                className="shrink-0 text-[1.3rem] leading-none transition-transform duration-300 motion-reduce:transition-none group-open:rotate-45"
                style={{ color: "var(--kesar)", transitionTimingFunction: "var(--ease)" }}
              >
                +
              </span>
            </summary>
            <p className="mt-3 text-[0.95rem] leading-relaxed max-w-[62ch]" style={{ color: "var(--ink-soft)" }}>
              {item.a}
            </p>
          </details>
        ))}
      </section>

      <p className="mt-10 text-[0.85rem]" style={{ color: "var(--ink-soft)" }}>
        Anything else, write to{" "}
        <a href="mailto:dakshg2233@gmail.com" style={{ color: "var(--kesar)" }}>dakshg2233@gmail.com</a>.
      </p>
    </main>
  );
}
