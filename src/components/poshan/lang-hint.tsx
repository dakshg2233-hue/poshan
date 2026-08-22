"use client";

import { useEffect, useState } from "react";

/**
 * A small circular hint beside the EN / हिं toggle, pointing out that the whole
 * site is bilingual.
 *
 * Written in BOTH languages at once, deliberately: a Hindi reader who has not
 * yet found the toggle is looking at an English page, so an English-only hint
 * is useless to exactly the person who needs it most. Both scripts appear
 * whichever language is active.
 *
 * Dismissible and remembered: a permanent badge next to a control you have
 * already found is just clutter.
 */
const STORAGE_KEY = "poshan-lang-hint-seen";

export function LangHint() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    /* Read once on mount. Default to dismissed so the badge never flashes in
       for someone who has already closed it. */
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setDismissed(false), 1200);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setDismissed(true);
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* Private mode. Losing the preference is harmless. */
    }
  }

  if (dismissed) return null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        /* Bilingual label, because the tooltip below may be closed and this
           is the only thing a screen reader gets. */
        aria-label="Language help · भाषा सहायता"
        className="w-8 h-8 rounded-full flex items-center justify-center text-[0.8rem] font-extrabold cursor-pointer animate-pulse"
        style={{
          background: "var(--kesar-fill)",
          color: "#fff",
          animationDuration: "2.4s",
        }}
      >
        ?
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Language help · भाषा सहायता"
          className="absolute right-0 top-10 z-50 w-[236px] rounded-2xl p-3.5 shadow-2xl text-left"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        >
          <p className="text-[0.82rem] leading-snug m-0" style={{ color: "var(--ink)" }}>
            Tap <strong>EN</strong> or <strong>हिं</strong> to read Poshan in
            English or Hindi.
          </p>
          <p
            className="text-[0.82rem] leading-snug mt-2 mb-0"
            style={{ color: "var(--ink)" }}
          >
            पोषण को अंग्रेज़ी या हिंदी में पढ़ने के लिए <strong>EN</strong> या{" "}
            <strong>हिं</strong> दबाएँ।
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 text-[0.76rem] font-extrabold underline cursor-pointer"
            style={{ color: "var(--kesar)" }}
          >
            Got it · समझ गया
          </button>
        </div>
      )}
    </div>
  );
}
