import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Thank you, Poshan",
  description: "Your Poshan subscription is active.",
  robots: { index: false, follow: true },
};

export default function ThankYou() {
  return (
    <main className="grid min-h-[100svh] place-items-center px-6" style={{ background: "var(--roti)" }}>
      <div className="w-[min(56ch,100%)] text-center">
        <span aria-hidden="true" className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-full"
          style={{ background: "var(--kesar-fill)", color: "#fff", fontSize: 26 }}>✓</span>
        <h1 className="text-[2.2rem]" style={{ fontFamily: "var(--font-display)", color: "var(--ink)" }}>
          You&apos;re in.
        </h1>
        <p className="mt-3 text-[1rem]" style={{ color: "var(--ink-soft)" }}>
          Your subscription is active and your plate is saved to your account. A receipt
          is on its way to your email.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard" className="inline-flex min-h-11 items-center rounded-full px-6 font-semibold no-underline"
            style={{ background: "var(--kesar-fill)", color: "#fff" }}>
            Go to your dashboard
          </Link>
          <Link href="/" className="inline-flex min-h-11 items-center rounded-full px-6 font-semibold no-underline"
            style={{ border: "1.5px solid var(--line)", color: "var(--ink)" }}>
            Back to Poshan
          </Link>
        </div>
      </div>
    </main>
  );
}
