"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLang } from "./lang-provider";
import { HealthCompanionMark } from "./health-companion-mark";

type ChatKind = "nutrition" | "health";
type Msg = { role: "user" | "assistant"; content: string };

const LABEL: Record<ChatKind, Record<"en" | "hi", string>> = {
  nutrition: { en: "Ask Poshan", hi: "पोषण से पूछें" },
  health: { en: "Health Companion", hi: "स्वास्थ्य साथी" },
};

/**
 * Two chatbots, one floating widget: "Ask Poshan" (food/nutrition — dishes,
 * macros, calories) and "Health Companion" (condition-focused guidance,
 * explicitly non-diagnostic — see the system prompts in /api/chat). Both
 * share one message history per persona and one daily free-tier quota,
 * tracked server-side so it can't be reset by reloading the page.
 *
 * Deliberately not named "Doctor chatbot": Poshan's own disclaimer
 * everywhere else says educational, not diagnostic, and a "doctor" label
 * would contradict that on the one feature most likely to be quoted back.
 */
export function ChatWidget({ signedIn }: { signedIn: boolean }) {
  const { T, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ChatKind>("nutrition");
  const [messages, setMessages] = useState<Record<ChatKind, Msg[]>>({ nutrition: [], health: [] });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, kind]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setError(null);
    setBusy(true);

    setMessages((m) => ({ ...m, [kind]: [...m[kind], { role: "user", content: text }, { role: "assistant", content: "" }] }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatbot: kind, message: text }),
      });

      if (res.status === 401) {
        setError(T({ en: "Sign in to chat.", hi: "चैट के लिए साइन इन करें।" }));
        setMessages((m) => ({ ...m, [kind]: m[kind].slice(0, -1) }));
        return;
      }
      if (res.status === 429) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.reason ||
            T({ en: "Free daily limit reached.", hi: "आज की मुफ़्त सीमा पूरी हुई।" })
        );
        setMessages((m) => ({ ...m, [kind]: m[kind].slice(0, -1) }));
        return;
      }
      if (res.status === 503) {
        setError(
          T({
            en: "Chat isn't connected yet: add an Anthropic API key on the server.",
            hi: "चैट अभी जुड़ी नहीं है: सर्वर पर एक एंथ्रोपिक API कुंजी जोड़ें।",
          })
        );
        setMessages((m) => ({ ...m, [kind]: m[kind].slice(0, -1) }));
        return;
      }
      if (!res.ok || !res.body) {
        setError(T({ en: "Something went wrong. Try again.", hi: "कुछ ग़लत हुआ। दोबारा कोशिश करें।" }));
        setMessages((m) => ({ ...m, [kind]: m[kind].slice(0, -1) }));
        return;
      }

      const left = res.headers.get("X-Messages-Remaining");
      if (left) setRemaining(left);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => {
          const list = [...m[kind]];
          const last = list[list.length - 1];
          list[list.length - 1] = { ...last, content: last.content + chunk };
          return { ...m, [kind]: list };
        });
      }
    } catch {
      setError(T({ en: "Could not reach the server.", hi: "सर्वर तक नहीं पहुँच सके।" }));
    } finally {
      setBusy(false);
    }
  }, [input, busy, kind, T]);

  const activeMessages = messages[kind];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={
          kind === "health"
            ? T({ en: "Chat with Health Companion", hi: "स्वास्थ्य साथी से बात करें" })
            : T({ en: "Chat with Poshan", hi: "पोषण से बात करें" })
        }
        className="fixed bottom-20 right-4 md:bottom-4 z-[100] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:-translate-y-0.5 print:hidden"
        style={{ background: "var(--kesar-fill)", color: "#fff" }}
      >
        {open ? (
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : kind === "health" ? (
          /* Health Companion's own mark, pulsing — the one spot on the page
             this widget is supposed to be genuinely hard to miss. */
          <HealthCompanionMark size={34} pulse />
        ) : (
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>

      {open && (
        <div
          className="card-in fixed bottom-36 right-4 md:bottom-20 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl shadow-2xl print:hidden"
          style={{ background: "var(--panel)", color: "var(--panel-ink)", border: "1px solid var(--line)", maxHeight: "70vh" }}
        >
          <div className="flex gap-1 p-2" style={{ borderBottom: "1px solid var(--line)" }}>
            {(["nutrition", "health"] as ChatKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[0.82rem] font-semibold transition-colors"
                style={
                  kind === k
                    ? { background: "var(--kesar-fill)", color: "#fff" }
                    : { color: "color-mix(in srgb, var(--panel-ink) 70%, var(--panel))" }
                }
              >
                {k === "health" && <HealthCompanionMark size={16} />}
                {LABEL[k][lang]}
              </button>
            ))}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3" style={{ minHeight: "16rem" }}>
            {activeMessages.length === 0 && (
              <p className="text-[0.85rem]" style={{ color: "color-mix(in srgb, var(--panel-ink) 65%, var(--panel))" }}>
                {kind === "nutrition"
                  ? T({
                      en: "Ask about a dish, its macros, or what to eat for a goal. Answers cite where they came from.",
                      hi: "किसी भोजन, उसके मैक्रो, या किसी लक्ष्य के लिए क्या खाएँ — पूछें। जवाब अपना स्रोत बताते हैं।",
                    })
                  : T({
                      en: "Ask about a condition or how to eat with it. Educational only — not a diagnosis.",
                      hi: "किसी स्थिति या उसके साथ कैसे खाएँ — पूछें। केवल शैक्षिक — निदान नहीं।",
                    })}
              </p>
            )}
            <div className="grid gap-3">
              {activeMessages.map((m, i) => (
                <div
                  key={i}
                  className="max-w-[85%] rounded-xl px-3 py-2 text-[0.87rem] leading-relaxed whitespace-pre-wrap"
                  style={
                    m.role === "user"
                      ? { alignSelf: "end", marginLeft: "auto", background: "var(--kesar-fill)", color: "#fff" }
                      : { background: "var(--roti-2)", color: "var(--panel-ink)" }
                  }
                >
                  {m.content || (busy && i === activeMessages.length - 1 ? "…" : "")}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="px-3 pb-1 text-[0.78rem]" style={{ color: "var(--mirch)" }}>
              {error}
            </p>
          )}
          {remaining && remaining !== "unlimited" && (
            <p className="px-3 pb-1 text-[0.72rem]" style={{ color: "color-mix(in srgb, var(--panel-ink) 55%, var(--panel))" }}>
              {T({ en: `${remaining} free messages left today`, hi: `आज ${remaining} मुफ़्त संदेश बचे` })}
            </p>
          )}

          {!signedIn ? (
            <div className="p-3" style={{ borderTop: "1px solid var(--line)" }}>
              <Link
                href="/login"
                className="flex min-h-11 items-center justify-center rounded-full px-4 text-[0.85rem] font-semibold no-underline"
                style={{ background: "var(--kesar-fill)", color: "#fff" }}
              >
                {T({ en: "Sign in to chat", hi: "चैट के लिए साइन इन करें" })}
              </Link>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex gap-2 p-3"
              style={{ borderTop: "1px solid var(--line)" }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={T({ en: "Type a message…", hi: "संदेश लिखें…" })}
                disabled={busy}
                className="min-h-11 flex-1 rounded-full px-4 text-[0.87rem]"
                style={{ background: "var(--roti-2)", border: "1px solid var(--line)", color: "var(--panel-ink)" }}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full disabled:opacity-50"
                style={{ background: "var(--kesar-fill)", color: "#fff" }}
                aria-label={T({ en: "Send", hi: "भेजें" })}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
                </svg>
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
