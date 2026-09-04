"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "./lang-provider";
import { Thali } from "./thali";
import { TabLink } from "./tabs";
import { usePrefersReducedMotion } from "@/lib/use-media-query";
import type { Band, Plan } from "@/lib/poshan-data";
import {
  estimateMaintenanceKcal,
  ACTIVITY_LEVELS,
  type Sex,
  type ActivityLevel,
} from "@/lib/energy-requirement";

const feetInches = (cm: number) => {
  const total = Math.round(cm / 2.54);
  return `${Math.floor(total / 12)}′${total % 12}″`;
};

/** Count-up that lands exactly on the target and respects reduced motion. */
function useCounter(target: number) {
  const calm = usePrefersReducedMotion();
  const [shown, setShown] = useState(target);
  const raf = useRef<number | undefined>(undefined);
  const from = useRef(target);

  useEffect(() => {
    /* No setState in the effect body: reduced motion returns the target
       directly below, so there is nothing to animate or synchronise. */
    if (calm) return;
    const start = performance.now();
    const origin = from.current;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 420);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = origin + (target - origin) * eased;
      setShown(v);
      from.current = v;
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, calm]);

  return calm ? target : shown;
}

/**
 * The staged hero entrance is a first-impression flourish, and it is spent
 * once. Module scope rather than state: it has to survive the unmount that
 * happens every time the visitor leaves the home tab, so that coming back
 * gets the calm panel fade instead of replaying the curtain-up. A reload is
 * a new visit and earns it again.
 */
let heroEntrancePlayed = false;

