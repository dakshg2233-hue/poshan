import type { Metadata } from "next";
import Link from "next/link";
import { COLLEGE_PLAN, PREMIUM } from "@/lib/poshan-data";

export const metadata: Metadata = {
  title: "Terms, Poshan",
  description: "The terms you agree to when using Poshan, including subscriptions and cancellation.",
};

/**
 * Terms of use, written from what the app actually does.
 *
 * Two [TO CONFIRM] blocks used to render here — inside <p> tags, visible to
 * anyone who opened the page. They were meant as notes to the author and
 * shipped as body copy instead. A visitor reading the Subscriptions section
 * before paying 299 a month saw a bracketed editorial note where the
 * billing terms belonged.
 *
 * Most of what they covered was never actually unknown. The trial length,
 * the prices and the cancellation mechanics are all facts this codebase
 * already holds, and the pricing page has been publicly promising them the
 * whole time — so the terms now state the same thing, and read the prices
 * from the same constants the pricing page does, which is what stops the
 * two drifting apart later.
 *
 * The operating entity is Poshan Nutrition Pvt Ltd, Delhi, supplied by
 * Daksh on 20 September 2026 and now stated under Governing law. Two
 * things about it are still open, and the second matters more than it
 * looks: the registered office's street address and CIN, and whether this
 * name matches the entity on the Razorpay account. A terms page naming one
 * company while the bank statement shows another is the version of this
 * mistake a customer discovers at a chargeback.
 *
 * The jurisdiction clause deliberately still reads "the courts of India"
 * rather than being narrowed to Delhi on the strength of where the company
 * sits. Where a company is registered and which courts it wants exclusive
 * jurisdiction in are separate decisions, and only one of them was made.
 */
export default function Terms() {
  return (
    <main className="mx-auto w-[min(72ch,100%-2.5rem)] py-16" style={{ color: "var(--ink)" }}>
      <Link href="/" className="text-[0.85rem] no-underline" style={{ color: "var(--kesar)" }}>
        ← Poshan
      </Link>
      <h1 className="mt-6 text-[2.4rem]" style={{ fontFamily: "var(--font-display)" }}>Terms</h1>
      <p className="mt-2 text-[0.85rem]" style={{ color: "var(--ink-soft)" }}>
        Last updated: 20 September 2026
      </p>

      <section className="mt-10 grid gap-4 text-[0.95rem] leading-relaxed">
        <h2 className="text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>What Poshan is</h2>
        <p>
          A nutrition tool that reads your BMI against Asian-Indian cutoffs and
          suggests meals from Indian home cooking. It is an information service,
          not a medical one.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Not medical advice</h2>
        <p>
          Nothing here diagnoses or treats any condition. If you are pregnant,
          managing a diagnosed illness, or on prescribed medication, talk to your
          doctor before changing what you eat.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Your account</h2>
        <p>
          You are responsible for the email address you sign in with. Tell us if
          you think someone else has access to your account.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Subscriptions</h2>
        <p>
          Poshan Home is ₹{PREMIUM.monthly} a month or ₹{PREMIUM.yearly} a year.
          Poshan Plus, for college students and hostellers, is ₹{COLLEGE_PLAN.yearly} a
          year. Every plan starts with {PREMIUM.trialDays} days free: nothing is
          charged when you subscribe, and the first payment is taken on day{" "}
          {PREMIUM.trialDays} unless you have cancelled before then.
        </p>
        <p className="mt-3">
          Plans renew automatically at the end of each period until you cancel.
          Cancelling takes one tap in Settings — no phone call, no email, no
          retention offer. Cancel during the trial and you are never charged at
          all. Cancel after that and Poshan Home runs to the end of the period
          you have already paid for, rather than stopping that day. Your plans,
          photos and biomarker history stay readable on the free tier either
          way.
        </p>
        <p className="mt-3">
          If you believe you have been charged in error, contact us and we will
          look into it and refund where that is right.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Accuracy</h2>
        <p>
          Calorie and nutrient figures are estimates. Meal photo scanning is an
          estimate too, and will sometimes be wrong.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Governing law</h2>
        <p>
          Poshan is operated by <strong>Poshan Nutrition Pvt Ltd</strong>,
          Delhi, India. These terms are governed by the laws of India, and the
          courts of India have jurisdiction over any dispute arising from them.
          {/* [TO CONFIRM: the registered office's street address and the CIN,
              and — separately — that this name matches the entity on the
              Razorpay account that actually collects the money. A terms page
              naming one company while a different one appears on the bank
              statement is the version of this mistake that reaches a
              chargeback. */}
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Contact</h2>
        <p>
          <a href="mailto:dakshg2233@gmail.com" style={{ color: "var(--kesar)" }}>dakshg2233@gmail.com</a>
          {" · "}
          <a href="tel:+918595607565" style={{ color: "var(--kesar)" }}>+91 85956 07565</a>
          <br />
          Full contact details: <Link href="/contact" style={{ color: "var(--kesar)" }}>/contact</Link>.
        </p>
      </section>
    </main>
  );
}
