"use client";

import Link from "next/link";
import { useLang } from "./lang-provider";

/**
 * What a signed-out visitor sees on a screen that needs an account.
 *
 * One component because the three screens over personal health data —
 * /today, /timeline, /privacy-centre — each grew their own answer to the
 * same 401, and the three disagreed: one asked you to sign in, one said
 * "could not load" (an error, for a state that isn't one), and one
 * rendered its full chrome with em-dashes where the numbers go. The third
 * is the worst of them: a page that looks loaded but is empty reads as
 * "Poshan has nothing on me", which is a false statement about someone's
 * health record.
 *
 * `next` is carried through to /login so the user lands back where they
 * were aiming rather than on the dashboard.
 */
export function SignInPrompt({
  title,
  detail,
  next,
}: {
  title: { en: string; hi: string };
  detail: { en: string; hi: string };
  /** Path to return to after sign-in. */
  next?: string;
}) {
  const { T } = useLang();
  const href = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <div className="py-14 text-center grid gap-4 justify-items-center">
      <div aria-hidden className="text-[2rem] leading-none">
        🔒
      </div>
      <h2 className="text-[1.3rem] leading-tight" style={{ fontFamily: "var(--font-display)" }}>
        {T(title)}
      </h2>
      <p className="text-[0.92rem] max-w-[42ch]" style={{ color: "var(--ink-soft)" }}>
        {T(detail)}
      </p>
      <Link
        href={href}
        className="rounded-full px-5 py-2.5 text-[0.9rem] font-semibold mt-1"
        style={{ background: "var(--kesar)", color: "var(--roti)" }}
      >
        {T({ en: "Sign in", hi: "साइन इन करें" })}
      </Link>
    </div>
  );
}