export function Hero({
  height,
  weight,
  setHeight,
  setWeight,
  age,
  setAge,
  sex,
  setSex,
  activityLevel,
  setActivityLevel,
  bmi,
  band,
  plan,
}: {
  height: number;
  weight: number;
  setHeight: (n: number) => void;
  setWeight: (n: number) => void;
  age?: number;
  setAge: (n: number) => void;
  sex?: Sex;
  setSex: (s: Sex) => void;
  activityLevel?: ActivityLevel;
  setActivityLevel: (a: ActivityLevel) => void;
  bmi: number;
  band: Band;
  plan: Plan;
}) {
  const { T } = useLang();
  const shown = useCounter(bmi);
  const calm = usePrefersReducedMotion();

  const maintenanceKcal =
    age !== undefined && sex && activityLevel
      ? estimateMaintenanceKcal(weight, age, sex, activityLevel)
      : null;

  /* Read once at mount, then burn it, so the first render of this session
     stages in and every later one does not. */
  const [stage] = useState(() => !heroEntrancePlayed && !calm);
  useEffect(() => {
    heroEntrancePlayed = true;
  }, []);
  /* Marks an element as step `d` in the entrance queue, merging into whatever
     className and style it already carries rather than replacing them. Once
     the entrance is spent it hands the originals straight back, so no stray
     class or custom property is left behind on the markup. */
  const s = (d: number, className = "", style: React.CSSProperties = {}) =>
    stage
      ? {
          className: `${className} hero-step`.trim(),
          style: { ...style, "--d": d } as React.CSSProperties,
        }
      : { className, style };

  return (
    <section id="check" className="py-10 md:py-16">
      <div className="w-[min(1180px,100%-2.5rem)] mx-auto grid gap-10 lg:grid-cols-[1fr_1.02fr] items-center">
        <div>
          <p
            {...s(0, "text-[0.74rem] font-extrabold uppercase mb-4", {
              letterSpacing: "0.17em",
              color: "var(--kesar)",
            })}
          >
            {T({
              en: "Indian bodies · Indian food · Indian science",
              hi: "भारतीय शरीर · भारतीय खाना · भारतीय विज्ञान",
            })}
          </p>

          <h1
            className="text-[clamp(2.4rem,6.4vw,4.05rem)] leading-[1.08]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {/* The two lines land separately. A headline that arrives in one
                block reads as a card; one that arrives line by line reads as
                someone saying it. */}
            <span {...s(1, "block")}>
              {T({ en: "Know your body.", hi: "अपना शरीर जानें।" })}
            </span>
            <span {...s(2, "block", { color: "var(--kesar)" })}>
              {T({ en: "Eat like home.", hi: "घर जैसा खाएँ।" })}
            </span>
          </h1>

          <div {...s(3, "shiro w-[104px] my-6")} />

          <p {...s(4, "max-w-[44ch] text-[1.055rem]", { color: "var(--ink-soft)" })}>
            {T({
              en: "Most fitness apps measure you against a European body and feed you chicken breast. Poshan reads your Body Mass Index on Asian-Indian cutoffs: where 23 already counts as overweight: then builds the plate you actually eat.",
              hi: "ज़्यादातर फ़िटनेस ऐप आपको यूरोपीय शरीर के पैमाने पर नापते हैं और चिकन ब्रेस्ट खिलाते हैं। पोषण आपका बॉडी मास इंडेक्स एशियाई-भारतीय कटऑफ़ पर पढ़ता है: जहाँ 23 पहले से ही अधिक वज़न है: और फिर वही थाली बनाता है जो आप सच में खाते हैं।",
            })}
          </p>

          <div {...s(5, "flex flex-wrap gap-3 mt-7")}>
            {/* data-magnetic: the cursor engulfs these rather than sitting on
                top of them. The hover translate is dropped on the primary:
                the cursor already supplies the feedback, and both at once
                reads as jitter. */}
            <TabLink
              to="plate"
              data-magnetic
              data-magnetic-color="var(--kesar-fill)"
              className="inline-flex items-center min-h-12 px-6 rounded-full font-extrabold text-[0.94rem] no-underline"
              style={{ background: "var(--kesar-fill)", color: "#fff" }}
            >
              {T({ en: "See my thali", hi: "मेरी थाली देखें" })}
            </TabLink>
            <TabLink
              to="premium"
              data-magnetic
              className="inline-flex items-center min-h-12 px-6 rounded-full font-extrabold text-[0.94rem] no-underline"
              style={{ border: "1.5px solid var(--ink)", color: "var(--ink)" }}
            >
              {T({ en: "Poshan Home, ₹299", hi: "पोषण घर, ₹299" })}
            </TabLink>
          </div>
        </div>

        <div>
          <Thali bmi={bmi} band={band} plan={plan} />

          <div
            className="mt-6 max-w-[520px] mx-auto grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 items-baseline"
            aria-live="polite"
          >
            <span
              className="text-[0.7rem] font-extrabold uppercase col-start-1"
              style={{ letterSpacing: "0.15em", color: "var(--ink-soft)" }}
            >
              {T({ en: "Your Body Mass Index", hi: "आपका बॉडी मास इंडेक्स" })}
            </span>
            <span />
            <span
              className="text-[clamp(2.6rem,8vw,3.5rem)] leading-none tabular-nums tracking-tight"
              style={{ fontFamily: "var(--font-data)", fontWeight: 500 }}
            >
              {shown.toFixed(1)}
            </span>
            <span
              className="text-[1.35rem] leading-tight"
              style={{ fontFamily: "var(--font-display)", color: band.ink }}
            >
              {T(band.name)}
            </span>
            <p
              className="col-span-2 text-[0.85rem] mt-2 max-w-[46ch]"
              style={{ color: "var(--ink-soft)" }}
            >
              {T(band.note)}
            </p>
          </div>

          <div
            className="surface-card mt-7 p-5 rounded-2xl max-w-[520px] mx-auto"
          >
            <Slider
              id="ht"
              label={T({ en: "Height", hi: "कद" })}
              value={`${height} cm · ${feetInches(height)}`}
              min={140}
              max={200}
              current={height}
              onChange={setHeight}
            />
            <div className="mt-5">
              <Slider
                id="wt"
                label={T({ en: "Weight", hi: "वज़न" })}
                value={`${weight} kg`}
                min={35}
                max={150}
                current={weight}
                onChange={setWeight}
              />
            </div>
          </div>

          {/* Personalised maintenance calories: additive to the BMI tool
              above, which works fully without any of this. Age and sex
              default to nothing rather than a guess — a defaulted sex would
              silently change the answer by ~450 kcal/day (ICMR-NIN, 2020),
              which is worse than showing no number until asked. */}
          <div className="surface-card mt-5 p-5 rounded-2xl max-w-[520px] mx-auto">
            <p
              className="text-[0.7rem] font-extrabold uppercase mb-3"
              style={{ letterSpacing: "0.15em", color: "var(--ink-soft)" }}
            >
              {T({ en: "Your maintenance calories", hi: "आपकी मेंटेनेंस कैलोरीज़" })}
            </p>

            <Slider
              id="age"
              label={T({ en: "Age", hi: "उम्र" })}
              value={age !== undefined ? T({ en: `${age} years`, hi: `${age} वर्ष` }) : T({ en: "Not set", hi: "तय नहीं" })}
              min={19}
              max={90}
              current={age ?? 30}
              onChange={setAge}
            />

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <SegmentedPicker
                label={T({ en: "Sex", hi: "लिंग" })}
                value={sex}
                onChange={setSex}
                options={[
                  { key: "male", label: T({ en: "Male", hi: "पुरुष" }) },
                  { key: "female", label: T({ en: "Female", hi: "महिला" }) },
                ]}
              />
              <SegmentedPicker
                label={T({ en: "Activity", hi: "गतिविधि" })}
                value={activityLevel}
                onChange={setActivityLevel}
                options={ACTIVITY_LEVELS.map((a) => ({ key: a.key, label: T(a.label), description: T(a.hint) }))}
              />
            </div>

            {maintenanceKcal !== null ? (
              <p className="mt-5 text-[0.92rem]" style={{ color: "var(--ink)" }}>
                <span className="text-[1.7rem] tabular-nums" style={{ fontFamily: "var(--font-data)", fontWeight: 500 }}>
                  {maintenanceKcal.toLocaleString("en-IN")}
                </span>{" "}
                {T({ en: "kcal/day to hold your current weight.", hi: "कैलोरी/दिन, मौजूदा वज़न बनाए रखने के लिए।" })}{" "}
                <span className="text-[0.78rem]" style={{ color: "var(--ink-soft)" }}>
                  {T({
                    en: "Per ICMR-NIN's 2020 energy requirements for Indians, adjusted to your weight — not a Western formula.",
                    hi: "ICMR-NIN के 2020 भारतीय ऊर्जा मानकों के अनुसार, आपके वज़न पर आधारित — पश्चिमी फ़ॉर्मूला नहीं।",
                  })}
                </span>
              </p>
            ) : (
              <p className="mt-5 text-[0.82rem]" style={{ color: "var(--ink-soft)" }}>
                {age !== undefined && age < 19
                  ? T({
                      en: "This estimate is calibrated for adults (19+) — ICMR-NIN gives children a different, non-scaling figure.",
                      hi: "यह अनुमान वयस्कों (19+) के लिए है — बच्चों के लिए ICMR-NIN अलग मान देता है।",
                    })
                  : T({
                      en: "Set your age, sex and activity level for a real maintenance-calorie number, sourced from ICMR-NIN, not guessed.",
                      hi: "असली मेंटेनेंस कैलोरी जानने के लिए उम्र, लिंग और गतिविधि चुनें — ICMR-NIN से, अंदाज़े से नहीं।",
                    })}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Slider({
  id,
  label,
  value,
  min,
  max,
  current,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  min: number;
  max: number;
  current: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <label
          htmlFor={id}
          className="text-[0.82rem] font-extrabold uppercase tracking-wide"
          style={{ color: "var(--ink-soft)" }}
        >
          {label}
        </label>
        <output htmlFor={id} className="text-[1.02rem] tabular-nums" style={{ fontFamily: "var(--font-data)" }}>
          {value}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={1}
        value={current}
        onChange={(e) => onChange(+e.target.value)}
        className="poshan-range w-full h-[34px] block cursor-pointer bg-transparent"
      />
    </div>
  );
}

/** A small labelled button group. Nothing selected reads as nothing chosen
    yet, not a coerced first option — matches Slider's own convention of
    showing "Not set" rather than picking a value for the visitor. */
function SegmentedPicker<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T | undefined;
  onChange: (v: T) => void;
  options: { key: T; label: string; description?: string }[];
}) {
  const active = options.find((o) => o.key === value);

  return (
    <div>
      <p
        className="text-[0.72rem] font-extrabold uppercase mb-2"
        style={{ letterSpacing: "0.12em", color: "var(--ink-soft)" }}
      >
        {label}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((o) => {
          const on = o.key === value;
          return (
            <button
              key={o.key}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.key)}
              className="px-3.5 py-2 rounded-full text-[0.84rem] font-semibold cursor-pointer transition-colors min-h-10"
              style={
                on
                  ? { background: "var(--kesar-fill)", color: "#fff" }
                  : { border: "1.5px solid var(--line)", color: "var(--ink)" }
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {/* Re-keyed on the active option so panel-in replays on every switch —
          a visitor tapping through options gets each description as a small
          settle-in rather than a jump-cut, which is what makes reading them
          side by side while deciding feel deliberate instead of glitchy. */}
      {active?.description ? (
        <p
          key={active.key}
          className="panel-in mt-2.5 text-[0.78rem] leading-relaxed whitespace-pre-line"
          style={{ color: "var(--ink-soft)" }}
        >
          {active.description}
        </p>
      ) : null}
    </div>
  );
}
