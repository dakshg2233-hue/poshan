"use client";

import { useLang } from "./lang-provider";
import { LangHint } from "./lang-hint";
import { SiteSearch } from "./site-search";
import { CursorPicker } from "./cursor-picker";
import { PaletteControl } from "./palette-control";
import { ChatBottomBarButton } from "./chat-widget";

/**
 * Thin utility bar, fixed to the bottom of the viewport in every view.
 *
 * Layout is deliberately search-centred: display/theme controls (palette,
 * cursor, language) sit to the left of the search field, and the two
 * "talk to something" controls (chat, account) sit to the right — so the
 * one thing most people actually reach for here has a fixed, predictable
 * spot in the middle rather than being just another icon in a long row.
 */
export function BottomBar({ signedIn = false }: { signedIn?: boolean }) {
  const { lang, setLang, T } = useLang();

  return (
    <div
      className="liquid-glass-chrome refract nav-cinematic bottom-bar z-50 border-t"
      style={{ borderColor: "var(--line)" }}
    >
      <div className="w-[min(1180px,100%-2rem)] mx-auto flex items-center gap-2 h-[52px]">
        {/* ---------- left of the search bar ---------- */}
        {process.env.NODE_ENV === "development" && <PaletteControl />}
        <CursorPicker />
        <div className="flex items-center gap-2 shrink-0 relative">
          <div className="hidden sm:block"><LangHint /></div>
          <div
            className="flex rounded-full overflow-hidden"
            style={{ border: "1px solid rgb(255 255 255 / .28)" }}
            role="group"
            aria-label="Language / भाषा"
          >
            {(["en", "hi"] as const).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
                className="px-3 py-1.5 text-[0.82rem] font-extrabold tracking-wider transition-colors cursor-pointer"
                style={
                  lang === l
                    ? { background: "#fff", color: "#111" }
                    : { color: "#fff" }
                }
              >
                {l === "en" ? "EN" : "हिं"}
              </button>
            ))}
          </div>
        </div>

        {/* ---------- the search bar itself ---------- */}
        <SiteSearch />

        {/* ---------- right of the search bar ---------- */}
        <ChatBottomBarButton />
        <a
          href={signedIn ? "/profile" : "/login"}
          aria-label={
            signedIn
              ? T({ en: "Your account", hi: "आपका खाता" })
              : T({ en: "Sign in", hi: "साइन इन करें" })
          }
          className="flex h-9 w-9 items-center justify-center rounded-full shrink-0 no-underline"
          style={{ color: "#fff", border: "1px solid rgb(255 255 255 / .28)" }}
        >
          <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21a8 8 0 0 0-16 0" />
            <circle cx="12" cy="8" r="4.5" />
          </svg>
        </a>
      </div>
    </div>
  );
}
