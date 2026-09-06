"use client";

import { useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { MEAL_LIBRARY, type MealTime } from "@/lib/poshan-data";

/* The Web Speech API's SpeechRecognition isn't in TypeScript's DOM lib
   yet, and is vendor-prefixed in Chromium. Minimal shape actually used. */
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: { results: { transcript: string }[][] } & { results: SpeechRecognitionResultList }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * "Log by voice" — speak what you ate instead of typing or tapping
 * through a dish list. Speech-to-text runs entirely in the browser (Web
 * Speech API); only the resulting transcript is sent to /api/voice-log,
 * which matches it against real MEAL_LIBRARY dishes the same constrained
 * way /api/scan matches a photo. Hindi-first: defaults to hi-IN, since
 * that's the underserved case typing/tapping serves worst.
 */
export function VoiceLogger({
  mealTime,
  onMatched,
}: {
  mealTime: MealTime;
  onMatched: (dishId: string) => void;
}) {
  const [lang, setLang] = useState<"hi-IN" | "en-IN">("hi-IN");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [matches, setMatches] = useState<string[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const Recognition = getSpeechRecognition();
  if (!Recognition) return null; // no silent-fail UI: this device just doesn't offer it

  async function matchTranscript(text: string) {
    setStatus("Matching…");
    setMatches(null);
    try {
      const res = await fetch("/api/voice-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, meal_time: mealTime }),
      });
      const data = await res.json();
      if (!res.ok || data.configured === false) {
        setStatus(data.reason ?? data.error ?? "Couldn't match that. Try again or log by hand.");
        return;
      }
      if (data.retryable) {
        setStatus(data.reason);
        return;
      }
      if (Array.isArray(data.ids) && data.ids.length > 0) {
        setMatches(data.ids);
        setStatus(null);
      } else {
        setStatus("Couldn't match that to a dish in the library. Try again or log by hand.");
      }
    } catch {
      setStatus("Couldn't reach the server.");
    }
  }

  function start() {
    if (!Recognition) return; // narrowed at the top-level guard, but not across this closure
    setTranscript("");
    setMatches(null);
    setStatus(null);
    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const said = Array.from(event.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ");
      setTranscript(said);
      matchTranscript(said);
    };
    recognition.onerror = () => {
      setStatus("Couldn't hear that clearly. Try again.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function stop() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  return (
    <div className="mt-2 rounded-lg border p-3" style={{ borderColor: "var(--line)" }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {(["hi-IN", "en-IN"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{
                background: lang === l ? "var(--kesar-fill)" : "transparent",
                color: lang === l ? "#fff" : "var(--ink-soft)",
                border: "1px solid var(--line)",
              }}
            >
              {l === "hi-IN" ? "हिंदी" : "English"}
            </button>
          ))}
        </div>
        <button
          onClick={listening ? stop : start}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white"
          style={{ background: listening ? "var(--mirch, #b91c1c)" : "var(--kesar-fill)" }}
        >
          {listening ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          {listening ? "Stop" : "Speak what you ate"}
        </button>
      </div>

      {transcript && <p className="mt-2 text-xs italic text-[var(--ink-soft)]">&ldquo;{transcript}&rdquo;</p>}
      {status && <p className="mt-2 text-xs text-[var(--ink-soft)]">{status}</p>}

      {matches && matches.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {matches.slice(0, 3).map((id) => {
            const meal = MEAL_LIBRARY.find((m) => m.id === id);
            if (!meal) return null;
            return (
              <button
                key={id}
                onClick={() => onMatched(id)}
                className="rounded-full px-3 py-1.5 text-xs font-medium"
                style={{ background: "var(--roti-2, var(--roti))", color: "var(--ink)" }}
              >
                {meal.name.en} — log this
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
