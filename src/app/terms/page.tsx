import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms, Poshan",
  description: "The terms you agree to when using Poshan, including subscriptions and cancellation.",
};

/**
 * Terms of use. Same principle as the privacy page: written from what the app
 * actually does, with [TO CONFIRM] wherever a legal fact is required that I
 * cannot invent: entity, jurisdiction, refund window.
 */
export default function Terms() {
  return (
    <main className="mx-auto w-[min(72ch,100%-2.5rem)] py-16" style={{ color: "var(--ink)" }}>
      <Link href="/" className="text-[0.85rem] no-underline" style={{ color: "var(--kesar)" }}>
        ← Poshan
      </Link>
      <h1 className="mt-6 text-[2.4rem]" style={{ fontFamily: "var(--font-display)" }}>Terms</h1>
      <p className="mt-2 text-[0.85rem]" style={{ color: "var(--ink-soft)" }}>
        Last updated: 17 August 2026
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
          Paid plans renew until cancelled, and you can cancel at any time.
          [TO CONFIRM: billing cycle, refund window and cancellation mechanics.]
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Accuracy</h2>
        <p>
          Calorie and nutrient figures are estimates. Meal photo scanning is an
          estimate too, and will sometimes be wrong.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Governing law</h2>
        <p>
          These terms are governed by the laws of India.
          {" "}
          [TO CONFIRM: the operating entity&apos;s registered name and address —
          removed a placeholder that was standing in as fact rather than a stub.]
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Contact</h2>
        <p>
          <a href="mailto:dakshg2233@gmail.com" style={{ color: "var(--kesar)" }}>dakshg2233@gmail.com</a>
          {" · "}
          <a href="tel:+918595607565" style={{ color: "var(--kesar)" }}>+91 85956 07565</a>
          {" · "}
          <a href="tel:+919773974039" style={{ color: "var(--kesar)" }}>+91 97739 74039</a>
          <br />
          Full contact details: <Link href="/contact" style={{ color: "var(--kesar)" }}>/contact</Link>.
        </p>
      </section>
    </main>
  );
}
