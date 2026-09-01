"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "./lang-provider";
import { Thali } from "./thali";
import { TabLink } from "./tabs";
import { usePrefersReducedMotion } from "@/lib/use-media-query";
import type { Band, Plan } from "@/lib/poshan-data";

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
  bmi,
  band,
  plan,
}: {
  height: number;
  weight: number;
  setHeight: (n: number) => void;
  setWeight: (n: number) => void;
  bmi: number;
  band: Band;
  plan: Plan;
}) {
  const { T } = useLang();
  const shown = useCounter(bmi);
  const calm = usePrefersReducedMotion();

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
