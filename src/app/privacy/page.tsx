import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy, Poshan",
  description:
    "What Poshan stores, why, and how to have it deleted. Covers health inputs, account data and payments.",
};

/**
 * Privacy policy.
 *
 * Written from what this codebase ACTUALLY does, the tables in
 * supabase/schema.sql, Supabase email-OTP auth, and Razorpay checkout, rather
 * than from a template. Everything marked [TO CONFIRM] needs a decision or a
 * legal detail only Daksh can supply; I have not invented an entity name,
 * address, jurisdiction or retention period, because a privacy policy that
 * states false facts about a health product is worse than an incomplete one.
 */
export default function Privacy() {
  return (
    <main className="mx-auto w-[min(72ch,100%-2.5rem)] py-16" style={{ color: "var(--ink)" }}>
      <Link href="/" className="text-[0.85rem] no-underline" style={{ color: "var(--kesar)" }}>
        ← Poshan
      </Link>
      <h1 className="mt-6 text-[2.4rem]" style={{ fontFamily: "var(--font-display)" }}>
        Privacy
      </h1>
      <p className="mt-2 text-[0.85rem]" style={{ color: "var(--ink-soft)" }}>
        Last updated: 17 August 2026
      </p>

      <section className="mt-10 grid gap-4 text-[0.95rem] leading-relaxed">
        <h2 className="text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>What we store</h2>
        <p>
          If you use Poshan without an account, your height, weight, goal, diet and
          region stay in your own browser&apos;s local storage. They are never sent to us.
        </p>
        <p>If you create an account, we store against your user id:</p>
        <ul className="ml-5 list-disc grid gap-1">
          <li>Your email address, for signing in.</li>
          <li>Height, weight, goal, diet, region and preferred language.</li>
          <li>Any health conditions you select.</li>
          <li>Any biomarker values you enter.</li>
          <li>Payment records, if you subscribe.</li>
        </ul>
        <p>
          Health conditions and biomarkers are sensitive personal data. They are
          stored so your plan persists across devices, and for nothing else.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Who can see it</h2>
        <p>
          Every table uses row-level security, so a query can only return rows
          belonging to the signed-in account. We do not sell your data, and we do
          not share it with advertisers.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Processors</h2>
        <ul className="ml-5 list-disc grid gap-1">
          <li><strong>Supabase</strong>: database, authentication and storage.</li>
          <li><strong>Razorpay</strong>: payments. Card details go to Razorpay directly; we never see or store them.</li>
          <li><strong>Anthropic</strong>: powers the Ask Poshan and Health Companion chatbots. Messages you send them are processed to generate a reply.</li>
          <li><strong>Resend</strong>: sends the internal notification when you contact us as a clinic (your name, organisation and message go to our team this way). It does not send sign-in codes — those come from Supabase directly.</li>
        </ul>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Meal photos</h2>
        <p>
          Photographs you scan are sent to our vision model to identify what is
          on the plate, then discarded — we do not save the photo itself
          anywhere. Only the dishes it recognised are stored against your
          account, the same as if you had picked them from the list by hand.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Deleting your data</h2>
        <p>
          Write to the address below and we will delete your account and everything
          attached to it.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>If there is a data breach</h2>
        <p>
          If we become aware that your personal data has been accessed, disclosed or
          lost without authorisation, we will notify you at the email address on your
          account without undue delay once the breach is confirmed, describing what
          happened, what was affected, and what we are doing about it. Where the law
          requires it, we will also notify the relevant regulator.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Grievance Officer</h2>
        <p>
          As required under India&apos;s Digital Personal Data Protection Act, 2023,
          complaints or grievances about how your data is handled can be raised with:
        </p>
        <p>
          <strong>Daksh</strong> and <strong>Gaurav</strong>, Grievance Officers
          <br />
          Email: <a href="mailto:dakshg2233@gmail.com" style={{ color: "var(--kesar)" }}>dakshg2233@gmail.com</a>
          <br />
          Phone: <a href="tel:+918595607565" style={{ color: "var(--kesar)" }}>+91 85956 07565</a>
          {" (Daksh) · "}
          <a href="tel:+919773974039" style={{ color: "var(--kesar)" }}>+91 97739 74039</a>
          {" (Gaurav)"}
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Contact</h2>
        <p>
          {/* [TO CONFIRM: legal entity name and registered address —
              placeholder text was here before and read as fact rather than
              a stub. Left off entirely until there is a real one to state,
              since a wrong entity name on a privacy policy is worse than a
              missing one. See /contact for the full list of ways to reach us. */}
          Email: <a href="mailto:dakshg2233@gmail.com" style={{ color: "var(--kesar)" }}>dakshg2233@gmail.com</a>
          <br />
          Phone: <a href="tel:+918595607565" style={{ color: "var(--kesar)" }}>+91 85956 07565</a>
          {" · "}
          <a href="tel:+919773974039" style={{ color: "var(--kesar)" }}>+91 97739 74039</a>
        </p>
        <p className="text-[0.8rem]" style={{ color: "var(--ink-soft)" }}>
          Data protection queries go to the same address. Full contact details: <Link href="/contact" style={{ color: "var(--kesar)" }}>/contact</Link>.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Not medical advice</h2>
        <p>
          Poshan gives general nutrition information based on published
          Asian-Indian BMI cutoffs. It does not diagnose, treat or replace advice
          from a doctor or registered dietitian.
        </p>
      </section>
    </main>
  );
}
