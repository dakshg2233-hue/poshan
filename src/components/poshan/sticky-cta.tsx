"use client";

import { useEffect, useState } from "react";
import { useLang } from "./lang-provider";

/**
 * Sticky CTA, phone only.
 *
 * Appears once the hero is behind you — showing it over the hero would sit on
 * top of the CTA already there. Hidden on desktop, where the header CTA is
 * always in view, and hidden while the cookie banner is deciding so the two
 * never stack at the bottom of a small screen.
 */
export function StickyCta() {
  const { T } = useLang();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero");
    const update = () => {
      const past = hero ? hero.getBoundingClientRect().bottom < 0 : scrollY > 600;
      /* Hide again at the very bottom so it never covers the footer links. */
      const atEnd = innerHeight + scrollY > document.body.scrollHeight - 160;
      setShow(past && !atEnd);
    };
    const t = setTimeout(update, 0);
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update, { passive: true });
    return () => {
      clearTimeout(t);
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[110] p-3 md:hidden print:hidden"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <a href="#check"
        className="flex min-h-12 items-center justify-center gap-2 rounded-full text-[0.9rem] font-semibold no-underline shadow-lg"
        style={{ background: "var(--kesar-fill)", color: "#fff" }}>
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-white/80" />
        {T({ en: "Check your BMI — free", hi: "बीएमआई जाँचें — मुफ़्त" })}
      </a>
    </div>
  );
}
