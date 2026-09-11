"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "./lang-provider";
import { BANDS, bandFor } from "@/lib/poshan-data";
import { track } from "@/lib/analytics";

/**
 * The standalone BMI tool — Poshan's single best organic asset, given its
 * own URL and no sign-up wall.
 *
 * The calculation already existed inside the hero, where it works as a
 * demo of the product but cannot be linked to, shared, or found in search.
 * The insight it delivers — that by Asian-Indian cutoffs the threshold is
 * 23.0, not the European 25.0, so a large number of people who have been
 * told they are a healthy weight for years are not — is genuinely
 * surprising, personally relevant, and true. That combination is what
 * gets shared, and it is wasted inside a marketing page's hero.
 *
 * No login, no email gate. The point is reach: a tool that asks for an
 * address before answering is a lead form, and people share answers, not
 * lead forms.
 */
export function BmiTool() {
  const { T } = useLang();
  const [heightCm, setHeightCm] = useState(170);
  const [weightKg, setWeightKg] = useState(70);
  const [copied, setCopied] = useState(false);

  const bmi = useMemo(() => {
    const m = heightCm / 100;
    return m > 0 ? weightKg / (m * m) : 0;
  }, [heightCm, weightKg]);

  const band = useMemo(() => bandFor(bmi), [bmi]);

  /* The whole point of the tool: what the same number would have been
     called under the European cutoffs most apps still use. */
  const westernBand = useMemo(() => {
    if (bmi < 18.5) return { en: "Underweight", hi: "कम वज़न" };
    if (bmi < 25) return { en: "Normal", hi: "सामान्य" };
    if (bmi < 30) return { en: "Overweight", hi: "अधिक वज़न" };
    return { en: "Obese", hi: "मोटापा" };
  }, [bmi]);

  const differs = T(westernBand) !== T(band.name);

  /* Debounced, and keyed on the band rather than the number. Sliders fire
     continuously: an event per pixel of drag would be thousands of rows
     saying nothing, and the question this event answers is "what did
     people find out", which is the band, not the decimal. 800ms is long
     enough that dragging through three bands records only where they
     stopped. */
  useEffect(() => {
    const t = setTimeout(() => {
      track("bmi_calculated", { band: band.key, differs_from_western: differs });
    }, 800);
    return () => clearTimeout(t);
  }, [band.key, differs]);

  return (
    <section className="w-full grid gap-6">
      <header>
        <h1
          className="text-[clamp(1.7rem,5vw,2.6rem)] leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {T({
            en: "Your BMI, on Indian cutoffs",
            hi: "आपका BMI, भारतीय मानकों पर",
          })}
        </h1>
        <p className="mt-2 text-[1rem] max-w-[54ch]" style={{ color: "var(--ink-soft)" }}>
          {T({
            en: "Most apps read your BMI against a European body, where overweight starts at 25. For Asian-Indian bodies it starts at 23 — the same number means something different.",
            hi: "ज़्यादातर ऐप आपका BMI यूरोपीय शरीर के हिसाब से पढ़ते हैं, जहाँ अधिक वज़न 25 से शुरू होता है। एशियाई-भारतीय शरीर के लिए यह 23 से शुरू होता है — वही संख्या, अलग मतलब।",
          })}
        </p>
      </header>

      <div className="rounded-2xl p-5 grid gap-5" style={{ background: "var(--roti-2)" }}>
        <Slider
          label={T({ en: "Height", hi: "कद" })}
          value={heightCm}
          min={130}
          max={210}
          suffix="cm"
          onChange={setHeightCm}
        />
        <Slider
          label={T({ en: "Weight", hi: "वज़न" })}
          value={weightKg}
          min={35}
          max={150}
          suffix="kg"
          onChange={setWeightKg}
        />
      </div>

      {/* ------------------------------------------------------ the result */}
      <div
        className="rounded-2xl p-6 text-center"
        style={{ background: "var(--roti-2)", borderTop: `4px solid ${band.color}` }}
      >
        <div
          className="text-[3.4rem] leading-none tabular-nums"
          style={{ fontFamily: "var(--font-data)" }}
        >
          {bmi.toFixed(1)}
        </div>
        <div className="text-[1.15rem] mt-1.5" style={{ color: band.ink }}>
          {T(band.name)}
        </div>

        {differs && (
          /* The line the whole page exists for. Only shown when the two
             standards actually disagree — claiming a discrepancy that
             isn't there would be the cheap version of this. */
          <p
            className="mt-4 text-[0.95rem] leading-relaxed max-w-[40ch] mx-auto"
            style={{ color: "var(--ink)" }}
          >
            {T({
              en: `By Western standards you'd be called ${T(westernBand).toLowerCase()}. On Asian-Indian cutoffs, you're ${T(band.name).toLowerCase()}.`,
              hi: `पश्चिमी मानकों पर आपको ${T(westernBand)} कहा जाता। एशियाई-भारतीय मानकों पर आप ${T(band.name)} हैं।`,
            })}
          </p>
        )}

        <p className="mt-4 text-[0.9rem] max-w-[46ch] mx-auto" style={{ color: "var(--ink-soft)" }}>
          {T(band.note)}
        </p>

        <button
          type="button"
          onClick={async () => {
            const text = T({
              en: `My BMI is ${bmi.toFixed(1)} — ${T(band.name)} on Asian-Indian cutoffs, where overweight starts at 23 instead of 25. Check yours:`,
              hi: `मेरा BMI ${bmi.toFixed(1)} है — एशियाई-भारतीय मानकों पर ${T(band.name)}, जहाँ अधिक वज़न 25 नहीं, 23 से शुरू होता है। अपना देखें:`,
            });
            const url = typeof window !== "undefined" ? window.location.href : "";
            track("bmi_shared", { band: band.key });
            /* Web Share is what makes this work on the phones this is
               aimed at — it opens WhatsApp directly, which is where an
               Indian user actually shares things. Clipboard is the
               desktop fallback. */
            if (navigator.share) {
              try {
                await navigator.share({ text, url });
                return;
              } catch {
                /* user dismissed the sheet — fall through to copy */
              }
            }
            try {
              await navigator.clipboard.writeText(`${text} ${url}`);
              setCopied(true);
              setTimeout(() => setCopied(false), 2200);
            } catch {
              /* clipboard blocked; nothing useful to do */
            }
          }}
          className="mt-5 rounded-full px-5 py-2.5 text-[0.9rem] font-semibold"
          style={{ background: "var(--kesar)", color: "var(--roti)" }}
        >
          {copied
            ? T({ en: "Copied ✓", hi: "कॉपी हो गया ✓" })
            : T({ en: "Share this", hi: "साझा करें" })}
        </button>
      </div>

      {/* ------------------------------------------------------- the scale */}
      <div>
        <h2 className="text-[1.05rem] mb-3" style={{ fontFamily: "var(--font-display)" }}>
          {T({ en: "The Indian scale", hi: "भारतीय पैमाना" })}
        </h2>
        <ul className="list-none p-0 m-0 grid gap-1.5">
          {BANDS.map((b) => (
            <li
              key={b.key}
              className="flex items-baseline justify-between gap-3 rounded-xl px-4 py-2.5 text-[0.9rem]"
              style={{
                background: b.key === band.key ? "var(--roti-2)" : "transparent",
                border: `1px solid ${b.key === band.key ? b.color : "var(--line, rgba(0,0,0,0.08))"}`,
              }}
            >
              <span style={{ color: b.key === band.key ? b.ink : "inherit" }}>{T(b.name)}</span>
              <span
                className="tabular-nums text-[0.84rem]"
                style={{ color: "var(--ink-soft)", fontFamily: "var(--font-data)" }}
              >
                {b.range}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[0.8rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          {T({
            en: "Cutoffs per the WHO expert consultation on Asian populations (2004), adopted in India's national guidelines. BMI is a screening measure, not a diagnosis — it says nothing about muscle, and a doctor's reading of it beats an app's.",
            hi: "मानक: एशियाई आबादी पर WHO विशेषज्ञ परामर्श (2004), जो भारत के राष्ट्रीय दिशानिर्देशों में अपनाया गया। BMI एक जाँच माप है, निदान नहीं — यह मांसपेशियों के बारे में कुछ नहीं कहता, और डॉक्टर की राय ऐप से बेहतर है।",
          })}
        </p>
      </div>

      <Link
        href="/login"
        onClick={() => track("bmi_cta_clicked", { band: band.key })}
        className="rounded-2xl p-5 text-center"
        style={{ background: "var(--kesar)", color: "var(--roti)" }}
      >
        <div className="text-[1.05rem] font-semibold">
          {T({ en: "Now see what to eat", hi: "अब देखें क्या खाना है" })}
        </div>
        <div className="text-[0.86rem] opacity-90 mt-1">
          {T({
            en: "Meal plans built from food you already cook — free to start",
            hi: "आपके पहले से बनाए खाने से बने प्लान — शुरू करना मुफ़्त",
          })}
        </div>
      </Link>
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[0.86rem]" style={{ color: "var(--ink-soft)" }}>
          {label}
        </span>
        <span
          className="text-[1.05rem] tabular-nums"
          style={{ fontFamily: "var(--font-data)" }}
        >
          {value} {suffix}
        </span>
      </div>
      {/* .poshan-range is the palette-aware track and thumb the hero's own
          calculator already uses — a native range input keeps the keyboard
          and touch behaviour, with only the visuals replaced. */}
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="poshan-range w-full h-[34px] block cursor-pointer bg-transparent"
      />
    </label>
  );
}
