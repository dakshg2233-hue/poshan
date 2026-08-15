"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route error boundary. Without this an unhandled render error shows a blank
 * white page — the worst possible failure state for a health product.
 *
 * The copy explains what happened and offers a way forward, per the rule that
 * errors state the cause and the fix rather than apologising.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    /* Replace with your reporter when you have one. */
    console.error("Poshan route error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] grid place-items-center px-6">
      <div className="max-w-[46ch] text-center">
        <div className="shiro w-[72px] mx-auto mb-6" />
        <h1
          className="text-[clamp(1.7rem,4vw,2.4rem)] leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Something broke on our side
        </h1>
        <p className="mt-3" style={{ color: "var(--ink-soft)" }}>
          Your measurements were not sent anywhere and nothing was saved. Try
          again — if it keeps happening, reload the page.
        </p>
        {error.digest && (
          <p
            className="mt-3 text-[0.76rem]"
            style={{ fontFamily: "var(--font-data)", color: "var(--ink-soft)" }}
          >
            Reference: {error.digest}
          </p>
        )}
        <div className="flex flex-wrap gap-3 justify-center mt-7">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center min-h-12 px-6 rounded-full font-extrabold text-[0.94rem] cursor-pointer"
            style={{ background: "var(--kesar-fill)", color: "#fff" }}
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center min-h-12 px-6 rounded-full font-extrabold text-[0.94rem] no-underline"
            style={{ border: "1.5px solid var(--ink)", color: "var(--ink)" }}
          >
            Start over
          </Link>
        </div>
      </div>
    </div>
  );
}
