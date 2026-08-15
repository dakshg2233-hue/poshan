"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Lang, Bi } from "@/lib/poshan-data";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Resolve a bilingual string against the active language. */
  T: (s: Bi) => string;
};

const LangCtx = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");

  /* Keep the document language honest so screen readers and font
     fallbacks pick the right script. */
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const T = useCallback((s: Bi) => s[lang], [lang]);

  return (
    <LangCtx.Provider value={{ lang, setLang, T }}>{children}</LangCtx.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("useLang must be used inside <LangProvider>");
  return ctx;
}

/** Scroll reveal that degrades to "always visible" without IntersectionObserver. */
export function useReveal<T extends HTMLElement>() {
  const [ref, setRef] = useState<T | null>(null);

  useEffect(() => {
    if (!ref) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      ref.classList.add("in");
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          ref.classList.add("in");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );
    io.observe(ref);
    return () => io.disconnect();
  }, [ref]);

  return setRef;
}
