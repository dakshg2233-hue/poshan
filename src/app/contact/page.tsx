import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact, Poshan",
  description: "Reach Poshan by email or phone — for support, data requests, or clinic and hospital enquiries.",
};

/**
 * A dedicated contact point, not just a line buried in Privacy/Terms.
 * Real numbers, real inbox — nothing here is a support-ticket system, so say
 * so rather than implying a queue that doesn't exist.
 */
export default function Contact() {
  return (
    <main className="mx-auto w-[min(72ch,100%-2.5rem)] py-16" style={{ color: "var(--ink)" }}>
      <Link href="/" className="text-[0.85rem] no-underline" style={{ color: "var(--kesar)" }}>
        ← Poshan
      </Link>
      <h1 className="mt-6 text-[2.4rem]" style={{ fontFamily: "var(--font-display)" }}>
        Contact
      </h1>
      <p className="mt-2 text-[0.95rem]" style={{ color: "var(--ink-soft)" }}>
        Support, data requests, press, or a Clinic/Hospital enquiry — write or call directly.
        For hospitals and enterprise specifically, the{" "}
        <Link href="/#clinics" style={{ color: "var(--kesar)" }}>Talk to us form</Link> reaches the same inbox.
      </p>

      <section className="mt-10 grid gap-6 text-[0.95rem] leading-relaxed">
        <div>
          <h2 className="text-[1.05rem] font-semibold">Email</h2>
          <a href="mailto:dakshg2233@gmail.com" style={{ color: "var(--kesar)" }}>
            dakshg2233@gmail.com
          </a>
        </div>

        <div>
          <h2 className="text-[1.05rem] font-semibold">Phone</h2>
          <p className="m-0">
            <a href="tel:+918595607565" style={{ color: "var(--kesar)" }}>+91 85956 07565</a>
          </p>
          <p className="m-0">
            <a href="tel:+919773974039" style={{ color: "var(--kesar)" }}>+91 97739 74039</a>
          </p>
        </div>

        <p className="text-[0.85rem]" style={{ color: "var(--ink-soft)" }}>
          These reach the Poshan team directly — there is no ticketing system behind them yet, so
          expect a personal reply, not an autoresponder. Data protection and deletion requests go
          to the same email; see{" "}
          <Link href="/privacy" style={{ color: "var(--kesar)" }}>Privacy</Link> for what that covers.
        </p>
      </section>
    </main>
  );
}
